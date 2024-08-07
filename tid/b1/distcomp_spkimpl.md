# 13 分布式计算在Spark上的实现

分布式计算是个很早的课题，在一个集群环境下，必然会利用多个节点共同计算，注意不是同时计算，因为数据会有倾斜，只是会尽可能多地把节点利用起来。当前技术在对待多个节点的身份并不对等，都会分为主从类型，各自叫法不同

| - | hadoop | spark | flink |
| ---- | ---- | ---- | ---- |
| 主节点 | JobTracker | Driver | JobManager |
| 从节点 | TaskTracker | Executor | TaskManager |

## MapReduce与shuffle

Hadoop普及了MapReduce概念，其实map和reduce是很大的概念，Spark在宣传上最大的特点是RDD，但计算模型仍然可以划分为map和reduce两个阶段。经常在Spark听到shuffle术语，其实Hadoop也有这个概念。它是数据在Map Task和Reduce Task之间流动时的一种重新分配，是否进行shuffle由数据的依赖关系决定。shuffle有以下3种

* 流式shuffle：左端Task每当处理完成一条数据，就序列化到缓存，并立刻传送给右端的Task。
* 批式shuffle：左端Task每当处理完成一条，序列化到缓存（缓存不够需要压到磁盘），但并不立刻传送给右端的Task，而是等到所有数据处理完成之后才传送给右端的Task。Hadoop和Spark采用的模式与此类似，不过是右端主动来取，而不是左端主动发送。
* 兼容shuffle：左端Task每当处理完成一条，序列化到缓存，等到缓存满了之后再传送给右端的Task。

理论上说，在兼容shuffle模式下，如果缓存仅容纳一条记录，那么就是流式shuffle；如果缓存无限大，那么就是批式shuffle。实际中，通过设置缓存块超时值：超时值为0，则为流式处理，超时值无限大，则为批式处理。Flink可以设置数据传输的模式。

## 内存划分

Hadoop饱受诟病的是节点间的数据交换依赖HDFS，节点把数据落盘导致速度缓慢，Spark和Flink都以不同的方式来解决该问题

| - | 负责执行的内存块 | 负责缓存的内存块 | 其它内存块 |
| --- | --- | --- | --- |
| Spark | Execution Memory | Storage Memory | other |
| Flink | Memory Manager | Network Buffer Pool | Remaining Heap |

其中负责缓存的内存块就是上一个节点计算完成并等待下一个节点来取数的的暂存区域，SparK由下游Task来取数据，而Flink是上游主动向下游发送数据，如果下游没有空间上游就不推送同时也会停止消费。因此Flink天然没有反压的问题。

## 计算的序列化

分布式计算的关键是调配代码和数据，由于数据量远大于代码，因此核心是**代码分发到各个数据节点**。由于计算的灵活性加上节点处理器的不确定性，要求代码是平台无关且可灵活序列化，在MR时代采用分发Jar来实现计算的分布，而Spark则利用Scala语言更进一步实现函数的分发。Spark为了扩大使用面，和Python做了深度整合，因此也必然要求Python代码能以函数为粒度实现编译和分发。Python原生的序列化库Pickle会把函数和类以引用的方式序列化，这在分布式环境下显然是不够的，于是最早由PiCloud公司（13年合并到了DropBox）扩展实现了CloudPickle库，它能将函数和类序列化成值，解决了分布式环境下的分发问题，当时的CloudPickle只能序列化Py2，Spark继续扩展使它能支持Py3和PyPy。

理论上CloudPickle可以序列化任意Python对象，但Spark的计算框架要求Driver和Executor各司其职，因此不允许Python对SparkContext序列化（自然也就不允许对SparkSession序列化），具体的方式是在`__getnewargs__`方法抛异常来提示用户。这也解开了我最初对collect函数返回结果给Driver的疑问，既然collect不能在Executor调用，那么collect的发起者只能是Driver，结果当然也返回Driver。

Spark和Python的交互在进程级别是socket通信加Arrow的内存列式存储，而语言层面则是udf装饰器，udf有几个重要的参数：函数本体、返回类型、执行类型和是否确定性。前两个很直观，解释下后两个参数。

PySpark的执行类型有`BATCHED_SQL`、`SCALAR_PANDAS`、`GROUP_MAP`、`GROUP_AGG`、`WINDOW_MAP`多种。BATCHED是最简单的Row-at-a-time，而后面几种则是对Column或DataFrame进行处理与合并，效率会高一些。而确定性则是一个比较冷门的概念，输入输出确定的函数称为确定性，而即使输入确定输出也不确定的则称为不确定性，典型的如日期函数或统计总量。之所以要特意强调这点，是因为执行器会对确定的udf做一些优化合并，如果写的udf是非确定性但引擎不知道，可能会引起结果不正确。这个是理论上的解读，我没有实际遇到过，没有很深的理解。