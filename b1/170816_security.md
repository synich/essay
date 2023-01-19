# RSA/DSA/EC三种算法记录

从Openssl的命令行操作来一探这三种非对称加密的端倪。三者的操作命令并不对称，支持的列表如下

* RSA：genrsa/rsa/rsautl
* DSA：dsaparam/gendsa/dsa
* EC：ecparam/ec

RSA说明
----
生成私钥的命令是`openssl genrsa -out xxx.pem 2048`生成2048的私钥，但文件并不是2048bit，因为RSA私钥包含的内容很多，要看私钥文件的具体内容，可以用`openssl rsa -noout text xxx.pem`显示，从内容可以看出，modulus和privateExponent是2048bit，publicExponent是0x10001，其它的prime1/prime2等都是指定位长的一半，即1024bit。同理如果genrsa指定的长度是1024，modulus和privateExponent是1024bit，prime1/prime2等都是512bit。modulus和publicExponent共同构成了公钥文件的内容。RSA的加密会用到padding算法，解密必须指定相同的padding才能成功，因此其使用上的复杂度要高于椭圆曲线。

使用openssl rsautl系列命令可以加解密。公钥加密私钥解密用`-encrypt -decrypt`，私钥加密公钥解密则是`-sign -verify`这对命令，但是libressl版的openssl支持用私钥调用-encrypt，却无法解密，不知道算不算bug。

进行加密时为防止同样的明文得到的密文一样，都会填充数据，1.5版本填充方式适用于加密和签名，而OAEP只适用于加密，PSS只适用于签名。

RSA的数字签名应用非常广泛，被固化到U盘作为签名私钥，有种更新的算法RSA-FDH(Full Domain Hash)。PDF的1.5版本只支持2048位的RSA签名。

DSA说明
----
DSA生成公私钥比RSA要多一个步骤，先用dsaparam生成参数文件，这份参数文件可以被多个用户共用，生成每个用户各自的公私钥对。决定签名结果的因素有HASH算法和KEY的长度（推荐1024以上），生成参数命令`openssl dsaparam -out dsaprm.pem 1024`。可以看到生成文件就包含P/Q/G三个大数。P和Q都是素数，且P-1必须是Q的整数倍。

用dsaparam指令的`-genkey`也能直接生成公私钥，独立的genkey指令则可以对生成的公私钥文件进行AES/Camellia加密。这样生成的文件内既有公钥又有私钥，显然不适合分发，需要把公钥提取出来，命令`openssl dsa -in dsakey.pem -out dsapub.pem -pubout`，坑爹的是`-pubout`参数在dsa的帮助命令里居然没有，但从rsa命令的帮助能看到。。。

有了公私钥文件，接下来可以选择一个文件进行签名和验证。Openssl并没有直接提供类似dsautl命令验证签名，需要用dgst指令完成。签名命令`openssl dgst -sha1 -sign dsakey.pem -out sign.dat yourfile`。其中sha1可以换成任意想要的摘要算法。比如选用了1024bit的私钥，生成的sign.dat是46bytes，DER编码的二进制文件，解码DER的话能得到两个大数R和S（位数一样），这一点和RSA的签名不同，两个大数的验证算法和RSA不同，这也是为什么DSA不能用来做加密的原因。验证签名命令`openssl dgst -verify dsapub.pem -sha1 -signature sign.dat yourfile`，通过会显示Verified OK，反之显示Verified Failure。

DSA的密钥强度标准和RSA是一样的，都推荐2048bit。

EC椭圆曲线
----
共有三种用法

1. Elliptic Curve DSA，用椭圆曲线做DSA，数字签名。
2. ECDH，用椭圆曲线做密钥交换。
3. ECIES，椭圆曲线的公钥加密。

Openssl的命令行工具支持前两种，并内建若干条曲线，比如下载的libressl自带了90条曲线，选好曲线的名字如secp256k1，则参数值（prime/A/B/Generator/Order/Cofactor）就确定了。曲线有prime域和binary域两种。域会有位宽，通过openssl的ecparam生成的参数长度和位宽正相关，但并不严格地成线性关系。

使用椭圆曲线和DSA类似，也必须要两个步骤。先确定一条曲线参数，基于这条曲线参数生成公私钥。但Openssl的命令行没有genec指令，都是ecparam指令。

1. 首先用`openssl ecparam -name secp256k1 -out secp256k1.pem`先生成一条曲线参数，生成的参数文件内容只有8字节（Base64后12字节）。如果直接用`openssl ecparam -text -noout`只能看到ASN1 OID: secp256k1描述，需要再加上`-param_enc explicit`参数，就能看到域类型和曲线的A/B值等很多值。前面提到了因为曲线描述一旦确定，则所有参数就确定了，所以这些参数我理解，并不是保存在参数文件，而是硬编码在Openssl内。所以8字节的参数文件看上去就有很多输出了。但是这样会有兼容性问题，因为具体的参数硬编码在Openssl程序内，那么高版本程序新加入的曲线，在低版本就会出现无法解析的错误。要避免这种情况，可以通过生成时加上`-param_enc explicit`，这样生成的曲线文件就会大很多，也完整很多。

2. 有了参数文件，就可以生成私钥了，命令`openssl ecparam -genkey -in secp256k1.pem -out key256k1.pem`。同样的，要避免高版本和低版本的配套问题，加入`-param_enc explicit`参数就可以了。其实这步和上一步合并也没有问题。通过私钥文件生成公钥的命令是`openssl ec -pubout`，和DSA一样，`-pubout`在帮助中看不到。

使用椭圆曲线进行签名和验证和DSA类似（但不确定是否就是ECDSA），签名`openssl dgst -sha1 -sign eckey.pem -out ecsign.dat yourfile`，验证`openssl dgst -sha1 -verify ecpub.pem -signature ecsign.dat yourfile`。选用secp256k1曲线的签名结果是71字节以DER编码的文件。简单说明一下：

首字节是0x30，第二个字节是0x45，十进制69表示该字节之后的文件长度，69\+2=71能够和文件总长度对上。第三个字节固定是0x02。第四字节0x21表示R的长度，偏移33字节后又是0x02，后一字节0x20表示S的长度，到此文件结束。不过没搞明白的是通过程序看到的R和S长度一样，为什么保存到文件R和S长度就不一样了。

最后说下椭圆曲线的操作是点在操作，计算用加法，计算结果判断是否无限或在曲线上。

椭圆曲线的操作体现在C函数的接口，则是`EC_KEY`和`EC_GROUP`这两个重要的概念。一条选定参数的曲线就是一个group，用`EC_GROUP_new_by_curve_name`获取一个group，从头文件找枚举代表一种算法。
用`EC_KEY_new`创建新的key，这样的key虽然名字叫key但只是个空的容器，必须先和group关联。当然也可以用`EC_KEY_new_by_curve_name`一步生成绑定好的key。

key和group有了关联之后，才能调用`EC_KEY_generate_key`生成公私钥。私钥是个很大的素数，在OpenSSL表现为BIGNUM类型，可以用`BN_print`看结果。公钥则是点，是`EC_POINT`类型，这个类型不开放，所以不能直接打印，如果看源码，POINT内部包含了X和Y两个BIGNUM（其实还有个Z也是BIGNUM，但不确定有什么用）。比如secp256k1的私钥是256bit的数(并不要求是素数)，公钥是形如(X, Y)的点对，计算方式是
>Q(x,y) = K * G(x,y)

K就是256bit的大数，G随着椭圆曲线的确定是惟一确定的，对应ecparam的G参数。X和Y也都是256bit，所以公钥是512bit。比特币看不出来，但ETC的钱包采用的是HEX编码，容易看出pubKey的长度是privKey的两倍。

虽然公钥保存成512bit没有错，但其实忽略了椭圆曲线一个重要特性**对称性**。来看椭圆曲线的公式：
>Y^2 = X^3 + aX + b

只要知道公钥点的X，公钥点的Y就能通过开平方计算出来，只要再配合正负号，就可以知道完整的公钥点了。这个发现就是**压缩公钥格式**的来历，严格地说并不是压缩，只是去掉了一半冗余信息。甚至有人开玩笑地说中本聪不是密码学出身，否则怎么会一开始想不到要使用压缩公钥这种形式。

私钥生成后就可以做签名和验证了。不同算法sign得出结果的长度从`ECDSA_size`获取，从48到153字节不一而足。ECDSA签名的结果同样是两个大数R和S，且位数一样。R和S的长度取决于算法，范围跨越20到71，因此把这个范围乘以2，再转成DER编码，就和前面提到的48~153能关联起来了。

用椭圆曲线做密钥交换，即ECDH也很方便，BitShares的加密通信就是ECDH\+AES，ECDH的流程比较简单，A和B各自持有一对椭圆曲线的公私钥，交换公钥后，再用自己的私钥乘对方的公钥，得到的结果就可以用来做AES密钥。比DH的流程要容易理解。