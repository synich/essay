# 01 C语言对Lua虚拟机的操作

Lua5.0开始，语言的实现改为基于Register方式，但是Lua与C互操作仍是Stack方式，二者并不矛盾。基于Register指的是字节码操作的是寄存器，而与C互操作时，显然无法访问虚拟机内的寄存器，此时用栈是一种很自然且好理解的方式。

栈上的元素索引，1表示底部，-1表示顶部。除了push/pop还有`lua_insert`,`lua_remove`,`lua_replace`这三个值得一说。

`lua_insert`在文档中的注释是这样：

> Moves the top element into the given valid index,
> shifting up the elements above this index to open space.
> Cannot be called with a pseudo-index,because a pseudo-index is not an actual stack position.

操作的结果是把顶部的元素放到指定的index位，剩下的元素依次上移。这个操作不改变栈内元素数量，仅仅把顶部元素换个位置。由于函数签名没有表现出栈顶元素，我觉得用`lua_exchange`更恰当。

`lua_remove`和`lua_replace`都会减少一个栈上元素。不同的是remove就是单纯把index指定的元素删掉，而replace是用栈顶元素把index元素换掉，两者共同点的是index指定的元素都没有了。

## 从栈的角度理解lua_call

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
