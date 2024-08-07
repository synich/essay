# 01 hadoop体系理解

hdfs师从gfs的设计理念，也是面向大数据量、高吞吐的场景设计，因此单个文件默认设置为64M。而过多的小文件也会给元数据管理带来极大的负担，甚至导致OOM。

hadoop除了存储还包含了调度，在容器环境从上向下分了若干层

* DataNode: 同时还执行NodeManager进程
* ResourceManager: 对应yarn，管理service和node两个维度。node看到datanode上的节点内存和vCore数量。
* NameNode: 存储了hdfs所有的元数据，hdfs命令也在这一层执行，同时hdfs还是很多daemon的执行入口。1.0时代存在单点问题，2.0支持主备模式，仅主节点提供读写，主备切换控制的ZKFailOver也运行在这里
* JournalNode: 为了支撑NameNode的主备切换，需要有共享存储层，业界不同厂商提出了多套方案，最后Cloudera的QJM方案被合入trunk，就是JN层。使用EditLog机制，用2N+1个副本保存数据，允许N个节点失效。当NameNode发生主备切换时，备机要从JN上同步完数据后才能工作

## 配置文件

分为core、hdfs、mapred、yarn四个核心xml配置，start-dfs和start-yarn命令可以启动服务。

## hdfs元数据管理

Namenode主要维护两个元数据文件

* fsimage: 保存了最新的元数据检查点，包含了整个HDFS文件系统的所有目录和文件的信息。对于文件来说包括了数据块描述信息、修改时间、访问时间等；对于目录来说包括修改时间、访问权限控制信息(目录所属用户，所在组)等。简单的说，Fsimage就是在某一时刻，整个hdfs 的快照，就是这个时刻hdfs上所有的文件块和目录，分别的状态，位于哪些个datanode，各自的权限，各自的副本个数等。注意：Block的位置信息不会保存到fsimage，Block保存在哪个DataNode（由DataNode启动时上报）。
* editlog: 主要是在NameNode已经启动情况下对HDFS进行的各种更新操作进行记录，HDFS客户端执行所有的写操作都会被记录到editlog中。

写入元数据： 在NameNode运行时会将内存中的元数据信息存储到所指定的文件，即${dfs.name.dir}/current目录下的fsimage文件，此外还会将另外一部分对NameNode更改的日志信息存储到${dfs.name.dir}/current目录下的edits文件中。fsimage文件和edits文件可以确定NameNode节点当前的状态，这样在NameNode节点由于突发原因崩溃时，可以根据这两个文件中的内容恢复到节点崩溃前的状态，所以对NameNode节点中内存元数据的每次修改都必须保存下来。如果每次都保存到fsimage，效率就特别低效，所以引入编辑日志edits，保存对元数据的修改信息，也就是fsimage文件保存NameNode节点中某一时刻内存中的元数据（即目录树），edits保存这一时刻之后的对元数据的更改信息。

读取元数据： 启动NameNode节点时，从镜像和编辑日志中读取元数据。

因此fsimage和editlog是互相配合，这又引申出另一个进程SecondaryNameNode，主要有两个作用，一是镜像备份（不是NN的备份，但可以做备份），二是日志与镜像的定期合并。

## Yarn

前身是1.x时代的JobTrack和TaskTrack，其中JobTrack是单点而且既管资源也管任务调度，职责过多，所以演化出了二代目Yarn，不仅做了水平拓展，还对功能做了拆解，Yarn最核心的组件是ResourceManager和NodeManager，通过yarn rmadmin -getAllService看到rm1和rm2两个节点的active/standby状态，因此不会有单点故障。

任务提交流程

1. 客户端向ResourceManager提交任务请求，如果条件具备，则返回一个JobID和临时的hdfs路径，状态NEW或NEW_SAVING
2. 客户端向hdfs路径上放好运行所需的资源，进行job正式提交，状态SUBMIT
3. RM将job请求转交给调度器，调度器确认客户端有队列权限且资源足够分配AppMaster，状态ACCEPT
4. ResourceManager在NodeManager中找一个物理节点，启动AppMaster（如spark的driver和flink的jobManager），状态RUNNING
5. AppMaster继续向RM申请资源，确保NM上可以创建任务；然后找NodeManager创建Container，并执行子节点任务

注意第4步状态虽然是RUNNING，但只有AM在运行，分布式任务往往要启动更多子节点，但从YARN的角度无法知道子节点是否在运行，也因此会限制AM占用资源的上限，否则会出现AM互相等待而任务永远无法启动的窘境。

因为都基于yarn执行任务的流程框架，所以spark和flink的运行过程是非常相似的。

## Hive的数据分区

对关系型数据库而言，随着数量的扩大，计算会越来越困难，这时将数据按一定规则拆分，减少每块的大小，从而提升速度。分区将数据切分，每个分区都是全部数据的一部分，整体构成全部数据。

对hive而言，由于不能update，所以只能每次全量更新，这就导致离线计算特性，每天全量计算一遍数据，因此hive的分区是update的一种替代，更类似时序的概念，不同的分区对应hdfs不同的目录，只表示新旧，不会将数据切分，每个分区都是全量。