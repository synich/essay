# Bitcoin中三种哈希的区别与关联

区块链的不可篡改性是基于哈希函数的特性，Bitcoin中有3个地方用到了哈希的特性(都是SHA256)，分别是区块的哈希、区块的merkler树的哈希、每个交易的哈希。

比特币实现区块链的数组结构比较简单，区块构成单向链表，区块结构的整体概貌：
<pre>
struct Block {
  uint32 blockSize;
  struct BlockMeta; //80 bytes
  varint transactionCount;
  struct Transaction* transaction;
};
</pre>
每个区块含有一到N个交易，是个可变长结构，但不能无限增大，目前代码中人为地把区块大小限制在1M(分叉的BCC是8M)。这里还看不出哈希，接下来看看BlockMeta，这里面包含了两个Hash。

<pre>
struct BlockMeta {
  uint32 version;  // 最初是1，12年11月更新到2，最晚在17年已更新到0x20000002(隔离见证BIP141)，还有些0x20000012(BIP141和BIP91)。
  uint256 parentHash;// 指向前一个区块，以0x000000开头(至少八个0，工作量证明)，Genesis块这个位置全为0。
  uint256 merklerRoot;// 该块中所有交易通过构造merkler树生成的计算和，DoubleSHA256。
  uint32 timestamp;
  uint32 difficulty;//每2016块重新计算一次，早期都是1，直到第16个更新周期，即高度32256时第一次变化到1.18，后面一直在增加
  uint32 nonce;
};
</pre>
parentHash是把区块形成区块链的关键字段，计算这个Hash值异常困难，需要数亿次(甚至更多)地变换nonce值，进而使算出的Hash值小于difficulty。这也构成了Bitcoin共识机制PoW的基础，谁能算出这个值，网络上所有节点就承认TA挖到了这个块，从而获得了coinbase的奖励。但是区块并不保存自身的Hash值，因为一旦尝试出了nonce使得本区块符合链的条件，只要向全网广播这个刚算出的区块，其它所有看到这个广播的矿工都会保存这个区块的哈希。

merklerRoot也是SHA256，不过这个计算就没区块哈希这么变态了。区块只是个容器，重要的还是其中的交易，merkler树就是记录所有交易生成的摘要，使得不论多少笔交易，都只需要很少且恒定的数据，就能证明交易的存在。它也是SPV的验证基础，这部分内容还没看明白，以后再补充。如果区块只包含一笔交易(即coinbase交易)，merklerRoot就等于这个coinbase交易的ID(哈希)，如果有两笔以上交易ID，则两两作字符串拼接，并通过Double SHA256反复循环直到算出根值。

每笔交易都是可变长结构，包含的输入和输入数量至少为1，无上限。
<pre>
struct Transaction {
  uint32 version;
  varint tx_in;
  void* in;
  varint tx_out;
  void* out;
  uint32 locktime;  // 0指立即执行，1~5亿指到这个区块高度为止，5亿以上指时间戳(但4字节能表示的时间范围有限，难道不是问题吗？)
};
</pre>

交易结构并不包含哈希，只有输入才包含哈希。
<pre>
struct tx_in {
    uint256 pre_txhash;   //指向前一个交易的哈希
    uint32 pre_txout_index;// 定位到该交易的第几个output，必须是UTXO，否则会因余额不足而校验失败。
    varint scriptLen;
    void* script;    // 解锁脚本,signature+pubkey
    uint32 sequence;
};

struct tx_out{
    uint64 value;
    varint scriptLen;
    void* script;  // 锁定脚本
};
</pre>
由于Bitcoin没有账户的概念，只有UTXO，可以理解成一张支票吧。如果想交易，即证明有合法的input，就要向前找到一个或多个可用(未花费)的output，输入的哈希就用于寻找这个output。但交易可能不止一个output，所以还需要index来标识是第几个output，有了这两个值，就能惟一确定到UTXO，各节点也能验证余额是否足够。

上面说了Bitcoin的结构，接下来对比下Bitshares的区块结构。Bitshares只有区块摘要的哈希算法用了SHA256，而区块ID、交易ID和MerklerRoot用的都是RIPEMD160。计算Merkler时的策略也有细微不同，Bitcoin在计算奇数个叶子节点时，会把最后一个节点复制一份，且每两个叶节点在向上计算上一级摘要用的是Double SHA256；而BitShares是直接把最后一个孤立节点放到下一轮计算，只用了Single SHA256，少了一半计算量。