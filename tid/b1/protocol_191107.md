# 目录服务和NetBIOS协议

目录代表实体，可以是一个文件或某个人的信息，通常这些信息以树状形式保存，类似目录树。目录服务是按照树状信息组织模式，实现信息管理和服务接口的一种方法。目录服务系统一般由两部分组成：第一部分是数据库（一般是分布式数据库），且拥有一个描述数据的规划；第二部分则是访问和处理数据库有关的详细的访问协议。

目录服务与关系型数据库不同的是，读非常快，但写比较慢，也缺少事务机制，是针对特定场景的特化机制。目录不支持批量更新所需要的事务处理功能，目录一般只执行简单的更新操作，适合于进行大量数据的检索；目录具有广泛复制信息的能力，从而在缩短响应时间的同时，提高了可用性和可靠性。目录服务技术的国际标准有两个，即较早的X.500标准和近年迅速发展的LDAP标准。

## X.500协议族

X.500不是一个单一协议，它是由一个协议族组成：

* X.501模型强调目录服务基本模型和概念
* X.509认证框架是如何在X.500中处理目录客户和服务器的认证
* X.511 抽象服务定义X.500被要求提供的功能性服务
* X.518 分布式操作过程表明如何跨越多台服务器处理目录服务
* X.519 协议规范即是X.500协议，包括目录访问协议DAP、目录系统协议DSP、目录操作绑定协议DOP和目录信息Shadowing协议DISP
* X.520 选定的属性类型要求是X.500自己使用的属性类型
* X.521选定的对象类即为X.500自己使用的对象类
* X.525复制是如何在目录服务器之间复制目录内容

这些X.500标准中主要定义有多种内容。一个信息模型：确定目录中信息的格式和字符集，如何在项中表示目录信息(定义对象类、属性等模式)；一个命名空间：确定对信息进行的组织和引用，如何组织和命名项——目录信息树DIT和层次命名模型；一个功能模型：确定可以在信息上执行的操作；一个认证框架：保证目录中信息的安全，如何实现目录中信息的授权保护——访问控制模型；一个分布操作模型：确定数据如何进行分布和如何对分布数据执行操作，如何将全局目录树划分为管理域进行管理——目录管理模型，客户端与服务器通信的协议—目录访问协议DAP，将用户请求在服务器之间进行链接所需的目录系统协议DSP，将选定的信息在服务器之间进行复制所需的目录信息映像协议DISP，用于自动在服务器之间协商连接配置的目录操作绑定协议DOP。

X.500虽然是一个完整的目录服务协议，但在实际应用的过程中，却存在着不少障碍。由于目录访问协议DAP这种应用层协议是严格遵照复杂的ISO七层协议模型制定的，对相关层协议环境要求过多，主要运行在UNIX机器上，在许多小系统上，如PC和Macintosh上无法使用，因此没有多少人按照DAP开发应用程序，TCP/IP协议体系的普及，更使得这种协议越来越不适应需要。

## LDAP协议族

LDAP协议从1993年批准，产生了LDAP V1版本，随后于1997年发布了第三个版本LDAP V3，它的出现是LDAP协议发展的一个里程碑性标志，它使LDAP协议不仅仅作为X.500的简化版，同时提供了LDAP协议许多自有的特性，使LDAP协议功能更为完备，具有了更大的生命力。

LDAP典型应用是保存用户名和账号，并用于大型系统的认证。协议自身是明文的，所以v3版本加入了SASL支持，结合kerberos可以对整个通信过程做到加密。

LDAP V3协议也不是一个协议，同样是一个协议族。

* RFC 2251——LDAP V3核心协议，定义了LDAP V3协议的基本模型和基本操作
* RFC 2252——定义了LDAP V3中的基本数据模式（Schema）（包括语法、匹配规则、属性类型和对象类）以及标准的系统数据模式
* RFC 2253——定义了LDAP V3中的分辨名（DN）表达方式
* RFC 2254——定义了LDAP V3中的过滤器的表达方式
* RFC 2255——LDAP统一资源地址的格式
* RFC 2256——在LDAP V3中使用X.500的Schema列表
* RFC 2829——定义了LDAP V3中的认证方式
* RFC 2830——定义了如何通过扩展使用TLS服务
* RFC 1823——定义了C的LDAP客户端API开发接口
* RFC 2847——定义了LDAP数据导入、导出文件接口LDIF

这些协议主要定义了LDAP的内容，同时主要定义了一个信息模型：确定LDAP目录中信息的格式和字符集，如何表示目录信息(定义对象类、属性、匹配规则和语法等模式)；一个命名空间：确定对信息进行的组织方式——目录信息树DIT，以DN和RDN为基础的命名方式，以及LDAP信息的Internet表示方式；一个功能模型：确定可以在信息上执行的操作的通讯协议以及在客户端进行这些操作的API接口；一个安全框架：保证目录中信息的安全，匿名、用户名/密码、SASL等多种认证方式，以及与TLS结合的通讯保护框架；一个分布式操作模型：基于Referral方式的分布式操作框架；一个LDAP扩展框架：基于控制和扩展操作的LDAP扩展框架 。

但在LDAP协议中尚未定义通用的访问控制模型和复制协议（对应X.500的映射协议DISP），尽管不同的LDAP厂商均实现了自己的控制模型和复制机制，但是LDAP标准的发展正集中在访问控制模型、复制协议（DUP）以及扩展操作上，这些扩展操作包括查询的分页和排序、语言标签、动态目录、LDAP服务发现等。

## NetBIOS

起因是有机器被人格式化，定位到某IP但未能锁定是谁。得知nbtstat可以反查并确认工号。

此协议是IBM在1983年发布，微软85年实现，比较多见确实在win系统。仅适合用于局域网且不支持域名。最初的时候跑在网络切换，虽然后来也做了over ip但依然改变不了不能路由问题

有自定义的帧头格式，和TCPIP更类似平级关系。