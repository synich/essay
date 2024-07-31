# 11 PySpark分析

## 执行过程

常用的有local和yarn两种模式，写代码或调错阶段，无特殊情况用local，速度快很多。

pyspark和scala的spark不同在于，某些情况下数据会从jvm回传给py，这个回传的过程是怎么样的？首先，Spark会先把所有py文件放到此次任务driver端所在的节点，比如我的环境放在 /yarn/nodemanager/usercache/xxx/appcache/application_xx/container_xx_01/main.py 目录，启动py的命令是`path/bin/python main.py --arg=xx`。同时spark会在driver放一个pyspark.zip，解决Py与spark集群通信的问题。driver端任务运行一段时间后，如果发现计算需要把数据传递给executor上的python，就会启动`path/bin/python -m pyspark.daemon`，没有额外的参数。pyspark.daemon会fork一个进程，然后在子进程里执行pyspark.worker.main函数，数据读写的源头也改为来自socket。实际代码中先会做dup，把socket复制出来提高效率。driver和executor之间通过环境变量和socket传递数据和代码（似乎是pickle序列化），此时的executor会在container_xx_02或03目录内执行。

进入py代码后，先构建SparkContext对象，构建过程会查找并执行`spark-submit pyspark-shell`命令，构建一个java的gateway，再通过Py4J包，以类似RPC的方式把py代码通过Gateway发送到jvm，进行spark操作。如果计算过程中需要python的udf，则数据必须发送到work节点，过程是由spark启动python的worker.py进程，并以环境变量的方式把端口告知worker，worker会用socket去连接这个port，并做一系列判断，比如driver和worker的python版本必须一致，计算结束后再用socket发送回spark。理论上只要数据不回传给py，开销只是方法的传递，性能和scala的实现是一样的，如果有数据回传，速度会降低一倍以上。

## PySpark内容

### 包层次

顶层目录pyspark包含SparkConf、SparkContext、RDD等spark的基础概念，包含sql、streaming、ml、mllib等多个子模块。

### 流程和关键概念

如果是写类SQL功能，流程是套路化的

1. 获取SparkConf，设置master和appName。我只用过yarn模式
2. 把Conf作为参数传给SparkContext。注意，必须构造context，否则无法和spark通信。Conf可以没有，但考虑要设置的参数很多，用Conf方便，另外还有序列化类参数可传入，默认用pickle序列化py和jvm之间的数据
3. 通过Context来获取SparkSession。这个Session是属于pyspark.sql的类，整合了SQLContext和HiveContext等多个SQL会用到的功能

拿到SparkSession后，读取文件得到的数据呈现形式就是DataFrame类，这个类具备很多SQL语义的API（因为Session就是sql包下的一个类）。DataFrame可以链式操作，即操作后返回的值大部分情况下仍是DataFrame，如果做了groupBy操作，得到的是GroupedData类型。

### PySpark命令

执行这个命令，会自动加载shell.py脚本并初始化sc(pyspark.context), spark(pyspark.sql.session，对应原生SparkSession类), sql(spark.sql的别名), sqlCtx/sqlContext(pyspark.sql.context.SQLContext)共4个全局变量。