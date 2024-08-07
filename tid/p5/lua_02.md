# 02 动态加载机制及限制

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
