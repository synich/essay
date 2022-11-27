VPN概念解释
====
VPN的本意是把来自不同子网的设备放在同一个子网内，构建虚拟网络。既然要并网，肯定要做身份认证，而PPP点对点协议天生就带认证属性，这也是家庭网络都是PPPoE方式接入。

实现VPN的协议很多，举我所知的几种

1. PPTP  微软出的规范，RFC2637。必须基于IP或TCP协议(至少要3层网络)，加密密钥最高支持到128bit，强度比较弱，甚至在iOS10的时代直接被苹果给抛弃了，但是因为是微软自家的东西，又出了SSTP后继，好像没什么人在用
2. L2TP  思科提出，RFC2661，广泛使用
3. IPSec 用XAuth认证用户，model config分配IP。由于XAuth有版权且没有标准化，兼容性不如L2TP。运行在用户态的IKE daemon和处理实际IP报文并运行在内核态的IPSec协议栈，不同的OS实现不同。
4. IKEv2 iOS10去掉PPTP后，新支持的类型。特性是IKEv2的MOBIKE(见RFC4555)扩展，VPN建立后切换网络(如从4G到3G)不会掉线。另外认证也支持EAP，比IPSec只支持XAuth好像更高级
5. OpenVPN/ShadowSocks/V2Ray 这些更多的是穿越工具，分类上有些并不属于VPN，也没有RFC标准，一般都只是某个开源软件的实现，因此Android/iOS系统都需要额外安装对应的客户端软件，系统本身不自带

L2TP
----
Layer 2 Tunnel Protocol的缩写，Layer 2这里指的是PPP协议，通俗地说，就是为了运输二层协议PPP而存在的。L2TP因为有PPP，负责AAA，也就是认证、授权、计费（Authentication, Authorization, Accounting）。除了IP网，还可以跑在ATM, MPLS, 帧中继等网络。由于L2TP 传输安全性太差，于是人们在 L2TP 外层再套一个 IPSec 来保证传输过程的安全性，传输HTTP的话就是这样一个层级
```
IP/UDP(4500)/ESP/UDP(1701)/L2TP/PPP/IP/TCP/HTTP
```

IPSec使用ESP加密，除上面介绍的传输模式外，还有另一种方式IP/ESP/UDP(1701)/L2TP/PPP，也叫隧道模式。这种方式IP层的负载是ESP，往往过不了NAT，并不适用于发起VPN者的网络环境。而前面提到的方式虽然会有两层UDP，但容易过NAT，这也是单纯技术上最佳的选择并不会被市场接受。

L2TP似乎只有6个字节，每两字节一段，分为3段。第1段是协议和标志位，第2段是Tunnel ID，第3段是Session ID。后面这两个ID看起来是绑定的，但方向不同值不一样，命名为Session ID有点不对题。其上的PPP只有4个字节，1字节Address，1字节Control，2字节的承载协议类型（此例中指明是IP）。比TCP三卷本的说明少了最开始的0x7E。

IPSec和IKE
----
IPSec方式工作在IP层，其涵盖的ESP和AH协议主要是规定IP包的格式，因此在连接对端时，只要服务器域名不需要端口。

中间人攻击是针对加密会话的初始化阶段进行的，IPSec 的初始化阶段显然要考虑这个问题，所以提出了XAuth规范，但该规范不如IKE的EAP，说到这里就要引出IKE协议了。IKE 协议在1988年11月发布v1版，2005年升级到v2版。是在奥克利协议（Oakley protocol）与ISAKMP协议的基础之上发展出来的，它和IPSec是独立的两套协议，但人们发现二者组合非常互补，所以现在往往一起提。由于IKE使用X.509安全认证，问题就转化成了面对中间人攻击，我们要如何去验证 IKE peer 的身份呢？也就是说，我们要如何确定对方就是我们要联络的人呢？IKE 协议里Message type 5 和 type 6 就是负责这个事情的。具体来讲有三种方法：

1. 预共享密钥：Pre Shared Key，简称PSK。用大白话就是双方商定一个密钥作为彼此认证的手段
2. 公钥加密：需要配置用户证书/CA证书/服务器证书
3. 数字签名

XAuth似乎只支持预共享密钥和公钥加密，对应了XAuth和PSK/RSA选项，EAP不再依赖PSK。

### StrongSwan

基于IPSec最早的项目名叫FreeS/WAN，所以现在都沿用了swan这个名字，是Secure Wide-Area Networking首字母的缩写。这个项目停止维护后，衍生出OpenSwan、LibreSwan、StrongSwan。StrongSwan的主程序名就叫ipsec。

OpenVPN
--
通过四层的TCP/UDP建立连接，然后客户端会从服务端得到私有网络的配置信息，进而客户端会在其主机上创建TUN网卡，该网卡的地址和服务器在同一个网段，从而构成私有网络。

TUN/TAP网卡是linux2.4版本出现的最早的虚拟网络，TUN网卡工作在三层，主要和应用程序直接打交道，为了模拟一张完整的网卡，再配套一张工作在二层的TAP网卡，整个网络栈就齐备了。

使用iproute2的ip命令来创建TUN网卡，需要root权限。此外TUN还用于做IP隧道，IP4和IP6组合起来共有4种类型。