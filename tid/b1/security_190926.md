# SSL和SSH比较

两者都是常见的安全术语，安全包含四层含义

* 数据加密，即抓包不可读，看上去是乱码，这个最好理解，也最直观
* 数据完整性，这是第二个层次，即数据虽然被加密了，但万一被人篡改了怎么办？又或者数据没有收发完整怎么办？数据完整性解决的就是这类问题
* 身份验证，这是第三个层次，刚接触安全的话也许不会注意。虽然数据加密了，也有完整性校验了，但怎么知道发消息给你的人，就是你期望的人？直白的说类似证明**你妈是你妈**，比喻可能不太合适，但目的是一样的。
* 不可抵赖性，A做过的承诺，只要做了数字签名，就无法反悔。

二者都能很好地完成前两层，但只能SSL可以实现身份验证。由于ssh自身没有认证，所以ssh和Kerberos的结合就是顺理成章的事了。Kerberos用于解决一套大系统内的身份识别、数据加密。因此在使用场景上存在很大差异。

## 协议背景

从名字就可以看出使用了不同的协议。解决的是两点间的加密防窥、互信。SSL和SSH都是基于公钥认证，SSL的出发点是让客户端确保服务端是可信的，而SSH反过来，让服务端确保客户端可信。尽管理论上SSL也扩展了互相认证的机制，但实际中我还没有见过SSL这方面的应用。

SSL是会话层协议，其上可以承载各种其它协议，典型的比如HTTPS，我在公司做过一个私有协议全链路加密也是over SSL的。SSL的版本有V2、V3(V1版本因为存在重大安全缺陷，并没有公开过)。后续则更名为TLS，从V1.0->V1.1->V1.2->V1.3。因为SSLv3的漏洞被证明不再具备安全性，至少也是从TLS起使用比较好。SSLv2版本的协议和v3之后的格式上有很大不同，因此OpenSSL代码里特地有一种称为v23的方法，就是使用v3可以回落到v2。至于v3到TLS则沿用同样的总体结构(采用TLV格式)，版本号也一脉相承地从0x0300到0x0304。

SSH是个特定应用的协议，就我所知仅远程终端操作，隧道和文件传输功能。仅有v1和v2两个版本，而且v1已经几乎绝迹。我想不明白为什么SSL的版本一直在演进而SSH却不动了。

## 交互流程

SSL采用客户端主动发起模式，交互采用Client-Hello、Server-Hello、Change-Cipher等过程。

SSH在TCP连接建立后，Server端和Client端互发一段明文字符串消息SSH-2.0-xxx，xxx代表软件名字，不规定发送顺序。接着Client Key Exchange Init的流程。SSH在交互开始，服务端会把自己的公钥（注意：不是证书）给客户端，客户端工具会提示用户，第一次客户只能选择相信，如果想长期使用，就写入`known_host`文件，所以客户端不具备认证服务端的能力，只能识别变化。使用的工具和版本不同，协商算法不同，指纹也会不同，比较新的版本会协商出ssh-ed25519，老版本是ssh-rsa，dsa或ecdsa。算法生成的公私钥长度从大到小顺序RSA > DSA > ECDSA > ED25519（严格的说，RSA私钥比DSA长但公钥短，另两个全方位得短）。不管哪种都表示成MD5或SHA256值，很难记住。ssh-keyscan专门用于探测公钥，也是ssh2e协议但message code略有不同。

ssh协议在进入加密传输阶段后(ssh-keyscan得到公钥就结束，不会进入这个环节)，每个包结尾都会带上mac验证数据，带宽无法百分百的用于传输，但为了校验完整性，这点损失只能接受。

## 身份验证

SSL为了证明服务器是真实可信，需要给出服务器一些信息才行，便是经常听到的数字证书。直观的可以这么理解，你去拜访某个大佬，但又不知道是不是被人乔装，于是你向面前这位大佬采集了指纹，接着把指纹发到公安局，询问是否是本人，公安局如果给出肯定的答复，就可以放心地聊下去了。

证书包含公钥和一些持有者的信息（比如域名、公司名等），与之对应的必然有一个私钥文件。两者构成了SSL服务端的必备文件。如果用OpenSSL工具生成的话，后缀名是.pem。pem可以通过普通的文本编辑器打开，是RFC1421定义的一种格式，首行和尾行是标示文件类型，中间部分是经过Base64之后的数据，因为这个特性，可以通过cat命令把多个证书文件串在一起也是可以使用的。解码后的二进制数据是符合规范，通过OpenSSL的对应命令字可以看内容。比如

* openssl x509 -in 公钥名.pem -noout -text

可以看到数字证书的公钥、签发者等信息，把x509换成rsa，再打开私钥文件则可以看到RSA的公私钥和计算因子。

ssh不具备证书功能，因此ssh-keygen只能生成公私钥对。openssl和ssh-keygen生成的私钥格式一样，但公钥格式差别很大，好在ssh-keygen可以把openssl的格式转换成ssh的，详细看ssh-keygen的-m选项。

## TLS密钥的来源

文件内容是对称加密，其密钥采用会话加密机制，不会重用。这个密钥的生成机制有3步

1. premaster key。客户端生成随机数，用服务端的RSA公钥加密后传回服务端（先不考虑DH方式）。这里还有个要点，premaster的前两位是TLS的协商版本，一旦服务端解密后发现这个版本比client hello的版本高，说明会话被劫持，可以拒绝协商，防止降级攻击。
2. master key。联合premaster key和客户端、服务端互换的随机数，一共3个随机数，生成固定长度的密钥。（猜测是用hash机制）
3. session key。以master key为种子，通过密钥衍生算法，生成最终的加密密钥。