# SHA家族的哈希算法

由于MD5早就被证明存在碰撞攻击，安全性在严肃场合肯定是不够的，SHA-1(160bit)作为替代品已被越来越多的观点认可，但是MD5有一个理论上的优点，计算长度无上限，而SHA家族的长度会限定在2^64-1或2^128-1内。SHA是一个很大的哈希算法家族，到目前共有0、1、2、3这四类。

* SHA-0：这个很少提及，原因是MD5被成功碰撞后，几乎同时SHA-0也被碰撞，所以没有实际应用
* SHA-1：只有SHA160一种，不过目前在理论会产生碰撞，17年初Google发了paper声称找到了碰撞方法，git在计算对象摘要时用了SHA-1，但git用它作为完整性校验，并不在意碰撞。
* SHA-2：共有SHA-224/SHA-256/SHA-384/SHA-256这四种细分类型，224和384分别是256和512的截短版本，至少我还没有看到可靠的质疑的消息，Bitcoin计算交易哈希、MerklerRoot时，用的就是SHA-256算法
* SHA-3：虽然SHA-2没有明确的证据证明不安全，但NIST(美国国家标准技术研究所，也发布AES、若干种椭圆曲线等其它加密技术)还是未雨绸缪地于2007年开始征集新的下一代密码Hash算法，最终在2012年10月2日，Keccak被选为NIST竞赛的胜利者，对外称为SHA-3，Keccak和SHA-2在设计上存在极大差别(海绵结构 VS Merkle-Damgard)，支持256，384，512多种长度的输出。以太坊出现时间在SHA-3之后，用的是SHA-3算法

## HMAC与HASH

Go语言规整地把计算HASH的方法统一定义成hash.Hash接口，hmac.New(hash.Hash, []byte) hash.Hash。可以任意组合，不需要为每种HMAC增加特定方法。