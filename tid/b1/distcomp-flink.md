# 20 Flink引擎学习

## 数据集

Flink和Spark都采用了数据集（算子）+SQL方式提供编程接口，SQL上手简单但能力受限，而数据模型则相对难学但也更强大。

|  |  基础会话（构建数据集） | 表会话（可执行SQL） | 数据集类型 |
| --- | --- | --- | --- |
| Spark | SparkContext | SparkSession | RDD |
| Flink | StreamExecutionEnvironment | StreamTableEnvironment | DataStream |

既然是数据集，肯定就有数据来源，可以从文件或表映射，也可以从无限流的连接映射出来，一旦映射后就只能基于这个原始的映射源计算。

而SQL语句都不依赖数据集，属于会话级的接口，因为SQL是在一段文本中操作多个数据源，所以显然不会被绑定到某个特定的数据集。

StreamTableEnvironment能提供Table和DataStream之间的互转。同样的，基本废弃不用的BatchTableEnvironment则提供了DataSet和Table的互转能力，只是随着DataSet的逐渐消亡，可以不用管这种运行环境。

从Flink 1.9开始有两种planner：old 和 blink。blink实现了流批一体，因此将批处理视为流式处理的特殊情况。所以blink不支持表和DataSet之间的转换，批处理作业将不转换为DataSet应用程序，而是跟流处理一样，转换为DataStream程序来处理。因为流批统一，Blink planner也不支持BatchTableSource，而使用有界的StreamTableSource代替。

Table 总是与特定的 TableEnvironment 绑定。不能在同一条查询中使用不同 TableEnvironment 中的表，例如对它们进行 join 或 union 操作。

Table API中表到DataStream有两种模式：

* 追加模式（Append Mode）：用于表只会被插入（Insert）操作更改的场景。
* 撤回模式（Retract Mode）:用于任何场景。有些类似于更新模式中Retract模式，它只有Insert和Delete两类操作。得到的数据会增加一个Boolean类型的标识位（返回的第一个字段），用它来表示到底是新增的数据（Insert），还是被删除的数据（老数据，Delete）。

## 运行时与调度

采用经典的Master-Work模型，Master会创建App进程，包含了三个组件，Dispatcher、ResourceManager和JobManager。Dispatch接收客户端请求，并创建出Job。Job根据任务生成Graph并向Resource申请资源。Resource有多种实现，可以是Local，也可以借由Yarn或K8S管理资源。

每个Work（TaskManager）是一个JVM进程，进程中的task将共享TCP连接和心跳消息。启动的TaskExecutor跑在空闲的TaskSlot（线程）上，一个拥有3个slot的Task，会将内存平均分成三份给每个slot，slot数量通常和CPU数相同。Executor和Slot都通过Resource来分配。

由于流批一体，Flink的调度策略也适用于不同类型的计算，有三种实现：

* Eager：适用于流计算，同时调度所有的task，对数据不终结的流而言，这种方式很自然
* LazyFromSources：适用于批处理，当上游数据处理完，调度下游数据。如果不lazy的话，计算效率会差
* PipelinedRegion：以流水线的局部为粒度进行调度

### 数据传输

Region要解决什么问题？这就要回到适合流批作业的不同数据传输机制（shuffle）

* Pipeline： 上下游Task之间直接通过Netty进行网络传输，因此需要上下游同时运行，适合流。又细分了是否有Bounded模式，区别在于是否限制网络缓冲的数量
* Blocking： 上游Task会首先将数据进行缓存，下游Task去取数时上游作业甚至可以停掉，互相不依赖对方的存活，适合批

基于这两种类型的传输，Flink将ExecutionGraph中使用Pipeline方式的Task子图叫做Region，从而将整个Graph划分为多个子图。

Pipeline方式也存在缓存，但又要考虑实时性，于是就有了基于信用的流量控制机制（Credit-Based），来降低延迟，工作原理：

1. 发送端将自己缓冲区积压的数据大小加入到发送的数据当中，一并发给接收端
2. 接收端接收到发送端发过来数据之后，根据其缓冲区积压的数据大小，生成一个信用值，并将信用值返回给发送端
3. 发送端会根据信用值所限定的范围，尽可能的多传输缓冲区数据

如此，每个发送端都被授予一个信用值，如果某发送端数据积压过多，那么它所被授予的信用值，就能够使之尽量多发送数据，从而减少积压量，这种机制会在出现数据倾斜时很好的分配网络资源。

除了基于信用的机制外，任务链机制更能直接减少数据传输的开销，如果上下游两个Task的并行度相同并且满足其它条件，会将这两个Task合并，直接在内存中复用数据。
