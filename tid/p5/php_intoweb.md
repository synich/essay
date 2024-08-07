# 10 PHP与Web服务器的集成方式

PHP早期作为Web开发语言，监听HTTP请求并不在PHP做（虽然可以用-S选项来监听http请求，但毕竟不专业），产生环境中往往是由Web服务器(如Apache或Nginx)完成，当检测到是一个动态网页的请求，比如Url的后缀是.php，则把请求转给PHP程序，由它来处理后续的工作。在Windows上个人觉得比较好的集成工具是[PhpStudy](http://www.phpstudy.net)，集成了Apache/Nginx/Lighttpd等多种服务器(最新的2016版把Lighttpd去掉了)，而且支持多种PHP版本，就以PhpStudy安装后为例，分别说说两者的集成方式。

## Apache

官方标准的方式有三种，经常用到的有两种(CGI基本用不到，完全被FastCGI替代)。分别是

* 作为Apache内建模块运行，官方文档称为handler方式
* 以FastCGI方式运行

handler方式就是在httpd的worker进程直接执行php程序，这种方式的配置会加载一个php-sapixx.conf文件(PhpStudy的写法，非官方)，xx是PHP的版本号，
比如55、70等。从conf文件可以看到，其通过LoadFile和LoadModule指令加载了php5.dll和php5apache2_4.dll。数字随着使用的版本而变。
LoadModule直接和Apache交互，从dll名字也可以看出，包含了php和apache两个程序，像PHP这么复杂的应用，不可能完全通过module代码完全实现，
module更像是个桥接器，真正的任务还是要通过PHP来完成，因此和LoadModule配套，还要用LoadFile指令载入php5.dll，负责真正的PHP执行代码。
另外PHP5.2版本，还通过LoadFile载入了libmysql.dll。也许是PHP和MySQL没有打通吧。如果module载入成功，通过

`PHPIniDir "D:/phpstudy/php52/"`

这句指令来设置php.ini的路径。(命令行的php方式可以使用-c选项，在宿主环境下就要配置了)。岔开一句，载入lua扩展只要LoadModule就可以，不需要LoadFile来指定lua.dll的位置。
遍观所有配置，除了PHP的SAPI方式，也只有httpd-proxy-html.conf配置，用了LoadFile来加载zlib.dll,iconv.dll,libxml2.dll。

FastCGI方式则不同，需要先加载FastCGI的运作器，注意模块名是fcgid，而不是fastcgi，这是两个不同的项目，差别我引用网上的说法：

> `mod_fastcgi`因为实现方式的限制，所以可能会创建了很多不必要的进程，
  而实际上只需要更少的进程就能处理同样的请求。
  `mod_fastcgi`的另外一个问题是每一个CGI的多个进程都共享同一个管道文件，
  所有到同一个fastcgi的通讯都通过这个同名的管道文件进行，
  这样当出现通讯错误的时候，根本不知道正在通讯的是哪一个fastcgi，
  于是也没有办法将这个有问题的进程杀死。

> `mod_fcgid`尝试使用共享内存来解决这个问题。共享内存里面有当前每个fastcgi进程的信息
  （包括进程号，进程使用的管道文件名等），当 每次尝试请求fastcgi工作的时候，
  Apache将会首先在共享内存里面查询，只有在共享内存里面发现确实没有足够的fastcgi进程了，
  才会创建 新的进程，这样可以保证当前创建的进程数量刚好能够处理客户的请求。
  另外，由于每一个fastcgi进程使用不同名称的管道文件，
  所以可以在通讯失败的时候知道到底哪个fastcgi进程有问题，而能够尽早的将其剔除。

所以现在apache官方推荐使用的模块就是fcgid了。有一个专门的fcgid.conf文件，fcgid的参数很多，
比较典型的，如FcgidMaxProcesses表示最多允许打开多少个进程。由于参数由Apache来读取，创建进程，控制进程的数量也同样是Apache。
所以这种模式下可以看到的httpd进程中，有些并不是执行Web请求，而是执行PHP的宿主。有了宿主，接下来就是找到PHP并执行，和php关联的是这句指令

`FcgidWrapper "D:/phpstudy/php55n/php-cgi.exe" .php`

把请求直接导向了php-cgi程序。php-cgi本身就依赖于php5.dll，
因此FastCGI方式下不需要通过LoadFile来载入php5.dll。指定php.ini仍然不能少，通过

`FcgidInitialEnv PHPRC "D:/phpstudy/php55n"`

这种方式，Apache会常驻进程，减少每次请求的创建进程开销。fcgid的耦合度比Handler方式更小，体现在

1. httpd进程的作用分离，Web请求和PHP执行在两个进程
2. 载入PHP方式，从.dll换成了.exe，从而避免了代码的强耦合。换句话说，Handler方式必须依赖php5apache2_4.dll，而CGI方式调用PHP的程序即可。

Handler和FastCGI的方式，进程的所有者都是Apache，随着PHP自身的演化，5.3.3版本后的PHP官方代码也支持FastCGI模式，就是PHP-FPM(FastCGI-Process-Manager)，
这个包还没有windows的移植版本。从命名就能看出，它是一个进程管理软件。
PHP-FPM是daemon程序，它启动一个进程池，和Web之间通过监听TCP端口或Unix域套接字来进行通信。
并会随着负载大小动态地增加或减少进程数量(可配置)。因此Apache的2.4版本之后，又增加了一种模式`mod_proxy_fcgi`，这种模式下Apache不需要知道PHP的文件或库位置，只管把请求发到指定的端口或域套接字就可以了。

## nginx

与Apache相比，nginx官方实现不支持动态载入模块，所有的功能都需要在编译时指定，也就没有对应Apache的handler方式一说。
nginx也没有和PHP做整合，在nginx里不会看到PHP路径配置，仅支持类似Apache的mod_proxy_fcgi配置方式，由于Windows版本没有PHP-FPM，因此运行PHP并监听端口，通过phpstudy这个管理程序来实现。

从nginx的配置可以看出，在和PHP通信时，有大量的fastcgi_xx的指令。其中的`fastcgi_param`指令，就对应CGI规范中的Request Meta-Variables。
比如`SRIPT_NAME`、`QUERY_STRING`。这些值需要在nginx.conf中设置，nginx会把`fastcgi_param`设置的值传递到PHP。从而在PHP中`_SERVER["SCRIPT_NAME"]`的方式可以取值。

比起CGI的RFC规范，PHP可用的Meta-Variables要多一些。比如RFC只定义了`SCRIPT_NAME`和`QUERY_STRING`，
PHP多定义了`SCRIPT_FILENAME`和`REQUEST_URI`。`REQUEST_URI`是`SCRIPT_NAME`和`QUERY_STRING`的字符串连接。`SCRIPT_NAME`和
`SCRIPT_FILENAME`的差别在于`SCRIPT_FILENAME`是绝对路径，nginx中一定要通过指定`SCRIPT_FILENAME`才能真正调用到PHP脚本，`SCRIPT_NAME`就是相对路径了。

现在RESTFul大行其道，以资源形态表示的URL上，是肯定不会看到script.php的字样的，最直接的做法，就是在nginx配置这样一句：

`fastcgi_param  SCRIPT_FILENAME  $document_root/script.php;`

也就是说虽然在URL上看到的只是个资源，但是到了Web端仍然是对应到具体的PHP文件。在这个script.php中可以再从`REQUEST_URI`分离出资源信息，
从`REQUEST_METHOD`得到操作信息，这样就可以完成资源到操作的转换。因为CGI出现的背景就是执行独立程序，因此规范直接定义`SCRIPT_NAME`就不奇怪了。如果请求报错no input file，说明nginx找不到php文件所在位置，一种解决方法是用root指令设置完整的根路径，保证`$document_root`值是对的。如果不设置root，默认会指向nginx程序所在的html目录，再以这个为根，自然就找不到php文件。

像`REQUEST_URI`这种值，其实都是由Web服务器来设置的，如果不在RFC规范，就完全看Web服务器的实现了，因此会有些框架做些兼容处理。

## 小结与比较

比较两种Web服务器的加载后进程列表，选择apache启动方式，进程管理器只能看到数个httpd进程，而选择nginx的话，除了nginx还能看到数个php-cgi程序。
原因就是apache的FastCGI方式是以自身程序模块在运行，在httpd进程中执行php程序，因此进程管理器看不到php的名字。而nginx更有代理的味道，把请求数据向php-cgi监听的端口送去后，就和nginx无关了，因此php-cgi是以独立进程方式存在。

这方面还遇到过一个奇怪的问题，本地调试网页用httpd正常打开，用nginx却总是超时。nginx下php-cgi默认分配的是9000端口，于是用netstat -ano查了到底哪个进程占用了9000端口，果然这个端口被其它程序给占住了，但是phpstudy并不会报异常，也就表现在nginx超时，如果用openresty方式运行就不会有这个问题，因为openresty也是类似httpd方式，直接在nginx内执行业务逻辑。

