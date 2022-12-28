电话协议的发展
====
写这篇的起因，是确定了SIP协议更直观的翻译应该叫电话初始化协议。Session在IT领域是个很宽泛的词，只表示两者之间持续的一段互动。而话音业务却有很多的特殊性：

1. 双向交互。光这一条就干趴下当前互联网界最常用的HTTP/1.1，一个只能单向通信的协议。
2. 兼具信令和媒体流，而且媒体流非常在意实时性。

很多业务虽然非常复杂，难于拆解，但承载的协议却非常简单，往往HTTP就足够。但话音业务却是业务非常容易理解，也不复杂，但对协议的要求却非常得高。

贝尔(AT&T成立的贝尔实验室就是纪念他)在1876年发明了电话，从此话音业务就渐渐成为了很大的市场。从模拟线路时代以来，以1975年为分界点，之前是In-Band协议，最后一代是SS5(Signaling System 5)，在那之后发展出了Out-Band，并最终进化并定格在SS7。直到IP时代到来，SIP协议产生于1996年。也是沿着Out-Band的脉络发展。

In-Band时代，只有一条承载话音的模拟线路，为了解决在语音通道上发送号码，贝尔实验室在二战后发明了MF多频技术，定义5个频率，每次同时发出两种频率，一共能组成10种组合对应十个数字。基于MF，在1963年发展出了DTMF，至今仍在使用。在那之前的电话都是转盘式拨号，之后就是现在常见的按键式拨号。MF包括R2 Signaling，R1(仅北美)，SS5。由于把控制信号在语音通道上传输，1960年代，phone phreaking发明了blue box，最大的好处可以免费打长途电话。为了防御这种攻击，加上数字技术的成熟，Out-Band开始登上历史舞台。

SIP使用了很多HTTP和SMTP的元素，形式上也非常相似。SIP首先从Internet发展起来，并被IETF承认，H.323系也是话音业务。两者从大的功能上都服务于电话，但设计思路却并不同，且H323兼容电信网络更好，所以ITU更偏好。