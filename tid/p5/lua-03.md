# 03 其它重要概念

## Enviroment

Lua5.2文档对编译基本单元chunk是这么说的：

> Lua把每个chunk看成一个带有可变数量参数的匿名函数体。而这个chunk在编译时，
> 又外接一个local的变量`_ENV`。因此每个chunk(或者函数体)总是有`_ENV`。

顺便说句，require的返回并不强制要求table，也可以是function，比如markdown这个扩展返回的就是函数，保存require的值后，可以直接运行。在写扩展代码时，一定要注意定义函数会否污染全局环境，如果不加local的话，这些定义是一定会带到主程序的，避免的办法有两个

1. 不希望导入全局的函数加local前缀，这了非常直观
1. 使用`_ENV`或setfenv来隔离。比如这样写

```
-- Set up a table for holding local functions to avoid polluting the global namespace
local M = {}
local MT = {__index = _G}
setmetatable(M, MT)
local lua_ver = tonumber(_VERSION:match("(%d.%d)"))
if lua_ver > 5.1 then
  _ENV = M
else
  setfenv(1, M)
end
```

把`_G`保存在一张本地表，对全局变量的引用变在本地变量中了。当然更重要的还是保护写，
Lua5.1以前是用setfenv这个函数，1是require的那个环境，如果0就表示_G，这样会毁了全局变量。
而Lua5.2引入的`_ENV`这个有点像SELF的变量，就不再需要setfenv函数。

看完lua层面不同版本对环境的兼容，再看C接口的兼容。
luasys库的方式是：`#define lua_setfenv lua_setuservalue`。当然还是有差别，5.1版本，设置的值一定是table，而被设置的则是function/thread/userdata三种之一，5.2版本后，任何类型都可以设置，但是被设置值必须是full userdata。版本间的交集是table绑定到userdata上，luasys就按着这个限定去用。

吐槽一句，文档偏要说`_ENV`完全只是一个普通的名字，In particular，
可以用local `_ENV`定义一个新的变量来掩盖常规意义上的`_ENV`，对这种人，我只想送他四个字**走好不送**。
这种时候应该写： `We strongly recommend do not override _ENV`。
而不是含糊不清的In particular。
还有个原因是`_ENV`名字可以在luaconf.h中使用宏`LUA_ENV`重新定义，为了在社区能正常的交流，
劝你别这么干。`_ENV`定义在LexState里的一个TString类型变量里，在lparser.c中会用到。

流程是这样的

1. luaX_init，起因是lua_newstate时需要一系列初始化，就包括了词法初始化。
这里被创建的名字是全局的，永远不会被GC。
1. luaX_setinput。这句是在luaY_parser中调用，和刚才那句不同，
这里创建的变量就要归属某个LexState，这个LexState是在luaY_parser的一个栈上变量。
从注释来看，luaY_parser是专用于主文件的，luaX_setinput之后的mainfunc会close这个栈上变量，
风险是没有的。

## Continuation

静下心来看冯东的讲解，才终于明白stackless指的是：lua语言的执行不会导致宿主语言的栈增长，同时`luaV_execute`的一次执行就会「吃掉」Lua stack 顶端所有连续的「CallInfo (Lua)」frame。`lua_State`的callinfo是Lua层面的栈帧，而VM本身的实现对应宿主C语言的栈帧，是为双栈结构。对于一个Lua VM来说，始终只有一个宿主的CRT stack。

凡是函数一定有栈帧的概念，而栈帧也一定有生命周期。虽然实现上差异很大，但本质必然相同。C语言的栈指针由编译器进行增减管理，或是动态语言用堆对象模拟栈，再用GC来维护生命周期，本质是一样的，只是堆要额外地依赖GC做栈帧清理和识别closure。如果把GC看成和编译器生成的栈指针管理类似的动作，每次lua的函数执行就和C一样是个透明的栈增长过程，区别是动态语言的栈帧在内存上不连续。

`luaD_rawrunprotected`有个特殊的步骤：setjmp。共有四个函数会使用这个特性，分别是

1. `lua_newstate`
2. `luaD_pcall`
3. `lua_resume`
4. `lua_checkstack`

与之对应的longjmp对应的函数比较多，分别是

1. `luaG_errormsg`
2. `luaG_traceexec`
3. `luaD_growstack`
4. `luaD_call`
5. `lua_yieldk`
6. `GCTM` lgc.c内部的GC函数
7. `luaM_realloc_`

在lua的main thread创建一个coroutine，并resume这个coroutine，然后在coroutine内yield，发生了如下的事情：

1. 在C的栈上执行`luaV_execute`
2. 遇到OP码，执行`lua_resume`，由前面介绍可知，在这里埋了点
3. 执行static的resume函数
4. 执行`luaV_execute`进入新的一个lua的CallInfo中，即从main thread切换到coroutine
5. yield会触发longjmp，于是回到第二步埋的点
