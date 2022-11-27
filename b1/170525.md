网络相关头文件所属目录的关系
====
unix下的网络文件分布的目录比较多，初看会觉得很乱且难记，试着整理一下。

本着unix下一切皆文件，所有的网络操作都通过抽象的socket操作，即socket是这些网络的承载者，不同的网络主机有各自的socket，并处在不同地址上。socket的头文件是sys/socket.h，比较直观也很好记。

对网络来说，不同的网络不能直接通信，所以socket首先要和地址绑定，不同的网络方式地址格式不同，要确定地址就要先确定网络方式，这里引入第一个概念`AF_XXX`宏，AF指Address Family，除了常见的IP网络(有`AF_INET/AF_INET6`两种)，还有像Bluetooth、AppleTalk、IPX(Novell)等不常见格式。OpenBSD支持36种，而Linux支持40种。从数量来看好像差不多，但两个系统间互相之间的交集并不多。Linux支持的NFC/CAN格式在BSD下不存在，同样BSD也有很多Linux没有的，不过总的来看BSD的网络协议更冷门一点，也许和它历史更久，用得也少有关系。

因为不同的地址族使用不同的协议，所以还定义了一套`PF_XXX`的宏，PF指Protocol Family，除了前缀不同，其它和AF宏完全一样。既然有三十多种地址，地址的格式必然不会相同，struct sockaddr解决的就是这个问题，这是个变长的结构，否则无法支持未来的网络协议族，因此这个结构最重要的就是长度和family字段，定义方式和TLV的思想是一致的。sockaddr相当于父类，具体每种协议族有各自的表示，像`sockaddr_in`是IP网络地址，而appletalk就是`sockaddr_at`，命名风格非常统一。不过并不是每个协议族都有专用地址，net80211/就没有。

虽然socket.h文件比较长，但和操作相关的accept/bind/connet/listen等占比重不高，其余大量各种宏和数据结构操作的定义。比如`SOCK_STREAM/SOCK_DGRAM`，这样看起来，这两个定义适合各种网络，而不仅仅是TCP/UDP。

理解了socket.h，就能知道网络的family有非常多，每种family下肯定还有很多的选项，这么多的协议族肯定要分开保存管理，所以在/usr/include/目录下有net/目录，还有形如netinet/、netmpls/、netatalk/、netax25/等等具体协议族的目录。

先说net/目录，这下面的文件特点是大都`if_xxx.h`风格，主要的用途是查询(inquery)各种network interface。比如`IFF_UP/IFF_MULTICAST`操作。BSD和Linux在这里又显出很大的差别，BSD中定义了名为ifnet的结构，用于内核操作网络接口man(9)，但Linux没有。

net的作用更多在于操作网卡，具体的协议比如IP协议则定义在netinet/目录下，这里的in.h(我猜应该in是internet的简写)定义了IP协议的各种应用，如TCP/UDP/ICMP/IGMP/ESP/AH等。这些定义都以`IPPROTO_`作为前缀，是IP PROTOCOL的简写。

这样一路看下来，网络头文件的规律就很清晰了。最后再说一个稍有点特殊的头文件，arpa/inet.h，这里定义了各种IP地址的数字表示和字符串表示的转换函数，为什么放在arpa目录，我猜是因为：IP网络的定义是由IEEE提出的，但第一个实现这个网络的是arpanet(1968年构想，直到1975年才有60个节点)，可能是当时开发时觉得，需要一个工具性质的地址转换函数，就放在arpa这个有点项目专用性质的目录下了，但后来随着用的人很多，所以就保留至今，没有移到netinet目录。另外arpa/目录下还有telnet.h/ftp.h/tftp.h等文件，原因是arpanet要求主机实现telnet/ftp/tftp协议，这也是一个网络最基本且必须的功能。所以arpa/目录作为历史的见证一直保留到今天。