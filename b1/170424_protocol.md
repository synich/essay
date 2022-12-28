协议是什么，要定义什么
====
定义和期望
----
每一个软件只要不是像HelloWorld那样纯入门性质的软件，它一定承载了某种功能，想让它完成某种功能就要有固定的格式，这种格式便是接口，如果网络化了又可以称之为协议。Unix时代的软件多是单机执行，也存在着格式的要求，比如grep就要求第一个参数是搜索关键词，第二个及以后是要搜索的文件名，缺少或者乱了都不行，到了网络时代因为传输的复杂性，接口的要求也愈加复杂，但本质都是对输入的一种约定。有了输入，则软件会按预设的行为给出结果，同样拿grep为例，它会将文件拆分成以行为单位，并将每行和给定关键词进行匹配，一旦匹配成功则输出这行的内容。至于正则表达式如何被编译，又如果匹配，使用者无需关心。

同样的对于业务层协议，要定义一种业务的输入格式及反应行为的期望结果，至于背后的实现逻辑不需要也不应该在协议定义，当然如果我们对这块业务很熟悉，看到接口大致能推断出背后的逻辑是什么样的，当然这不是必须。

比如大华的configManager.deleteFile协议，历史原因它是没有入参的，自然也无法知道到底删除什么文件，相应地就我们需要严格定义它的行为，比如让设备回到出厂状态，只要删除的文件让设备看起来是恢复出厂，这个协议目标就达到了。更进一步最好要规定出厂状态的指标，在做测试时更有依据。

再比如有个需求要实现抽帧播放，可以保留I帧后的若干个P帧，也可以若干个I帧只保留1个。如果只是这样定义，似乎也没有问题。但是考虑到H264规范有一种特殊的P帧，比一般的P帧大且只依赖于I帧，这时按照若干个I帧回放1个的定义，对这种视频就应该是若干个I帧加重定位P帧中抽取一个。随着视频格式的不同，协议竟然要跟着变化，说明这样的定义没有触及更根本的东西。更好的定义就是以最少几秒看到一个视频切面来定义能观察到的行为，这种方式不依赖实现细节，协议才能稳定。

协议的层次
----
对于分层OSI给出了七层模型，通常业务协议不需要如此复杂，传输层(TCP/UDP)\+标识层\+载荷就够了。通常TCP占主流，UDP更多的用在实时的音视频流或NAT中，标识层衔接了传输层和载荷，作用是指示分包、加密、校验和等功能，这一层要考虑不同客户端的便利性。载荷层负责描述业务内容，多为消息封装格式，常见的有XML或JSON，如果觉得文本格式浪费体积也有Protobuff或MsgPack这类Binary的消息封装。对于秒级的消息通信业务而言，消息大小、解析时间并不是瓶颈，我认为简单易懂且普及(JS天生支持使得在Web领域更是加分)的JSON是够用了。像Protobuff则是到了毫秒级的通信场景下才能发挥更大的作用。

协议设计的关联性原则
----
比如登陆和是否支持静态/动态多连接在同一个交互里，现在看来就属于过耦合。因为登陆不意味着要取流，但由于多连接的存在，导致登陆的处理代码非常复杂。比如静态要建立所有的连接，如果是动态则必须把状态内化，以期在真正拉流时能确定设备的调性，可是这就把这个特性的周期延长了，理想的设计特性是用完即丢，从概念上尽量做到stateless为好。比如在真正开始取视频流时，在应答中告知客户端接下来的连接特性，客户端依此做反应，这个状态的周期就被约束在真正的取流过程。

视频流协议的业界标准RTSP就是这样，先发请求信令并根据回复的地址/端口建立子连接，而公司的私有协议是先请求建立连接，再创建子连接，最后再发信令。虽然看起来建立连接必不可少，但发信令比起来显然更重要一些，既然更重要，就应该更放在前面，也许后一个看起来也很重要的操作，就可以省掉了。比如大华的P2P网络，实际的连接只有一个，创建一个子连接反而是一种累赘。所以尽量不要额外地假设一些条件，只要保证更高优先级的操作被更早更完整地处理掉。那些额外的假设条件最好要明确地写出来，以便让以后的人知道当环境改变时，可以毫不犹豫地对协议进行调整。

协议体系的自洽
----
曾经和夏杰聊过，协议要能自圆其说。如果从更哲学的角度来理解，尼采有句描述：这个世界没有事实，只有诠释。即所有的现象都是诠释/解释，解释的方式可以有很多种，但是只有最具有说服力的解释，才能占得主流地位。大华协议也是对监控领域这个小世界的诠释，因此只有具备最好的解释性的协议，才能生存到最后。一个好的解释体系，根基有两件事，定义(或概念)和逻辑推演。没有体系内明确的定义(只要明确，不过度追求“正确”)，逻辑推演就是无本之木容易陷入诡辩和循环认证，没有正确的推演，衍生的结果往往会冲突。

QA(17年6月初)
----
1. 协议的本质是什么，好的衡量标准(金线)是什么？
* 协议是被网络化的接口，接口的本质是契约。即在什么样的规定前提下，通过什么样给定的输入，最终达成怎样的输出。衡量标准就是契约的定义，越详细越无歧义越好。至于扩展性的权重，是第二位甚至更靠后，大不了重新订一份新的契约就好了。
2. 大华协议有4千多条，粒度是什么或者说应该依据什么来制定协议？(此处是两个原始问题)
* 有4千多条，就说明有4千多个应用场景，分别有不同的输入，有不同的期望输出。考虑到大华是个OEM导向的公司，光IPC一年软件版本能达到1万多个，4千并不多。至于粒度，对超过90%的定制协议，满足定制客户的使用场景就是好的协议。如果一定要说粒度，两件事，如果以普通消费者能够区分的差异度来区分协议。但也不要把从软件上可以归并的行为硬生生归在一起。我想到微信的例子，把小视频和拍照合并到一起后，我的母亲就再也不会用小视频了。(因为那个按键短按是拍照，长按是视频，母亲不会用长按这种操作方法)
3. 协议要包含哪些元素？
* 同问题1，界定什么场景下用，输入和输出，这些要素是第一性的。至于其它request-ID，session-ID，就好比是合同中的签名，如果再有时间戳，相当于合同的有效期，就更好了。
4. RPC要定义哪些方法，如何让调用者更简单？比如做到RESTful风格。
* 简单的定义要从理解角度看，如果用户懂业务背景，或者需求就是用户定制的，那么和定制需求完全契合的协议，就是最简单的。说实话RESTful风格未必就是简单，把一切都认为是资源的行为，然后基于资源的操作，这种思想适用于互联网，或者反过来说，正是基于互联网的基础设施，提出了RESTful。但不同的领域，未必都要按RESTful方式设计。让使用者最自然的使用方式，就是简单。这方面有很多理论，最少知识/最少惊奇原则。