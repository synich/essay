# HLS取流

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

html5的video标签本来只支持3种封装格式，mp4/ogg/webm，这几种格式似乎都偏向点播。而Apple在safari的实现中额外支持了ts，为什么要用 TS 而不是 MP4，这是因为两个 TS 片段可以无缝拼接，播放器能连续播放，而 MP4 文件由于编码方式的原因，两段 MP4 不能无缝拼接，播放器连续播放两个 MP4 文件会出现破音和画面间断，影响用户体验。这就是Living的意思。最简单的方式是video.src=xxx.m3u8。可惜只有safari可以这样，其它浏览器必须用js插件。

ts流包含视频，音频，字幕这3种元素。这些元素safari会自动识别并解码，其它pc浏览器需要插件（我的理解）。TS比MP4更方便缓存，便于提高边际缓存服务器性能；Android 3.0发布Pantos(m3u8/ts)，至少在手机端成为通用标准。

mp4不是流式文件，必须有索引才能任意seek，（mp4新规范实际已经支持无缝拼接，真正流媒体封装器）。因此adobe和微软纷纷支持基于f4v afra box和ismv (fragmented mp4)的http streaming，可惜apple不支持。
其实flv也是流式文件，比其它格式更简单，apple同样不支持。最后各家只好都去支持MPEG-TS了。

另外，用TS做流媒体封装还有一个好处，就是不需要加载索引再播放，大大减少了首次载入的延迟。如果片子比较长，mp4文件的索引相当大，影响用户体验（虽然标准支持moov tag压缩，目前没有什么好的压缩工具，客户端也不都一定支持），这也是为什么apple推荐长片用ts流。

也不是说完全没有缺点，TS->PES->ES解码过程，去掉太多头部信息， 所以TS不如分MP4节省空间。只能说总体还是优势更多。

再说FLV-HTTP，就是用HTTP下载FLV文件，似乎和RTMP是一回事，原生的RTMP基于TCP，端口1935。为了复用HTTP基础设施，同时为过防火墙，做出了over HTTP形式。必须安装Flash是最大的限制。