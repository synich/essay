视频的封装格式
====
ES（Elementary Stream）流是基本码流，包含音频、视频、数据的连续码流。编码器输出的都是这种类型。

PES（Packet Elementary Stream）流是打包的基本码流，是将ES根据需要打包成长度不等的数据包并加上包头就形成了打包的基本码流PES。

TS（Transport Stream）流，也叫传输流。是由固定长度的188字节的包组成。含有独立是一个或者多个program,一个program又可以包含多个视频，音频和文字信息的ES流。每个ES流会有不同的PID标示。为了分析这些ES流，TS有些固定的PID来间隔发送Program和ES信息表格：PAT表和PMT表。

(在MPEG-2系统中,由视频, 音频的ES流和辅助数据复接生成的用于实际传输的标准信息流称为MPEG-2传送流)

封装 : 就是捆绑打包, 将画面视频文件和音轨文件打包在一起, 并按照一定规则建立排序和索引, 便于播放器或播放软件来索引播放. 包括AVI / PS(Program Stream)/ TS（Transport Stream）/ MKV（Matroska）等.

PS是节目流编码器出来的是TS流，传输接口为asi口，编码器整个作用过程是把模拟信号变成ES，再打包成PES，再打包成TS流输出。
复用器是把多路单节目或多节目TS流合称1路多节目TS流，再给调制器。
数字卫星接收机出来的是TS流，也是asi接口，可能包含一路或多路节目，有的还同时有一路模拟信号视音频输出。
模拟卫星接收机出来的是模拟视音频信号。，PS流与TS流的区别在于，PS流的包结构是可变长度的，而TS流的包结构是固定长度的.

TS流的解码过程-ES-PES-DTS-PTS-PCR

TS 流解码过程:

1. 获取TS中的PAT

2. 获取TS中的PMT

3. 根据PMT可以知道当前网络中传输的视频（音频）类型（H264），相应的PID，PCR的PID等信息。

4. 设置demux 模块的视频Filter 为相应视频的PID和stream type等。

5. 从视频Demux Filter 后得到的TS数据包中的payload 数据就是 one piece of PES，在TS header中有一些关于此 payload属于哪个 PES的 第多少个数据包。 因此软件中应该将此payload中的数据copy到PES的buffer中，用于拼接一个PES包。

6. 拼接好的PES包的包头会有 PTS，DTS信息，去掉PES的header就是 ES。

7. 直接将 被拔掉 PES包头的ES包送给decoder就可以进行解码。解码出来的数据就是一帧一帧的视频数据，这些数据至少应当与PES中的PTS关联一下，以便进行视音频同步。

8. I，B，B，P 信息是在ES中的。

ES 是直接从编码器出来的数据流，可以是编码过的视频数据流，音频数据流，或其他编码数据流的统称。 ES 流经过 PES 打包器之后，被转换成 PES 包。 PES 包由包头和 payload 组成.

在 PES 层，主要是在 PES 包头信息中加入 PTS( 显示时间标签 ) 和 DTS （解码时间标签）用于视频、音频同步。 其实， Mpeg-2 用于视音频同步以及系统时钟恢复的时间标签分别在 ES ， PES 和 TS 这 3 个层次中。在 ES 层，与同步有关的主要是视频缓冲验证 VBV （ Video Buffer Verifier ），用以防止解码器的缓冲器出现上溢或下溢；在 PES 层，主要是在 PES 头信息里出现的显示时间标签 PTS （ Presentation Time Stamp ）和解码时间标签 DTS （ Decoding Time Stamp ）；在 TS 层中， TS 头信息包含了节目时钟参考 PCR （ Program Clock Reference ），用于恢复出与编码端一致的系统时序时钟 STC （ System Time Clock ）。

基本流程如下：首先 MPEG-2 压缩编码得到的 ES 基本流，这个数据流很大，并且只是 I ， P ， B 的这些视频帧或音频取样信息，然后加入一些同步信息，打包成长度可变长度的数据包 PES ，原来是流的格式，现在成了数据包的分割形式。同时要注意的是， ES 是只包含一种内容的数据流，如只含视频，或只含音频等，打包之后的 PES 也是只含一种性质的 ES, 如只含视频 ES 的 PES, 只含音频 ES 的 PES 等。可以知道， ES 是编码视频数据流或音频数据流，每个 ES 都由若干个存取单元（ AU ）组成，每个视频 AU 或音频 AU 都是由头部和编码数据两部分组成， 1 个 AU 相当于编码的 1 幅视频图像或 1 个音频帧，也可以说，每个 AU 实际上是编码数据流的显示单元，即相当于解码的 1 幅视频图像或 1 个音频帧的取样。 MPEG-2 对视频的压缩产生 I 帧、 P 帧、 B 帧。把帧顺序 I1,P4,B2,B3,P7,B5,B6 帧的编码 ES ，通过打包并在每个帧中插入 PTS/DTS 标志，变成 PES 。在插入 PTS/DTS 标志时，由于在 B 帧 PTS 和 DTS 相等，所以无须在 B 帧多插入 DTS 。而对于 I 帧 和 P 帧，由于经过复用后数据包的顺序会发生变化，显示前一定要存储于视频解码器的重新排序缓存器中，经过从新排序后再显示，所以一定要同时插入 PTS 和 DTS 作为重新排序的依据。

其中，有否 PTS/DTS 标志，是解决视音频同步显示、防止解码器输入缓存器上溢或下溢的关键所在。 PTS 表明显示单元出现在系统目标解码器（ STD- System Target Decoder ）的时间 , DTS 表明将存取单元全部字节从 STD 的 ES 解码缓存器移走的时刻。 视频编码图像帧次序为 I1,P4,B2,B3,P7,B5,B6,I10,B8,B9 的 ES ，加入 PTS/DTS 后，打包成一个个视频 PES 包。每个 PES 包都有一个包头，用于定义 PES 内的数据内容，提供定时资料。每个 I 、 P 、 B帧的包头都有一个 PTS 和 DTS ，但 PTS 与 DTS 对 B 帧都是一样的，无须标出 B 帧的 DTS 。对 I 帧和 P 帧，显示前一定要存储于视频解码器的重新排序缓存器中，经过延迟（重新排序）后再显示，一定要分别标明 PTS 和 DTS 。例如，解码器输入的图像帧次序为 I1,P4,B2,B3,P7,B5,B6,I10,B8,B9 ，依解码器输出的帧次序，应该 P4 比 B2 、 B3 在先，但显示时 P4 一定要比 B2 、 B3 在后，即 P4 要在提前插入数据流中的时间标志指引下，经过缓存器重新排序，以重建编码前视频帧次序 I1,B2,B3,P4,B5,B6,P7,B8,B9,I10 。显然， PTS/DTS 标志表明对确定事件或确定信息解码的专用时标的存在，依靠专用时标解码器，可知道该确定事件或确定信息开始解码或显示的时刻。例如， PTS/DTS 标志可用于确定编码、多路复用、解码、重建的时间。

PCR

PCR 是 TS 里面的，即 TS packet 的 header 里面可能会有，他用来指定所期望的该 ts packet 到达 decoder 的时间，他的作用于 SCR 类似。

DTS, PTS

对于一个 ES 来说，比如视频，他有许多 I,P,B 帧，而 P, B 帧都是以 I ， P 帧作为参考。由于 B 帧是前向后向参考，因此要对 B 帧作 decode 的话，就必须先 decode 该 B 帧后面的 帧（ P, 或者 I 帧），于是， decode 的时间与帧的真正的 present 的时间就不一致了，按照 DTS 一次对各个帧进行 decode ，然后再按照 PTS 对各个帧进行展现。

有时候 PES 包头里面也会有 DTS ， PTS ，对于 PTS 来说，他代表了这个 PES 包得 payload 里面的第一个完整地 audio access unit 或者 video access unit 的 PTS 时间（并不是每个 audio/video access unit 都带有 PTS/DTS ，因此，你可以在 PES 里面指定一个，作为开始）。

PES 包头的 DTS 也是这个原理，需要注意的是：对于 video 来说他的 DTS 和 PTS 是可以不一样的，因为 B 帧的存在使其顺序可以倒置。而对于 audio 来说， audio 没有双向的预测，他的 DTS 和 PTS 可以看成是一个顺序的，因此可一直采用一个，即只用 PTS。