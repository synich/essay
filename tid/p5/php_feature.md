# 01 PHP的一些语言特性

## 程序辨析

php包装好后，会有php和php-cgi两个很容易混淆的程序（php-fpm单开一篇讲），这和php最早就是作为web开发语言有关。其它的脚本语言，主要都是运行在cli下，通过一些库也能运行http程序，但不是程序核心部分。虽然我没有证据，但初版的php语言可以认为只有php-cgi。在这种模式下，输出要服务于html，因此所有的文字都会包裹上适当的html标签。随着php的发展，也有人把它用于终端开发，这时就有了php程序，此时的输出就是纯粹的文本。

## ini默认配置

启动时会读入php.ini配置文件，虽然不读也可以，但鉴于常用选项太多，最好还是配置一下。因为有些扩展，如果不在ini文件中指定是不会加载，虽然可以通过dl手动加载，但毕竟没有ini直接指定来得方便。其它语言虽然也有类似机制，但远没有像PHP这么重视启动加载文件。

## 动态性

PHP的动态特性让人印象深刻。

首先是字符串可以在一定程度表示函数。比如`spl_autoload_register`函数传入的参数是string，实际对应的是同名函数。
另一个例子是构造一个对象$obj，再定义一个字符串变量$foo='bar'，用$obj->{$foo}()的方式就可以调用$obj实例的bar方法。

从字符串推导出函数就是反射，对动态语言来说并不是独一无二的能力，但PHP把字符串直接映射函数这个特性，结合到部分特性的上下文，做成了很好用的语法糖。

所有语言动态能力的源头都是eval，PHP/JS/Lua都有这个函数(Lua对应load)，比如eval('$abc=123;')执行后，$abc就可以使用了。JS的书中对eval的闭包有很详细的解释，eval最重要的参数是环境，不填有可能是当前环境或根环境，不同语言偏好不同。

再说说观察者模式和语言的结合，PHP支持SplObserver和SplSubject。在Ruby中也有类似的observer模块。差异是PHP的notify时是把SplSubject整个对象传给SplObserver对象，而Ruby可以传递任意个数的参数，多少也体现了Ruby语言的灵活。

相对路径是程序中很容易引起混淆的地方，比如`__DIR__`或`__FILE__`变量，单独执行时很容易理解，但从另一个文件载入这个文件时，值并不会变化。原因是这个变量是从属于被执行的文件，并不会随着调用方而变化。

## 自动加载

要使用composer生成的自动加载代码，除了在调用端和源端按规范使用命名空间外，最重要也最容易忽视的，就是要配置好composer.json和生成加载代码。

假设项目目录是这样
```
Project
|__composer.json
|__main.php
|__lib/
    |__A.php
|__vendor/
    |__autoload.php
```

假如代码在lib目录下，务必在项目顶级的composer.json加上
```
    "autoload": {
        "psr-4": {
            "your-namespace\\": "lib/"
        }
    }
```
之所以显得有些啰嗦，是因为还存在psr-0和files方式，所以必须在autoload节点下再嵌套一层。

然后在main.php使用`use your-namespace\A`，而在A.php中定义`namespace your-namespace`。

到这一步还不够，必须要手动执行一次`composer dump-autoload -o/-a`，-a表示一旦找不到就不再查找，而-o还会尝试按psr4方式再找一次。至此加载器才能正常工作。说明加载器并不是全自动的，而必须要手工介入，且最顶级的命名空间，是用配置绑定，并不要求命名体现在文件系统上。

看过vendor/autoload.php的源代码就可以知道，所有加载类的路径，都是事先在代码中保存在一个array变量classMap里，并不是运行时拼接路径加载，所以运行前执行一次dump-autoload就好理解了。

简单解释一下autoload的源码，vendor下的autoload.php只是一个入口，先加载autoload\_real.php，虽然名字带了real，并不是真正的加载函数，还要依赖ClassLoader.php和autoload\_static.php，这两个类各有分工，ClassLoader负责调用spl_autoload_register，而static则提供classMap，这两个类在调用链上经过Closure::bind被绑定到一起。

## stdClass

用`json_decode`函数，却不能直接用["name"]取值，原因是返回的是类型为stdClass的值，既然是对象，就要按对象的语法`->{"str"}`取值。

stdClass有点像Java的Object味道，当然它是类不是对象。也可以new stdClass()创建一个什么都没有的空对象。

对象和array看起来很像，能表达的内容也差不多，目前所知最大的差异就是在赋值时，array会把所有元素的值全拷贝一遍，而new得到的对象，赋值后只是一个引用，拷贝对象是几乎没有开销的。

从语言历史来看，array在PHP4时代就出现了，而完整的对象语义直到PHP5才成形。而引用也是相对高级的特性，因此和对象关联在一起也就好理解了。

## 源码结构与SPL

最主要的3个目录，Zend/ext/sapi。Zend编译虚拟机，ext是标准库和常用扩展库，如PDO/XML等等，sapi则是最外层的接口。三个层次非常清晰。

PHP的`file_get_contents/fopen`可以直接打开url，即直接获取网页内容。这些接口虽然简单，但一来灵活性低，另外只能阻塞没有超时设置标志，因此还有一种层次更基础的fsockopen，是socket的封装，且可以控制超时时间。如果要通过fsockopen来获取HTML页面，要自己封装请求，HTTP1.1需要至少3个字段，除了方法还必须Host和Connection才能取得网页。

做C++开发的人都知道STL，对于PHP来说对应的就是SPL(Standard PHP Library)了。这是从PHP5时代开始发展并成熟起来的技术。所有SPL的函数以`spl_`开头，除了函数还有若干窗口类的接口，比如SplHeap、SplStack等，另外就是迭代器和异常。

URL的禁则：`+`号是要转码的，但是奇怪的是form中如果输入空格，空格会转成`+`。而真正的`+`会用%转码。PHP有个函数叫parse_url，能把url拆成path和query，但是又不做转码。