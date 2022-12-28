公私钥格式的认识
====
公私钥对做为一个概念，最后一定会有形式用来记录与传输，以RSA为例展开讲讲。

RSA公钥由n和e两个数字构成，e通常是65537，重要的是n，这是一个非常大的质数。一些函数库会用类甚至数组来表示RSA公钥。但这只是内存中的表示，并不适合序列化，又分ssh和ssl两个流派，而ssh的两个版本又不同。

SSH-1
----
SSH 1协议只支持 RSA 算法，所以公钥也为RSA特化，格式为所有字段以单个空格符分隔，各字段依次为选项、位数、指数、系数、注释。第一个字段是可选的，表示该条目（行）是否以数字开头，选项字段不会以数字开头。最后一个字段注释，如果在生成密钥时没有给定注释，默认注释为密钥的创建者，注释仅仅是提供给用户查看密钥时作为一个辨识标记，在 SSH 使用中没有任何作用。

```
2048 65537 1234 username@hostname
```

SSH-2
----
非对称加密肯定不能局限于RSA，所以公钥格式也做了改变。所有字段仍以单个空格符分隔，各字段依次为选项、密钥类型（keytype）、base64编码后的密钥、注释。第一个字段是可选的，表示该条目（行）是否以数字开头，选项字段不会以数字开头。最后一个字段注释同样只起提示作用。

密钥类型（keytype）可能是 ecdsa-sha2-nistp256, ecdsa-sha2-nistp384, ecdsa-sha2-nistp521, ssh-ed25519, ssh-dss 或 ssh-rsa。

```
ssh-rsa AAAAB3 username@hostname
```

除这种格式外，ssh还支持IETF SECSH 公钥格式，像这样

```
---- BEGIN SSH2 PUBLIC KEY ----
AAAAB3 username@hostname
---- END SSH2 PUBLIC KEY ----
```

SSL
----
ssl工具的默认编码方式默认就是这种带BEGIN和END页眉页脚的块，块的内容称为PEM格式Privacy Enhanced Mail，是一种特殊的base64。从两端可以很清楚的看出内容的类型。RSA公钥类型是RSA PUBLIC KEY。没有任何前缀的PUBLIC KEY则代表X509公钥。

PKCS#8
----
私钥可以用PKCS8方式存储。私钥首先会使用PKCS#5的标准进行加密，然后将其进行base64编码，转换成为PEM格式进行存储。

题外话
----
虽然ssh的公钥格式自成一派，但它的私钥却遵循了PEM格式，标识符OPENSSH PRIVATE KEY。也意味着openssl工具可以操作ssh私钥。

PKCS是Public-Key Cryptography Standards的意思，它是RSA公司提出的公司私有规范，共15条。但由于RSA公司的行业影响力大，部分规范也被RFC和openssl软件支持。除了#8外，#7和#12是影响很大的标准，PKCS12可以看做是PKCS7的扩展，在PKCS12中可以存储证书，私钥或者CRL。和PKCS7相比，PKCS12可以额外存储私钥。