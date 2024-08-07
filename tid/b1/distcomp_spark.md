# 10 Spark学习手记

## 组件构成

作为一个分布式系统，物理节点分为master和worker节点，master调度，worker计算。

运行职责，即进程级的分为driver（属于master）和executor（属于worker），另外还有类似接口协议的进程cluster Manager（和driver通信）。既然是接口，就有多种实现，常见的有spark clusterManager（standalone和local cluster两种运行模式）、yarn clusterManager（spark on yarn） 和mesos clusterManager（spark on mesos）。

driver端执行main函数，并创建SparkContext，这是Spark启动最重要的类，包含两个必须设置的属性：master和appName。Executor并行计算，是一个执行Task的容器，初始化程序要执行的上下文SparkEnv，解决应用程序需要运行时的jar包的依赖，加载类。SparkContext可以创建RDD。

## RDD

这是Spark中最早，也是最基础的计算元素，可以理解为元素无序的向量（数组）。由于不可变性，每个RDD在Spark会话中都会被赋予一个惟一ID，这些ID又构成计算的链路，在计算出错需要重算时可以方便地恢复。

RDD所有元素的类型相同，分为2种值类型

1. 单Value类型：存放简单类型，如int，string
2. Key-Value类型：整个值的类型称为Row，Row类型的第一列是key，剩下的是values，可以想象成lisp的list，key和value分别对应car和cdr操作。针对key可以进行lookup、join等运算。当value包含的内容很多时，为了更细粒度地操作，还可以把Row类型转换为DataFrame，就能对每一列单独指定操作方法。

RDD的五大属性和若干种实现

1. partitions(分区数量)
2. partitioner(分区方法，可以为None)
3. dependencies(依赖关系): 运算就是在多个RDD间的变换，如果一个父RDD变换后得到多个子RDD，就是宽依赖，也称为shuffle；一个父RDD只得到一个子RDD，则称为窄依赖。
4. compute(获取分区迭代列表)
5. preferedLocations(优先分配节点列表)

## RDD的操作和任务执行过程

大多数文章都把RDD的操作分为transform和action两类，trans还能再细分，这里采用细分后的4种类型。

1. 创建操作（creation）：pyspark只提供了parallelize；scala还提供makeRDD
2. 转换操作（transformation）：从一个RDD得到另一个RDD，绝大部分都是此类操作
3. 控制操作（control）：persist和cache，优化性能
4. 行为操作（action）：将惰性计算进行求值，比如collect, count, take, save, foreach, reduce。特别要提的是，**reduce是行为，但reduceByKey是转换**，二者不可混为一谈。

区分的依据是：trans不会马上执行，而是等到action才会触发计算。为什么trans不触发计算呢，因为计算的成本太高，计算过程要尽量合并，很多中间步骤，在不急于显示结果时，没必要计算。以groupByKey为例，分组不是最终目的，对分组做的聚合运算才是用户真正想要的。因此分组时，只需要把计算过程规划好，不必急于把计算任务派发到数据分区。

RDD的分类，体现在任务运行粒度上，就分为大小两种，app(1个) > job > stage。每当代码中遇到transformation（意味着要创建新的RDD），会继续分析，直到遇到action类操作，就会产生一个job来真正执行所有的transfomation和这个action。job中如果有shuffle操作（trans和action都会产生shuffle），就会产生前后两个stage（HDFS读写文件是stage内的操作，不会产生切分）。也可以说每个stage内部是窄依赖，会做fusion优化，而stage之间则是宽依赖。每个stage处理的rdd数据，又会根据其有多少个 partition，运行相同个数的 task（每个task是一个线程），每个 task 只处理一个 partition 上的数据。所以一个stage也叫一个taskset。

任务执行过程分4步

1. 解析代码中的RDD操作，根据转换关系形成DAG图
2. 将DAG图交给DAGScheduler组件（包含在SparkContext中）进行逻辑拆分，具体做法是从最后一个RDD向前回溯，遇到action算子切分出一个job，每个job内根据shuffle类划分stage
3. 拆分后的stage链，交给TaskScheduler（包含在SparkContext中）做物理执行，分派到具有空闲资源的worker结点
4. work对收到的每个调度，启动一个线程执行task，结果结果返回给TaskScheduler，最终在driver端汇总

### 分区的解释

RDD是个逻辑概念，它的数据通常会分布在多个worker节点，拆分的个数由partition决定，partition数量既可以大于，也能小于worker数量，计算一个真实有数据的partition对应一个task任务。分区的数量，如果直接创建，可以在参数指定，如果是从HDFS读取，则由文件分块数量决定，最小是2，大的有十几甚至上百。题外话，正因为数据是分散在多个worker节点，如果想要看到全貌，要用collect()，方法命名非常到位。

RDD实现类举例

1. MapPartitionsRDD
2. ParalellCollectionRDD
2. ShuffledRDD
3. ReliableCheckpointRDD

## 从RDD到DataFrame的转变

Spark最初只有RDD做为通用的计算接口，也称为Spark Core，并没有SQL功能。因为无类型，导致性能优化遇到瓶颈，在1.3版本演化出了DataFrame，天然和SQL相近，此时整个项目的核心也迁移到Spark SQL。为了管理库和表元数据，在SparkContext基础上，加入SQLContext（是个InMemory实现，2.0版本还有一个外部源实现HiveContext），就变成了SparkSession。session类有个catalog成员可以查看映射的库和表。SQL也是经由DataFrame最后转成RDD才执行。2.0版本只能指定一个catalog，3.0版开始支持multiple catalog。

## DataFrame

是Row类型RDD被绑定schema后的性能优化版。RDD用.toDF转化为DF（简单类型的RDD不可以转化为DF），每个DF也可以通过.rdd属性得到对应的RDD实例，通过.schema得到结构。多说一句，RDD的toDF方法，其实是构建SparkSession的时候，硬塞在RDD上的猴子方法，最终调用的还是SparkSession.createDataFrame方法。由于是从RDD转化而来，分区数和RDD一致。

运行DataFrame算子，还是会编译为RDD后才真正执行，因此RDD仍是Spark惟一的运行时，可以将DataFrame比作编译过程的中间代码优化器。对开发者来说想要手写出和DataFrame编译成的RDD相同性能的代码，困难且无必要，因此社区鼓励大家迁移到DataFrame。