RTSP笔记
==
RTSP支持RTP/AVP, RTP/AVP/TCP两种传输模式的，前者也可以写作RTP/AVP/UDP，这种模式因为是UDP传输，客户端会携带自己的端口，通常是两个，音频和视频。而TCP是RTP over RTSP over TCP方式，复用连接并不需要传递端口。

VLC向StreamApp请求，发送SETUP时指定RTP/AVP。由于库本身的问题，只能支持TCP，回复455表示不支持，于是VLC发起OPTION尝试，但响应中又携带了SETUP，于是VLC就不知道该如何执行下去。

看起来似乎RTSP缺少一种更灵活的协商机制，但是考虑到TCP和UPD特性对视频的影响，如果协商变成由服务端来决定，显然并不符合客户的本意，这个SSL的协商在业务领域是不同的。虽说也可以做成SETUP时交换能力，在PLAY时指定方式，似乎和SDP的阶段又有冲突，也许是它的不足吧。

浏览器无插件视频播放
--
看了IPC的浏览器播放，速度很快体验很好，抓包看实现，网络协议用 RTSP over WebSocket，用HTTP的upgrade部分切换，要注意的是必须先F12打开开发工具，再进入视频页面，这样才能在Network页签看到网络数据。

可以看H265视频，组合了多种技术

首先解码部分单独跑在worker里，音频和视频各一个，解码部分用了FFMpeg，这块估计是用了WebAssembly实现的，但不能实证。既然播放H265那就肯定不是用video标签，用的是canvas呈现，将视频解码并转成图片画上去的。虽然能播放H265，但是码流太高还是非常卡，实测在3M码流时已经掉帧严重，几秒后自动切入辅码流模式。