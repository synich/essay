# 05 LuaUnit记录

单元测试的条件如果是函数，则首4字母为test，如果是表，则表名和函数名前4字母都为test，均忽略大小写。判断代码

* if string.sub(s,1,4):lower() == 'test' then

可以这样来执行测试命令

* lua example.lua test1 test2

表示只测试test1和test2，注意这里大小写必须匹配上才行。
如果没有，则还按全局搜索出来的测试。

函数入口上看，首先是runSuiteByNames，然后会从`_G`中取合适的名字，
生成table后再调用runSuiteByInstances

用过luaunit的两个版本，3.0和3.2。其中3.0的内部函数大量使用了全局函数，甚至一些标记开关都用了全局函数，这显然破坏了环境。
到了3.2版本则全面收敛了这种往全局空间写符号的恶习，包括assertEquals等都在table里，不再是全局函数。
但是3.2在执行时一定要用.run(...)语法。开始我误写成:run()语法，在3.0能正常执行，到了3.2总是出错，经过打印才恍然大悟把self给压栈了。
执行的时候可以传入各种参数，非常灵活方便。

* ut.run('-v', '-o', 'tap', 'testA', 'testAa1')

再比如执行测试时，有些函数需要一些特殊的参数，比如一个文本解析函数，需要传入一个文件对应的fd，这时使用class的测试方式就能提供额外的便利，可以给这个class定义setUp和tearDown方法(命名全小写也可以)，而且用testA:setup() self.xxx end这种格式也是允许的。luaunit框架这部分的执行流程是这样：
每个test函数都会进入execOneFunction执行一次，执行前后判断有无setup/teardown，有就自动调用这两个方法，执行则通过xpcall因此即使内部assert/error也不会异常退出。执行结果保存下来后，退出前执行endTest函数，会根据PASS/FAIL/ERROR分别增加计数结果。

如何非侵入式地写测试呢？比如有个lib.lua库，想对其中很多的内部函数写测试，
直接在lib.lua写显然相当不友好，肯定再建立一个ut.lua来放置测试用例。两者如何关联呢？

1.lib.lua中require 'ut'，这种方式相当于把require之前的lib.lua的环境作为ut的ENV，所有想导入ut.lua的符号只能走这个ENV，
显然只能以全局函数的方式传递给ut.lua，明显不合理，放弃。

2.ut.lua中require 'lib'，这种方式可以把lib.lua中要测试的函数封装在另一个专门做ut的导出表，并在ut.lua中接收并测试，
但是有个问题，就是lib.lua到底要返回正常的导出表，还是给测试的导出表，无法区分。目前想到的办法，只能在导出的附近定义一个常量，
通过修改常量的方式来测试。虽然还是有改动，但也是目前惟一能想到的方式了。

说完luaunit，再引申说说PHPUnit，其实单元测试在我理解，就是语言有机制能提供当前环境中的所有符号名，lua用`_G`变量，而PHP有`get_defined_functions`和`get_declared_classes`这两个方法，通过同样的策略可以实现和luaunit一样的调用方式。不过PHPUnit似乎要指定类名才能执行测试，我觉得这种方式未免笨拙了。

最后附记两个Lua小技巧：

1.检查一个字符串是否全落在字符集中，执行string.gsub('[]', '')，并检测结果是否为空串

2.判断string.find的返回布尔值，使用return not not string.find方式