# Lua与C语言的交互

## C语言对Lua虚拟机的操作

Lua5.0开始，语言的实现改为基于Register方式，但是Lua与C互操作仍是Stack方式，二者并不矛盾。基于Register指的是字节码操作的是寄存器，而与C互操作时，显然无法访问虚拟机内的寄存器，此时用栈是一种很自然且好理解的方式。

栈上的元素索引，1表示底部，-1表示顶部。除了push/pop还有`lua_insert`,`lua_remove`,`lua_replace`这三个值得一说。

`lua_insert`在文档中的注释是这样：

> Moves the top element into the given valid index,
> shifting up the elements above this index to open space.
> Cannot be called with a pseudo-index,because a pseudo-index is not an actual stack position.

操作的结果是把顶部的元素放到指定的index位，剩下的元素依次上移。这个操作不改变栈内元素数量，仅仅把顶部元素换个位置。由于函数签名没有表现出栈顶元素，我觉得用`lua_exchange`更恰当。

`lua_remove`和`lua_replace`都会减少一个栈上元素。不同的是remove就是单纯把index指定的元素删掉，而replace是用栈顶元素把index元素换掉，两者共同点的是index指定的元素都没有了。

### 从栈的角度理解lua_call

要执行lua函数都会调用`lua_call`族(包括pcall,pcallk等)，除去错误捕捉和coroutine相关的内容，只看最简单的流程。

`lua_call(L, nargs, nresults)` 是最基本的形式，从这个调用到最后的执行经过了7次函数调用。

`lua_pcallk` (调整func位置)-> `luaD_pcall`(保护环境) -> `luaD_rawrunprotected`(设置longjmp) -> `f_call`(内部函数中转) -> `luaD_call` -> `luaD_precall`(如果是C函数，直接执行并`luaD_poscall`，将结果回填到func。在precall这个函数中，还会执行debug.sethook注册c动作引起的回调，类似的，注册r动作则hook在`luaD_poscall`中被调用) ->`luaV_execute`(视precall返回是lua函数才执行)

首先来看lua栈上的参数是怎么获取的，lua_State有stack和top成员，top始终指向栈顶，是个空元素。而获取栈上元素个数，并不是直观意义上的top-stack-1这么简单，实际上是L->top - (L->ci->func + 1)，为什么要用ci->func呢？

因为如果是top-stack就会把所有曾经压入栈的参数全部计算进来的，但对于当前正在执行的函数来说，外层栈的参数是无意义的，只需要知道本次栈帧的情况，而这个ci，注释说 `call info for current function` 。很明确的表明就是当前的执行环境。

在stack_init中，ci会指向stack，如果一直只是压入参数，得到的个数和top-stack-1是一样的。当压入的是个函数，也不会改变ci的位置，只有当明确表示需要call了，这时才会把ci->func的位置调整到top-(nargs+1)，所以执行call的时候，nargs绝对不能给错，否则函数就找不到了。

由于在第一步就调整了基准栈的位置，等真正进入`lua_CFuntion`的用户自定义函数时，gettop就能得到专属于这个函数的参数了。运行完成后如果需要返回值，需要用户把值继续压入栈，这时只管按顺序压栈，在`luaD_poscall`时，会将第一个出参赋值给ci->func，然后依次往上赋值。执行完之后的函数和入参就找不到了，被出参给替换。nresults的个数比较随意，如果实际填的比nresults少了，lua自动补nil，填的多了会被限制在top之外，也无法访问，关系不大。

而纯lua函数，虽然开始会走luaV_execute，但最后还是会回到C函数调用(毕竟是用C写的嘛)，lua的内建全局函数也是严格按照上述的方式来调用的。

## C语言获取Lua虚拟机的内容

所有的参数传递、函数的调用及表数据的获取都在`lua_State`栈中完成。网上有的教程在介绍这个栈用法时，会用`lua_getglobal`函数从lua中获取全局变量，并压到Lua栈。这对预定义的表，这么用是完全没有问题的；但如果是在C语言中要使用自己写的Lua扩展，用全局变量来传递肯定就不是个好的方法。既然是栈，通过栈的下标操作可以取值，并不需要用全局变量。

写好一个Lua扩展模块，在C中通过`luaL_dofile`的方式把这个函数加载进来。注意如果用`luaL_loadfile`只是预编译，并没有运行，也就没法获取到Lua中的数据。C里没法把require到的包赋值给指定变量，那dofile获取到的数据在哪里呢？其实这个返回值就被压入`lua_State`了。假如是在全新的`lua_State`中做了dofile操作，则index为1的值就是从包中返回的第1个值，如果这个值是table，通过`lua_getfield`(L, 1, "foo")就能得到包中名为foo的变量了。

在前一篇中说到require只能返回一个变量的限制，但是如果还是返回了多个，在`lua_State`栈上也会保存多个值，只是除了第一个之外，后面的全是nil。其实这个nil在package.loaded中也是能找到的。

require包之后，就可以通过`lua_gettable`或`lua_getfield`来得到包中的函数/变量，再通过`lua_pcall`就能利用Lua的扩展包了。`lua_getfield`是`lua_gettable`的一个方便的封装，省去了手动`lua_pushstring`的动作，写代码更方便一点。

## Lua扩展的C写法

### userdata设置元表

Lua可以给表设置metatable，用C语言写Lua扩展库时，返回的句柄可以是table(比如luaiconv库)，也可以是userdata(比如lsqlite库)。这两个类型设置元表流程略有不同。

table类型设置元表比较简单，直接`lua_newtable`再用`lua_setfiled(__index)`就行，而lsqlite库创建的是sqlite指针，是userdata，不能用普通的table作为元表。为此Lua提供了`luaL_newmetatable`函数，这个名字有点迷惑性，其实是专门给udata创建元表的。创建udata的元表虽然特殊，但是设置元表机制和普通的table是一样的，用`lua_setmetatable`就可以了。

创建udata的元表使用自定义字符串方式，这种方式对使用者很友好。lsqlite的4个udata元表定义不包含`__index`方法，而是又封装了一个`create_meta`函数，在这里面统一来`lua_pushstring(L, "__index");`，并用`lua_rawset`把元表设为自己的元表，再将这个元表用`lua_setmetatable`设为udata的元表。两个步骤且使用的方法不同，一定要区分开。

### Lua环境回调C函数

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
