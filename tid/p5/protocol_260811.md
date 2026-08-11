# WebSocket协议理解

## 缘起

为弥补HTTP不能全双工的缺失，在2008年启动了草案的编写，到2011年正式成为RFC标准。chrome4开始支持，比ES6/Promise等语言特性早得多，是相当成熟的标准。

## 格式

通过HTTP的101完成握手，后续交互的基本单位是frame。基础格式为二进制协议头+XOR掩码的payload。

协议头有几个`Sec-WebSocket-*`字段，有两个请求时必填字段：key用于XOR掩码，version固定13。

### 协议头2~14byte

*基本头(Base Header,固定 2 字节)*

* 字节 1:包含3部分
  * FIN: 1 位
  * RSV1/2/3: 各 1 位,通常为 0
  * Opcode: 4 位:0x0 连续帧/ 0x1 UTF8 文本帧/ 0x2 二进制/0x8 Close/ 0x9-0xA ping-pong / 0xB-0xF 保留扩展

* 字节 2:包含2部分
  * Mask: 1 位,是否使用掩码
  * Payload length: 7 位,初始长度字段

*扩展头(4~12byte)*

由于基本头的 length 只有 7bit,所以有两种特殊用法

* length==126, 用 2byte 表示长度
* length==127, 用 8byte 表示长度

mask 位为 1 时(client 总是 1,server 通常 0),跟 4byte 的 masking-key

### payload

XOR是为了混淆，防止中间代理缓存或错误处理。通信模式: 全双工,既能一问一答,也能 client 或 server 连续发送

### 跨域

和AJAX的浏览器拦截不同，WebSocket的跨域是在服务端判断，如果请求的Origin字段不合法，服务器拒绝建议连接。原因还是在长连接属性上，试想如果在服务端接受请求，建立连接，此时再由浏览断开，给服务器增加了不必要的负担。

## 与编程语言的结合

WebSocket的连续会话特性和HTTP短连接对编程语言的影响很大，很少有语言能在一套体系内自如地处理两种截然相反的业务，所以很多时候会分离WebSocket和HTTP服务。这也是传统上WS的端口会独立出来，但Erlang系语言属于异类，能非常丝滑地在两种模式间自如切换。