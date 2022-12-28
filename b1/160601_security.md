SSL杂记
========
SSL和OpenSSL的关系，就好比C++和Visual C++的关系。OpenSSL是业界公认的烂代码，但也许是出来比较早，在江湖上已立稳了脚跟，因此尽管有很多人不爽，但毕竟现有项目大量的依赖，就我所知的一些fork项目都是采用头文件兼容，而重新实现的方式，也许若干年后OpenSSL会变成一个接口标准，那也是后话了。

OpenSSL库在Linux下就一个文件，而在Windows下是分为libeay32和ssleay32两个文件，其中libeay是和加密算法相关的，包括AES、RSA、MD5等，而ssleay则是SSL握手、网络收发数据相关，因而需要依赖于libeay。取这么怪的名字是因为最初的作者是Eric A. Young而得名。

用vc6编译openssl，自带perl脚本生成makefile，但还是有很多遗漏，有两点

1. ms目录下有个文件要加no-asm，否则自带的汇编文件在vc6的masm无法编译，类似编nginx也遇到过md5和sha1有使用汇编的选项，大概hash类算法规律，用汇编效率提升明显。
2. 编译要加’__i386__'选项，否则编crypt库会有链接错误，原因不明国内网站没有答案，是在英文站上看来的，不确定是否ssl部分也需要。

实现SSL连接(PHP为例)
----
在我的安卓手机上运行PHP，由于域名解析机制不知什么原因，无法正常工作，只能先在PC上解析出IP，用PHP的socket机制完成连接。如果是HTTP连接使用"tcp://ip"的方式，再手工构造HTTP的GET请求，网页的内容就拿到了，如果是HTTPS则麻烦一点。

首先PHP支持"ssl://ip"或者"tls://ip"，虽然看起来是不同的协议，但至少我安装的PHP环境发起的Client Hello请求都是TLS1.0(请求包头是16 03 01)，但是握手结束PHP会报类似这样的错误

    Peer certificate CN=`example.server' did not match expected CN=`ip'

原因是TLS连接时服务端会发送它的数字证书，证书的CN(CommonName)记载的内容和请求的IP地址不符合。

fsockopen是PHP4时代的接口，设计时并没有考虑传入SSL连接的选项，到了PHP5，提供了整套Stream Classes，包括了socket、context、filter、bucket等完整的网络连接设施。这些中可以用`stream_socket_client`函数，配合最后一个参数`stream_context`。使用`stream_context_create`构造一个不做检验的TLS请求(内网很多证书都是自签名，必须要跳过)，构造语法array('ssl' => array('verify_peer_name'=>FALSE, 'verify_peer'=>FALSE)); 同时关闭验证证书和CN。这里的verify_peer_name是配合peer_name选项，允许用户对站点设置指定名称。

题外话，不同的语言都提供类似的操作，比如Go提供了InsecureSkipVerity:true关闭校验。默认情况会提示x509: certificate signed by unknown authority。

SSL_connect并不关心证书校验，成功返回后可以对SSL结构体进一步分析，有60多种X509_V_ERR_的定义，对DEPTH_ZERO_SELF_SIGN_CERT会网开一面，否则不予承认这个连接。

注意必须是二维的array结构，而且这里只能是ssl，如果传入'tls'无法构造合法的context。一切准备妥当就可以完成SSL握手了，接下来在这个连接上发送HTTP的GET请求，对读和写数据来说就是透明的。

`stream_context`由option和parameter两部分组成，option除了前面提到的ssl，还有socket/http/ftp。parameter目前我只看到一种notification，用于设置回调，在`STREAM_NOTIFY_*`事件发生时触发回调。context不仅能用于stream，也能用于fopen和`file_get_contents`。

再来分析TLS握手流程，从数据上看客户端发送的数据要远小于服务端回复的数据，大约是<1K和5K这个量级。原因是服务器会带回完整的证书和cipher list，而客户端只做验证并选择一个cipher方式，因此数据量才会有这么大的差距，其中光是Server Hello中的Certificate环节的内容就长达2960字节。握手结束服务器会生成session ticket，长度192字节，有效期18小时。