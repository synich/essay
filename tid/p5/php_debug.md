# 02 PHP两种模式下的调试功能

PHP语言相较于其它语言一个很大的不同，从一开始就定位在一种宿主语言。
它是由Web服务器来调用，而不像其它脚本语言，如Perl或Python那样用于命令行。
因此在PHP5以前，默认的主程序都是以cgi的SAPI模式运行，到了PHP5以后，
默认的php.exe才切换为cli的SAPI模式，而php-cgi.exe则代表cgi方式的执行体。
这两种模式支持的语法和特性是一样的，差异点有：

1. 输出是否会带上html标签(CGI带，cli不带)
2. daemon时作用不同

先说监听模式，php-cli能通过-S选项打开build-in的Web Server模式，这时就不需要开Apache了，
初学者使用这种方式上手PHP还是挺不错的，但比起完整的Web服务器，不能做URL Rewrite等功能。
而php-cgi的-b选项是FastCGI Server模式，这种模式不支持HTTP请求，只支持FastCGI请求。
FastCGI的specification比较简单，开始的请求头是8字节描述，包括版本号、类型信息，
接着就是各种CGI定义的元数据，比如`SCRIPT_FILENAME`等字段，php-cgi判定协议头，
并读取这些信息，执行完成后再将应答返回给Web服务器。因此这两种模式的作用差异是很大的。

cli和cgi的调试也很不一样。cli模式使用phpdbg.exe程序，用法和GDB等类似，
在命令行下进行操作，而cgi模式需要用到扩展模块xdebug，且开启xdebug还不够了，
需要和另一个进程以C-S模式交互才行。

cli模式使用phpdbg，最开始是5.4版本以补丁形式出现，到了PHP5.6以上，官方合入了这个补丁，
通过命令行方式启动，载入程序后可以打断点、单步或查看栈帧等。
和普通的命令行调试器很像，就不多做介绍了。

xdebug是个远程调试扩展插件，需要在php.ini中载入对应的dll，
且还要配置`xdebug.remote_enable`为1才能用，
离奇的是，即使仅载入dll也会造成性能开销，因此如果不需要调试时，
务必把载入dll行给注释掉。
前面提到xdebug是C-S形的调试器，xdebug自身嵌在PHP内，是S端，因而必须要配置C端的地址，
指令就是如下两条：
<pre>
xdebug.remote_host = "127.0.0.1"
xdebug.remote_port = 9000
</pre>
通常C和S在同一台机器上，`remote_port`代表的是C端的监听端口。
当xdebug收到`XSESSION_DEBUG_START`这个特殊的字段，
就表示要开始调试，并向上例中的9000端口发起协商，通常xdebug客户端集成在IDE中，
在IDE内进行单步/设断点等操作，遵循xdebug协议向PHP服务发请求，就能达到调试的目的。
