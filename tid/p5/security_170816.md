# 非对称加密算法记录

非对称加密的理论基础来自于某个数学领域的难解问题，应用到密码学上，主要两大类。Openssl对它们支持很完善

* RSA: 大整数分解为两个质数难题，genrsa/rsa/rsautl
* EC: 椭圆曲线的离散对数难题，ecparam/ec

RSA在2010年前占据绝对统治地位，之后EC逐渐体现出优势，以后量子计算时间又会有新的算法替代EC。

## RSA

用`openssl genrsa -out xxx.pem 2048`生成2048位私钥，但文件并不是2048bit，因为RSA私钥包含的内容很多，要看私钥文件的具体内容，可以用`openssl rsa -noout text xxx.pem`显示，从内容可以看出，modulus和privateExponent是2048bit，publicExponent是0x10001，其它的prime1/prime2等都是指定位长的一半，即1024bit。同理如果genrsa指定的长度是1024，modulus和privateExponent是1024bit，prime1/prime2等都是512bit。modulus和publicExponent共同构成了公钥文件的内容。RSA的加密会用到padding算法，解密必须指定相同的padding才能成功，因此其使用上的复杂度要高于椭圆曲线。

使用openssl rsautl系列命令可以加解密。公钥加密私钥解密用`-encrypt -decrypt`，私钥加密公钥解密则是`-sign -verify`这对命令，但是libressl版的openssl支持用私钥调用-encrypt，却无法解密，不知道算不算bug。

进行加密时为防止同样的明文得到的密文一样，都会填充数据，1.5版本填充方式适用于加密和签名，而OAEP只适用于加密，PSS只适用于签名。

RSA的数字签名应用非常广泛，被固化到U盘作为签名私钥，有种更新的算法RSA-FDH(Full Domain Hash)。PDF的1.5版本只支持2048位的RSA签名。

### 独有的PEM文件头标识

几乎所有的公钥文件，其PEM头都是PUBLIC KEY，通过解码后的OID进一步确定类型；但RSA因为出现的早，除了这个之外，还独享一种格式RSA PUBLIC KEY，又被称为PKCS1，从编号上也能看出来正是因为RSA的发明，才打开了公私钥加密这个门类，可以说有奠基性意义。

## EC椭圆曲线

有三种用法

1. Elliptic Curve DSA，用椭圆曲线做数字签名，有逐渐取代传统DSA的趋势
2. ECDH，用椭圆曲线做密钥交换
3. ECIES，椭圆曲线的公钥加密

Openssl的命令行工具支持前两种，并内建若干条曲线，libressl自带了90条曲线。椭圆曲线按底层有限域区分，有prime域和binary域两种，2000年以前binary域使用得较多，近些看由于种种原因很少有人使用，而是转向prime域。域有位宽，通过openssl的ecparam生成的参数长度和位宽正相关，但并不严格地成线性关系。抛开位数和选取参数的差异，重要的就两类

1. Random随机曲线，典型代表secp256r1(又叫P-256或prime256v1，但都有P，表示prime域)。是TLS等众多加密算法首选，根据选点的不同，还有brainpool/SM2等变体，数学性质和强度相同
2. Koblitz曲线，效率更快，典型代表secp256k1（带p，同样表示prime域）。主要是比特币等加密货币使用。Koblitz也有binary域曲线，但已经很少使用

选好曲线的名字后，参数值prime/A/B/Generator/Order/Cofactor就确定了。使用椭圆曲线和DSA类似，也必须要两个步骤。先确定一条曲线参数，基于这条曲线参数生成公私钥。但Openssl的命令行没有genec指令，都是ecparam指令。

1. `openssl ecparam -name secp256k1 -out secp256k1.pem`生成一条曲线参数，生成的参数文件内容只有8字节（Base64后12字节）。如果直接用`openssl ecparam -text -noout`只能看到ASN1 OID: secp256k1描述，需要再加上`-param_enc explicit`参数，就能看到域类型和曲线的A/B值等很多值。前面提到了因为曲线描述一旦确定，则所有参数就确定了，所以这些参数我理解，并不是保存在参数文件，而是硬编码在Openssl内。所以8字节的参数文件看上去就有很多输出了。但是这样会有兼容性问题，因为具体的参数硬编码在Openssl程序内，那么高版本程序新加入的曲线，在低版本就会出现无法解析的错误。要避免这种情况，可以通过生成时加上`-param_enc explicit`，这样生成的曲线文件就会大很多，也完整很多。

2. 有了参数文件，就可以生成私钥了，命令`openssl ecparam -genkey -in secp256k1.pem -out key256k1.pem`。同样的，要避免高版本和低版本的配套问题，加入`-param_enc explicit`参数就可以了。其实这步和上一步合并也没有问题。通过私钥文件生成公钥的命令是`openssl ec -pubout`，和DSA一样，`-pubout`在帮助中看不到。

### 数学定义

椭圆曲线的公式：
>Y^2 = X^3 + aX + b

椭圆曲线的非对称性体现在数学式上
>Q(x,y) = k * G(x,y)

Q是公钥，k是私钥，正是利用了计算kG乘法容易(其实是定义在Galois Field上的乘，不是数字意义的乘)，而从公开的Q和G反推出k极难的数学特性。

公钥是形如(X, Y)的点，`EC_POINT`类型，这个类型不开放，所以不能直接打印，如果看源码，POINT内部包含了X和Y两个BIGNUM（其实还有个Z也是BIGNUM，但不确定有什么用）。

私钥是个大整数(倍数)，并不要求是素数。在OpenSSL表现为BIGNUM类型，可以用`BN_print`看结果。

G也叫基点，随着椭圆曲线的类型而确定（理论上满足基点条件的G很多，但既然安全强度相同，为了标准化都是一种曲线固定一个公开的G）。X和Y也都是256bit，所以公钥是512bit。比特币看不出来，但ETC的钱包采用的是HEX编码，容易看出pubKey的长度是privKey的两倍。虽然公钥保存成512bit没有错，但其实忽略了椭圆曲线的重要特性**对称性**，只要知道公钥点的X，公钥点的Y就能通过开平方计算出来，再配合正负号，就可以知道完整的公钥点了。这个发现就是**压缩公钥格式**的来历，严格地说并不是压缩，只是去掉了一半冗余信息。甚至有人开玩笑地说中本聪不是密码学出身，否则怎么会一开始想不到要使用压缩公钥这种形式。

### API定义

椭圆曲线体现在C函数的接口，则是`EC_KEY`和`EC_GROUP`这两个重要的概念。

一条选定参数的曲线就是一个group，用`EC_GROUP_new_by_curve_name`获取一个group，从头文件找枚举代表一种算法。用`EC_KEY_new`创建新的key，这样的key虽然名字叫key但只是个空的容器，必须先和group关联。当然也可以用`EC_KEY_new_by_curve_name`一步生成绑定好的key。key和group有了关联之后，才能调用`EC_KEY_generate_key`生成公私钥。

公私钥生成后可以做签名和验证。不同算法sign得出结果的长度从`ECDSA_size`获取，从48到153字节不一而足。ECDSA签名的结果同样是两个大数R和S，且位数一样。R和S的长度取决于算法，范围跨越20到71。
