SASL、GSSAPI和Kerberos的理解
====
SASL
--
网络协议和认证虽然是不同的领域，二者往往会结合使用。在SASL出现前，两者的组合是乘积关系，SASL使两者解耦，组合的数量变为和的关系。由于SASL的目的是解耦，所以并不包含网络功能，并不承担数据传输功能，只有得到数据后才开始进行处理。同时它又不负责具体的认证，所以种种认证实现都是是SASL插件的方式存在。

使用最广的SASL实现是Cyrus版本（翻译过来是古波斯的居鲁士大帝），从库分布也能看出，主体框架是libsasl2.so，而各种具体实现libcrammd5.so、libdigestmd5.so放在插件目录下。

支持的验证机制包括但不限于：getpwent、kerberos、pam、rimap、shadow、ldap

GSSAPI
--
作用和SASL接近，适用场景有些不同。对LDAP来说，两者都适合，但对HTTP认证来说，SASL的流程有些啰嗦，使用和GSSAPI一脉的SPNEGO就更合适。由于GSSAPI产生得比较早，因此和Kerberos结合地更密切（甚至可以说是唯一的实现机制），其中GSSAPI定义开发语言的API，而Kerberos负责具体网络通信和加密过程。

Kerberos
--
实现用得最多MIT的版本（Heimdal有，微软有个非兼容版本SSPI，而AD则是KDC和LDAP的结合体），协议在RFC定义。理念和用途与TLS不一样，krb用于多点间协同，全部使用对称加密算法，依赖参与者依赖中心点KDC，而TLS依赖非对称加密和数字证书，解决两点间通信问题。

微软的NTLM据说是对标，用在域控管理密码和认证。但没有c和s间的互动。

由于kerberos的实现有多种，接口不统一，GSSAPI的C语言接口定义有RFC背书，且`libgssapi_krb5.so`，即对kerberos的封装，也是我所见仅有的实现绑定，所以两者可以认为是一样的。而适配到SASL会稍麻烦。

Kerberos的认证过程可细分为三个阶段：初始验证、获取服务票据和服务验证。第一阶段：客户端向KDC中的AS发送用户信息，请求TGT，请求内容会用客户端的密钥做对称加密，由于KDC有客户端的密钥（可以是KDC给客户端，也可以是客户端告诉KDC，总之kerberos的理念就是必须信任并且把密码让KDC知道）。第二阶段：客户端拿着之前获得的TGT向KDC中的TGS请求访问某个服务的票据。第三阶段：拿到票据（Ticket）后再到该服务的提供端验证身份，然后使用建立的加密通道与服务通信。

* KDC：Key分发中心（key distribution center），是一个提供票据（tickets）和临时会话密钥（session keys）的网络服务。KDC服务作为客户端和服务器端信赖的第三方，为其提供初始票据（initial ticket）服务和票据授予票据（ticket-granting ticket）服务，前半部分有时被称为AS，后半部分有时则被称为TGS。
* AS：认证服务器（Authentication Server），KDC的一部分。通常会维护一个包含安全个体及其秘钥的数据库，用于身份认证，保证客户端确实存在于KDC的密码库中。
* TGS：许可证服务器（Ticket Granting Server），KDC的一部分，根据客户端传来的TGT发放访问对应服务的票据

由于KDC机制严重依赖与密钥，所以自带数据库管理工具krb5\_util和kadmin。

目前主流的中心式密钥分发，一个是Kerberos认证，像windows域控制器认证方式；另一个是Cisco GetVPN，KDC被用于分发TEK（Traffic Encryption Key)。

认证流程
----
1. AS认证：

员工Alice首先到认证中心KDC报道，KDC给了Alice两只信封，一只信封A装的是Alice-KDC session key ，以及Alice ID、IP、时间戳相关信息，用KDC的密码加密，Alice不能打开，待会转交给TGS就够了。
另外一只信封B是用Alice的密码经过Hash做了加密，里面装着临时密钥Alice-KDC session key ，Alice用自己的密码，解密得到Alice-KDC session key。如果Alice是假冒的，自然打不开信封B，无法访问网络资源。

2. TGS认证：

当Alice想访问服务器S，要向TGS出示两个证件：
信封A和信封C。其中，信封C里面装有Alice ID、服务器S等信息，用Alice-KDC session key 加密。
KDC用自己的密码解开信封A（因为AS和TGS在一起），获得Alice-KDC session key，用它解开信封C。KDC检验证件合格，于是准备出票。

KDC把票递给Alice，是两个信封：
信封D，里面装有Alice-S session key、Alice-TGS session key，用服务器S的密码加密，Alice不能打开，待会转给服务S。
信封E，里面装有Alice-S session key信息，用Alice-KDC session key加密

3. Service认证：

Alice解开信封E，得到Alice-S session key，并用它生成信封F，里面包含Alice ID和时间戳，来到服务器S 的面前，出示信封D、F。
服务器S用自己的密码解开信封D，得到Alice-S session key，然后再用它去解密打开信封F，获得信封里的Alice ID等认证信息，认证通过后，Alice访问服务器资源就用Alice-S session key了。

协议交互
----
程序分为C和S端，S端又分工具类和守护类。工具类有kadmin.local, `kdb5_util`等负责管理用户。注意kadmin可以让管理员在KDC之外的主机远程操作，不过最好还是在KDC上用kadmin.local。数据库以BerkeleyDB方式保存。守护类有kadmind，krb5kdc，这两个必须都启动才能正常工作。kadmind监听749和464端口，749负责admin，464负责修改密码。krb5kdc监听88端口。

C端调用kinit principal，会找pricipal对应的KDC并获取initial credentials和TGT，服务端返回加密报文后，命令行会提示输入密码，如果正确的话，klist就能看到，退出用kdestroy。

kinit的交互信令通过UDP发给KDC的AS，端口88。含AS-REQ和AS-REP两个报文。REQ包含标明身份的明文client name和realm，以及请求的server name(默认krbtgt)。

输入密码只适用于交互，如果要程序化必须利用keytab方式，就是在KDC侧用kadmin.local的xst指令把某个principal的密钥导出并发给客户机，kinit用-kt选项就免去输入密码这步。默认导出了keytab后，用户密码会变，相当于以后就只能用keytab登陆了。

身份标识
--
principal标识惟一身份，格式是 `<username>/<group>@<REALM>`，比如root/Admins@HOME.COM。username也叫primary，是必填项，可以是linux下的用户名；group也叫instance，用户可以不填，服务必须有；realm可以不填，会从krb5.conf查找默认的域，如果有多个域就必须要写上。每个 realm 可以有私有配置，包括 KDC 的地址和加密的算法，都可以独立存在。有些大型公司会创建一个独立的 realm 来分发管理员的权限。

Keytab 是一个包含了（若干）principals 和一个加密了的 principal key的文件。一个 Keytab 文件每个 host 都是唯一的，因为 principal 的定义了包含了 hostname 。这个文件可以用来认证，而不需要传递公开的密码，只要有这个 Keytab 就可以代表这个 principal 来操作。