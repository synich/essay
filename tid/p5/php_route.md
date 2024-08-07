# 05 Url Rewrite和PHP路由的初步认识

使用PHP开发网站，最基本的做法是将Url路径指向某个php页面，然后通过GET或POST方法向这个页面传递参数来实现。如果是GET方式，Url通常是这样(POST因为Url上看不出什么，不在本篇讨论之列)：

* web.site/index.php?key1=value1&key2=value2

这种风格比较基本，但存在一些问题：

1. 如果Url固定后不允许更改(在大型系统内很正常)，则后期重构会受到限制
2. 代码实现时会不自觉地受制于这种模式，很难做到逻辑分离
3. 风格不够Restful，内容没有资源化

因此我看到业界更提倡的方式，是转化成这样：

* web.site/key1/value1/key2/value2

显然这种Url是无法直接定位到PHP脚本的，必须要借助Url Rewrite。Apache和Nginx都支持Url Rewrite，除了可以通过配置文件进行设置，
Apache还可以在每个目录下通过.htaccess文件进行自定义，也更灵活。
别小看了.htaccess自定义，如果你使用的是虚拟主机，根本没有可能去修改Web服务器的主配置，这时想做Url Rewrite，修改.htaccess几乎是惟一的方式。在.htaccess中配置这样一条规则 `RewriteRule !\.(js|ico|gif|jpg|png|css)$ index.php`

意思是把所有不是js、css等结尾的Url请求，统统重新定位到index.php文件。
经过这一步，请求就进到PHP的处理领域了。这个index.php并不是通常意义上包含内容的首页，而是一个动态分发器。
先把Url进行分解，这里你可以自定义分割符，最传统的是'/'，当然也可以用一些古怪的符号，不过我不建议这么做，毕竟会造成理解上的困难。
如果有些虚拟服务商不允许改写web server的配置，也可以手动地使用index.php/key/value/param的Url风格。

## 超小型框架CEPHP的实现

把Url分解成数组后，CEPHP的做法比较死板，取数组的[0]为class名，[1]为method名，后面的就做为参数传递给method了。做了这样的转换，后续就可以对数组如何创建对象做些重定向。

通过Url得到class名，接下来的关键是如何实例化这个class。直接new一定会提示找不到类定义，就必须依赖语言的动态特性。这里岔开提一句，从表达力上来说比较公认的是Lisp > Ruby == Python > PHP。PHP在灵活性上能和Ruby比肩的也只有OO方面，而函数级别的魔性还是远不如Ruby的。

PHP5支持`__autoload`函数，随后的SPL又定义了6个`spl_autoload`开头的函数，其中`spl_autoload_register`且于替代`__autoload`。它能接受一个string表示的函数名，在new的时候使用register的函数去寻找类的定义。除此之外用define给`CLASS_DIR`赋值，再配合`spl_autoload_extensions`也能正常地工作。

说完了类，再说method。PHP的类支持包括`__construct`/`__call`在内的多种魔术方法。比如实现了`__call`方法，如果调用的方法不存在，就会fallback到`__call`的实现，然后根据第一个入参即方法名，可以决定要如何处理这个请求。这个特性在Ruby称为`method_missing()`方法。
想像一下通过这个特性，像getByName、getById、getByAge这三种Url就可以只实现一个getBy方法，然后把Name、Id、Age作为参数传递到getBy方法中，非常简洁。

## YXcms的路由实现

基于CanPHP的二次开发系统，路径使用index.php?r=default/column/index&col=demoshow风格，估计是为解决在虚拟主机上无法直接配置的缘故，方便一些小企业。index.php入口首先reqiure了protected/core.php并执行run函数。按顺序最关键的两个函数urlRoute和autoload。

urlRoute将`$_REQUEST['r']`拆分成app/controller/action三级并用define函数保存，如果没有则分别赋予默认值default/index/index。app似乎是区分Mobile或PC。接着注入的autoload，定义一个array，其中包含9条类名到文件路径的映射。用foreach逐一匹配，一旦匹配就加载这个文件。为什么要设置这么多路径？一方面不会把所有的类放在同一个目录下，另一方面由于是二次开发系统，要保留原有框架的autoload机制，用多路径逐条匹配就成了很好的选择。最后用controller拼接上"Controller"作为类名，通过`class_exists`判断是否存在，存在则构造对象并调用action方法。默认的首页路径映射到indexController.php，它又层层继承向上5次才能找到根类，每次类声明时的extends语句，同样会触发autoload。

默认的controller动作是display，需要用于模板引擎的知识，暂时放一放，从构造函数跟踪进去发现又new了baseModel类，最终使用了CanPHP的cpModel类。