# HTTP的认证方式

HTTP初衷是定义为无状态协议，但随着使用日渐广泛，认证也纳入了RFC7235的定义。客户端如果请求一个不被允许的资源，服务端返回401或407，消息头带上WWW-Authenticate，并告知认证算法和域信息。客户端再根据这些信息，计算出一个签名，填到Authorization字段，后面用一个词表示认证算法，申请新的算法要向IANA提交申请并经IETF审核，已入标准的有Basic、Digest、Bearer、HOBA约10种。也可以是私有扩展，后面必须有一个空格，然后是签名值。如此这样交互下来，服务器才会认可这次访问是合法的。

示例

Server

```
WWW-Authenticate: Basic Realm=XYZ
```

Client

```
Authorization: Basic ABC=
```

上述是服务端对客户端要求的单向认证，另外还有RFC8121双向认证，使用了离散对数或椭圆曲线算法的Key Agreement Mechanism 3机制。

为解决SSO问题，HTTP扩展了 Negotiation 认证，也叫SPNEGO(Simple and Protected GSSAPI Negotiation Mechanism)。 Windows 支持两种 Negotiation认证方案：NTLM和Kerberos。Linux上的实现一般不支持NTLM，只支持Kerberos。

## OAuth流程

每个带统计或权限的应用系统，肯定会希望有用户体系，但现实是用户往往不愿意注册，这种场景下，就要依赖向另一个管理帐号的系统(简称U)请求认证，并依赖U的校验结果去鉴定用户。

要解决的第一个问题，不能触碰用户输入密码的环节，所以U一定要提供一个完全的登陆框，但这就安全固然解决，可是登陆后要去干什么呢？所以这个登陆页的参数一定要有个callback，如果登陆成功，把cb的值用302方式回复浏览器，这时还要带一个code，表示登陆成功，这个code在一段时间内，就可以证明，用户在U系统上是存在的。

到此，用户是否存在(真实性)的问题就解决了，如果还想知道到用户是谁，要做进一步动作。用code再一次向U的网页发起请求，用户在页面上选同意的话，返回token，最终用token去请求资源，也只有token换资源这一步，不会弹出网页。