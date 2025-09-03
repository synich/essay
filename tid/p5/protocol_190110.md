# 视频取流协议

## RTSP

RTSP支持RTP/AVP, RTP/AVP/TCP两种传输模式的，前者也可以写作RTP/AVP/UDP，这种模式因为是UDP传输，客户端会携带自己的端口，通常是两个，音频和视频。而TCP是RTP over RTSP over TCP方式，复用连接并不需要传递端口。

VLC向StreamApp请求，发送SETUP时指定RTP/AVP。由于库本身的问题，只能支持TCP，回复455表示不支持，于是VLC发起OPTION尝试，但响应中又携带了SETUP，于是VLC就不知道该如何执行下去。

看起来似乎RTSP缺少一种更灵活的协商机制，但是考虑到TCP和UPD特性对视频的影响，如果协商变成由服务端来决定，显然并不符合客户的本意，这个SSL的协商在业务领域是不同的。虽说也可以做成SETUP时交换能力，在PLAY时指定方式，似乎和SDP的阶段又有冲突，也许是它的不足吧。

## 浏览器无插件视频播放

看了IPC的浏览器播放，速度很快体验很好，抓包看实现，网络协议用 RTSP over WebSocket，用HTTP的upgrade部分切换，要注意的是必须先F12打开开发工具，再进入视频页面，这样才能在Network页签看到网络数据。

可以看H265视频，组合了多种技术

首先解码部分单独跑在worker里，音频和视频各一个，解码部分用了FFMpeg，这块估计是用了WebAssembly实现的，但不能实证。既然播放H265那就肯定不是用video标签，用的是canvas呈现，将视频解码并转成图片画上去的。虽然能播放H265，但是码流太高还是非常卡，实测在3M码流时已经掉帧严重，几秒后自动切入辅码流模式。

## HLS

HLS是HTTP Streaming传输视频的一种，由Apple提出，另外3GPP，微软和Adobe也有类似的技术，由于iPhone太强势，使得HLS几乎无人不知。

URL对应的索引文件，就是M3U8，8代表UTF8。格式像这样

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-ALLOW-CACHE:YES
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TARGETDURATION:1
#EXTINF:0.998, no desc
http://media.com/seg1.ts
#EXT-X-ENDLIST
```

html5的video标签本来只支持3种封装格式，mp4/ogg/webm，这几种格式似乎都偏向点播。而Apple在safari的实现中额外支持了ts，为什么要用 TS 而不是 MP4，这是因为两个 TS 片段可以无缝拼接，播放器能连续播放，而 MP4 文件由于编码方式的原因，两段 MP4 不能无缝拼接，播放器连续播放两个 MP4 文件会出现破音和画面间断，影响用户体验。这就是Living的意思。最简单的方式是video.src