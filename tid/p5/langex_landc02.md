# 02 Lua扩展的C写法

## userdata设置元表

Lua可以给表设置metatable，用C语言写Lua扩展库时，返回的句柄可以是table(比如luaiconv库)，也可以是userdata(比如lsqlite库)。这两个类型设置元表流程略有不同。

table类型设置元表比较简单，直接`lua_newtable`再用`lua_setfiled(__index)`就行，而lsqlite库创建的是sqlite指针，是userdata，不能用普通的table作为元表。为此Lua提供了`luaL_newmetatable`函数，这个名字有点迷惑性，其实是专门给udata创建元表的。创建udata的元表虽然特殊，但是设置元表机制和普通的table是一样的，用`lua_setmetatable`就可以了。

创建udata的元表使用自定义字符串方式，这种方式对使用者很友好。lsqlite的4个udata元表定义不包含`__index`方法，而是又封装了一个`create_meta`函数，在这里面统一来`lua_pushstring(L, "__index");`，并用`lua_rawset`把元表设为自己的元表，再将这个元表用`lua_setmetatable`设为udata的元表。两个步骤且使用的方法不同，一定要区分开。

## Lua环境回调C函数

在Lua扩展库lsqlite中设置的回调函数，明明参数是Lua的函数，扩展里却是C语言的形式，在C语言中如何执行这些Lua函数？

从原理上C语言的回调仍然是C定义的函数，因此一定有一层转换。原生注册的肯定是C函数，在这个C的回调被触发后，要找到当初设置进来的Lua回调，这时就要用从`LUA_REGISTRYINDEX`这张特殊的索引代表的table去找到当初设置的Lua回调。从这里可以反推，一定是在设置入口，先用`luaL_ref`方式把Lua函数记在int里(`luaL_ref`的返回)。等进到C回调时，用`lua_rawgeti(L, LUA_REGISTRYINDEX, int)`再取回来，最后用`lua_call`的方式去执行Lua函数。至此流程打通。

lsqlite库实现还有个值得注意的地方，创建了一个到DB的connection之后，代码中有这么一段

```
  lua_pushlightuserdata(L, db);
  lua_newtable(L);
  lua_rawset(L, LUA_REGISTRYINDEX);
```

给db这个udata又另外注册了一个table。原因是SQLite中，光有connection还不够，经常会使用db，通过调用prepare函数创建statement句柄，即句柄层数不止一层，为防止statement忘记回收，每次创建了stmt句柄，就把它放到db关联的table中，当db被close时，再遍历table把所有的stmt进行回收。

除了用int外也可以用字符串，比如lua和libuv的绑定代码：

```
  // Tell the state how to find the loop.此前已把udata压入栈顶
  lua_pushstring(L, "uv_loop");
  lua_insert(L, -2);
  lua_rawset(L, LUA_REGISTRYINDEX);
```

insert这句参数-2等效于把顶上两个元素换个位置，再用rawset方式把`uv_loop`字符串和udata绑定，以后再用同样的字符串取回即可。

## 交互问题记录

### 环境变量传递

用Lua写一个库，在单元测试和正常业务上需要导出不同的符号，但是require机制不支持，偶然想到通过环境变量的方式传递，可是lua原生只能getenv却不能设置。这时有三种解决思路

1. 在lua调用外层做个shell，在shell中设置环境变量
2. 用C做host，由C语言作为UT的执行入口，设置环境变量
3. 用C写个Lua的扩展，在Lua里就能调用setenv了

第一条最简单代码都不用写，因为在同一进程空间内执行没问题。
第二条，因为windows下没有setenv，所以换用putenv实现，在C语言中能getenv到结果，偏偏lua的虚拟机内就是获取不到，既然没有fork为什么会失败，可能的疑点是windows下执行lua是dll载入方式，会不会dll引起的空间不同，环境变量没有迁移过去造成？
第三条实现也不麻烦，putenv就一个入参数，返回整数代表成功与否，整个扩展写下来15行，大量都是wrap代码，第一次实测没有问题，但奇怪的过一段时间再测的时候，在主程序还是无法读到这个环境变量。

从以上二、三条的实践来看，不同的dll有各自的环境变量，比如在lua扩展里设置环境变量，但在lua主程序因为是另一个dll，所以直接用os.getenv是得不到的。解决的办法就是第三条策略，扩展里再实现一个和putenv配对使用的getenv，而不是自带的os.getenv。在主程序里调用扩展的getenv，这样就可以读到扩展dll里设置的环境变量了。

之所以非要用C语言而不是shell，是希望后续能做三语言开发，以C作为胶水，把Lua作为工具再用scheme作为上层调度，强化自己的技术栈，另外也提醒自己不要荒废了C这个老本行。

### lua脚本嵌入C程序失败

写了段lua的脚本，想整体打包成可执行程序，总是失败，定位1小时才找到原因。

首先把dofile换成loadfile和pcall，发现是pcall环节出错返回值是2，表示遇到运行时异常，通常来说大概率是某个变量为nil未捕获。C语言调用，简单的做法把最后参数置为0，错误消息会留在栈的顶上，打印错误值得知是main函数的入参arg为nil，导致索引下标1触发异常，导致程序根本没能运行。

再看代码原来arg参数是lua.c创建的，如果集成库的方式，显然不会有arg参数，所以能在命令行调用，却无法集成到C语言，换句话说也可以通过根据arg是否为nil来判断是否从命令行触发。

以前写的混合程序，都是lua中定义好函数，从C语言调用，所以从未遇到arg问题，经此问题也算是有更深刻的理解。总之必须重视错误消息提示，代码中注意捕获并显示异常返回，不要遇到问题乱试一气。
