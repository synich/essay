# Lua语言学习总结

## 表与元表

### 表方法与self参数

Lua的表定义函数方法有两种语法：点和冒号

比如local t = {}，定义new方法有两种写法：

1. function  t.new()  ...  end
2. function  t:new()  ...  end

前一种就是常规的定义，等同于t["new"] = function() ... end，类似于C++的类静态函数定义。但是类静态函数只能访问静态变量，而Lua的这种函数，如果显示传入这张表，效果上就是个普通的成员函数了。第二种则等同于t["new"] = function(self, ...) ... end。类似于C++的成员函数定义。

需要注意的是，如果在表定义的内部直接写函数定义，只能采用第一种写法，第二种带self参数写法是行不通的。因为此时表还没有构造完全，这样写有风险。也就是说对这个表如果两种形式都定义，则因为key值相同，加上Lua的动态特性，后面被定义的会覆盖前面。而C++中如果定义的静态函数和成员函数的参数列表完全相同的话，是无法编译通过的。

采用冒号写法的函数会多出一个隐藏参数self，这个self不属于Lua的关键字，但在冒号定义下会由lparser.c创建这个特殊的局部变量（和self同样性质的还有arg变量，会在vararg函数并开启兼容5.0时自动添加）。如果不想用self这个名字，可以修改lua的源代码重新编译，只是没人会这么做。self的做法和C++的this指针在编译器的行为如出一辙，理解了C++对类成员函数的特殊处理，就能彻底理解self的用意和实现方式。

试想混合两种语法的定义/调用形式，如果用了冒号无参定义，而用点号调用，则第一个self参数相当于置了nil，如果在定义中用了self相关的变量，则这样调用会出错，因为不建议这么用。但这里的self毕竟是个形参，也就是即使这么调了，也没会影响这个表本身，即点号调用完后，表本身内容是不会变的。如果冒号定义有一个参数，但点号调用也只传了一个参数，则这个参数会对应到隐含的self，导致冒号原型中的参数变成nil了。

如果用了点号定义，而用冒号调用，如果是无参定义，则完全一样，如果有参数，则第一个参数就会变成隐含的self，如果在定义点号函数时未考虑第一个参数是table类型的话，冒号调用也会发生类型不匹配，因此在有参数原型的情况下也存在风险。

除非是无参数调用，否则混合调用都存在一定程度的风险，本质上这就是两类不同作用域的函数。而C++在编译期做了检查，不会出现静态函数调用成员变量的问题。

### 理解元表

Lua虽然没有class关键字，但不妨碍它可以模拟OO语言，只是归属到object-based这个类别下(JS是这个流派中的prototype-based一脉)。可以把Lua中所有的table变量认为是object，如果仅仅是这样肯定是不够的，让Lua产生变化的就是元表。

通过一个值的元表可以修改很多操作的含义，但我认为其中最有用的只有3个：`__index(get)`，`__newindex(set)`和`__call`，lua在选择关键字的时候没有太直观。一旦能覆写get/set操作，不仅仅数据得到了隐藏，还能实现delegation，使得语言看起来有了继承的特性，当然也提供了rawget/rawset来访问数据的本来面貌。call则让对象成了仿函，使函数式风格能实现。

在重写这些方法时，`__index`是两个固定参数，self和keyname，`__newindex`再多一个value。而`__call`的参数个数至少有一个self外加可变的参数列表...。共同点是重写函数的第一个参数都是self。

为什么一定会有self呢？因为这3个特殊索引的值都可以是函数，而且还是C风格的plain function。像`__index`的触发条件至少有两个参数，因此像`__index`的实现，可以写成function mt:__index(name)这种风格。如果朴素一点，就直接返回一个变量或新的table，绕弯一点也可以返回function，进而构成链式调用。执行这个function会返回一个table，这个table要先做一次setmetatable，从而使外面使用者看来，就是一个完整可用的对象了。

又比如`__call`能让table当成函数来调用，如果这个table中含有的大量信息不传递到`__call`对应的函数就太可惜了，所以table就成了函数的第一个参数，这是从实用角度出发点得到的设计结果。

前面提到了rawget做点补充说明，正常情况从table访问元素如果访问不到(即值为nil)，就会触发元表机制，哪怕{b=nil}这种形式，访问b时也会查找元表，因为b用pairs根本看不到，所以rawget的结果通常就是nil。

以下是元表设置时的一个小误区

```
local mt = {a="inmeta", __index=mt}
local tbl = setmetatable({}, mt)
```

我开始的设想，访问tbl['a']会得到inmeta，但事实是nil。通过chunkspy反汇编看到`__index=mt`这句对应的是getglobal指令，就是说在构造等号右边的表时，看不到左边的mt，所以尝试向global空间找，当然是找不到的，所以结果是nil。那么换一种写法：

```
local mt = {}
local mt = {a="inmeta", __index=mt}
local tbl = setmetatable({}, mt)
```

似乎规避了刚才全局查找变量不存在的问题，好像也递归地把a设置到元表了，但是访问tbl.a时仍然是nil，说明`__index`的赋值是词法定界，即使看上去把mt重新赋值，但真正查找元素时还是用词法定界时的变量，所以还是老老实实地用`setmetatable({}, {__index=mt})`

## 弱引用

当想要引用一个对象，但是这个对象有自己的生命周期，不想介入这个对象的生命周期，这时候就是用弱引用。典型场景是cache，持有固然好，被释放也无关紧要。

将一对key, value放入到 WeakHashMap 里并不能避免该key值被GC回收，除非在 WeakHashMap 之外还有对该key的强引用。换句话说，只有cache的内容明确地被其他人需要，才会被保留，否则就被GC了。

## require机制及限制

使用require加载pack.lua包，主文件叫main.lua，在main中require("pack")就会编译pack.lua的内容，如果pack.lua中定义了全局变量g，这个变量也会进入main.lua的命名空间。当然如果main中先定义了local g，因为变量查找是先本地再全局，则pack中全局的g会被遮蔽。require之后，main中的package.loaded这张table就会多出一个名为pack的变量(其它预定义的string, io, os也在这张表里)。如果pack.lua的末尾没有调用return，则package.loaded.pack的值就是true，这样require到的包是没有价值的(总不能依赖全局变量吧，那样就失去包的意义了)。因此pack中的所有变量最好都定义成local，并在最后通过return返回，这时package.loaded.pack的值就是return后面的值了。

在包的最后用return返回有个很大的限制，只能返回一个值。为什么有这个限制？上面说了，在main中require之后，不论你是否在main中保存require的返回值，都会保存在main的package.loaded.pack中，而这个变量显然只能保存一个值。因此在pack中如果return多个，由于package的loaded表机制，return的第二个以后的所有参数都会被丢弃，所以在写包的时候要注意。

为什么package要有个loaded表呢？这样做可以防止重复包含，解析require时，如果package.loaded中已经有同名变量，直接返回就行，不需要再做查找动作了。Lua是个崇尚简洁的语言，且作为包来说，最常规的作法也是返回一个table，因此就没有必要去解决不能return多个的限制了。又由于package是张全局表，如果main包含了pack1，pack1又包含了pack2，在main的package.loaded能同时看到pack1和pack2，这种机制也简单地避免了循环包含的问题。

require的实现其实相当复杂，在5.3时代真正的执行动作定义在package.searchers这个table，这张表内含了4个函数。会依次把require的参数作为这4个函数的参数传递进去。第一个函数是简单的查找package.loaded表，实现最容易。第二个函数会引用package.path变量(准确地说是先找`LUA_PATH`或者`LUA_PATH_5_3`这两个环境变量)，并把这个字符串中的?替换成require的参数并进行加载。第三个函数类似，换成引用package.cpath。第4个函数则是loadall方式，至少我觉得不常用。这种把一个功能分解成4种可能，然后每种可能都配备一个函数的作法，是一种很有用的分而治之方式。

说句题外话，Lua5.1时代模块机制有require和module两个函数，到了5.2作者觉得module是个过度设计。于是废弃了module，只保留了require。来看看module的实现方式：比如有个模仿类机制的库loop，会在文件开头这样声明module("loop.base")。这行函数会在全局空间创造了一个名为loop.base的表，这就带来两个问题：

1. 污染全局空间
2. 即使在模块文件声明名字，别人还是找不到

所以假定在main.lua要加载loop/base.lua文件的流程是这样的，首先向package.loaded这张表查询，发现没有loop.base于是从package.path的各个可能里找loop/base.lua文件，找到以后开始执行，结果刚一执行，base.lua就向package.loaded写入自己，但问题是这个时候别人都找到你了，显然是个废操作啊。而且从module下一行开始，所有的代码都是在向module所创建的表中定义字段，以下的代码不能有任何的执行语句动作，只能声明，这个限制实在是不友好啊。base.lua执行到最后，会把自己这张表设置到package.loaded中，却没有显式地return自己，而是说`Finally, module sets t as the new environment of the current function and the new value of package.loaded[name], so that require returns t. `。利用了require的机制`In any case, require returns the final value of package.loaded[modname]. `把base.lua导入到main中。由于module的存在，让require的处理分支多了不少，种种弊端导致废弃module也是顺理成章的事了。

说个小细节，require的时候，如果模块在目录下，用 a.b 方式导入，但是写成 a/b 这种直观的方式也可以。标准的写法是 a.b， 在 require 内部会将 "." 换成操作系统对应的目录分隔符再从文件系统加载，而a/b不会特殊处理，刚好能从目录中找到。从通用性角度考虑，当然是建议用 a.b 的方式。

拿Scheme Gauche的module机制作个比较吧。Gauche的手册是这么定义的：

> Gauche Module is an object that maps symbols onto bindings, and affects the resolution of global variable reference.
> However, Gauche's symbol doesn't have a `value' slot in it. From a given symbol, a module finds its binding that keeps a value. Different modules can associate different bindings to the same symbol, that yield different values.

Gauche的module有两个关键字：export和import。import和lua require功能类似，但是Gauche的module并没有限制只能展出一个的限制，它是通过export显式地标记多个符号，由于export导出的符号仍然是绑定在module上，不需要担心重名问题。换成Lua则更习惯用一个table承载多个符号，同时控制可见性。两种语言不同表述风格，但最终的效果是一样的。

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

