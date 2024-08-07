# 90 冯东的Lua

Lua vs. Python

在《Programming in Lua》系列里谈了 Lua 的 stackless 实现。说到 stackless 设计，难免和 Python 的 stackful 实现比较一下。

以前总有一个疑惑。为什么 Python 既要采用 native thread，又要用 great-lock 将其变成实质上的协作式 thread。像 Lua 这样的 coroutine 不好么？现在知道了，非不为，不能也。既要尽量保证虚拟机的可移植性，又采用了非常依赖 CRT stack 的 stackful 设计，语言本身没有 synchronous primitive，不能应付真正的 preemptive 多线程。这种情况下，多线程加 big-lock 是唯一的折衷了。由此也知道了 Python 的 generator 为什么只允许在第一层函数中 yield，因为 stackful 设计不允许保存 call stack (说老实话，只允许在第一层函数中 yield 的 coroutine 不过是两个函数调来调去，在 C 里实现起来也不难)。Python 3.3 开始支持更宽松的 yields，不过实现的方式和 Lua 的 yields-in-C 差不多，作为基于虚拟机的语言是比较原始的手段。

拿 Lua 和 Python 做比较令人恍惚感觉正在比较 Objective-C 和 C++。Lua/Python 和 Objective-C/C++ 都是在共同基础上发展出来：后者扩展 C 语言；前者用 C 语言实现基于 byte-code 的虚拟机。它们都有理想的「标杆」：Objective-C/C++ 的标杆是 Smalltalk/Simula 等面向对象语言先驱；Lua/Python 是 Lisp 这样的高级动态语言先驱。努力的方向都是降低「标杆」过大的性能开销和简化「标杆」过于复杂 (或者过于精简) 的概念。Python 和 C++ 相对较早的尝试，都采用了比较低级的机制：C++ 用函数指针模拟成员函数；Python 依赖 CRT stack 直接实现 byte-code stack。这些「第一次」都没能「do things right」。后来的第二次尝试才作出了更妥当的取舍。

在《 The Art of UNIX Programming 》里指出了系统设计的「第二系统综合症 (second-system effect)」。乔布斯也提到过「第二个产品」的问题。在一个成功的系统上衍生的第二个系统有时会因为没有理解第一个系统成功的真正原因而失败。但是，如果还有机会的话，由此衍生的「第三系统」往往会做得更好。对于上面所说的语言发展来说，它们的基础 (C 语言) 和「标杆」是「第一系统」，第一次改进的尝试毁誉参半，而后来的「第三系统」更加出色。

## Programming in Lua（五）－ Coroutine, Lua Stack

在《 Programming in Lua（三）－ Yields in C 》里讨论了 Lua 虚拟机对 yields-in-C 及其 stack 的处理。当时还未读 Lua 虚拟机的实际代码，只根据语言的行为来推测，有些术语也不符合通常用法。最近从 Lua stack 的实现入手，发现了一些以前没想过的问题：为什么 resumes-in-C 从来不是问题？为什么有 lua_yieldk() 而没有对应的 lua_resumek() ？

首先从术语的标准化说起。《 Programming in Lua（三）－ Yields in C 》里有多处这样的描述：

「stack 上 ⋯⋯ 的执行层次」；
「virtual stack 上的 Lua 部分的 stack」；
「Lua stack 段」。
其中「执行层次」、「部分」、「段」这样的字眼应该替换为「stack frame」这个更常用的术语。线程运行时，stack 呈现两层意义。一是后入先出的简单线性结构；二是把此线性结构划分成与函数调用层次一一对应的若干段，这样的一段就被称为一个 stack frame。大多数语言的 runtime 或虚拟机中，stack frame 并无单独的数据结构表示。在 64-bit x86 的 C runtime (CRT) 中，每个 stack frame 的首项是上一层 stack frame 的最低地址 (base)，称为 stored frame pointer (SFP)，最顶层 stack frame base 存储在 %ebp 寄存器中 。即每次生成新的 stack frame 时，首先将 %ebp 寄存器入栈形成 SFP，然后把当前的 %esp 赋给 %ebp。通过这种方式让需要解析 stack frame 的程序 (比如 debugger) 得到所需信息。(SFP 并非一定存在，臭名昭著的 omit-frame-pointer 编译器优化会去掉 SFP，这时 debugger 只能借助额外存储的 symbols 来解析 stack frame。)

就需求本身来说，Lua stack 要解决的问题比 C 复杂的多，甚至比同为动态语言的 Python 更复杂。基于虚拟机的语言的 call stack 有两种可能的设计：一是借用虚拟机本身的 CRT stack。Byte-code 的函数调用指令对应虚拟机本身 native 代码的函数调用，虚拟机的 CRT stack 随 byte-code 函数调用的层次增加而增长。二是由虚拟机维护额外的 call stack 数据结构。Byte-code 的函数调用指令和其它指令一样，在虚拟机的同一个循环中完成，虚拟机的 CRT stack 不体现 byte-code 函数的调用层次。后者通常被称为 stackless 方案，前者暂且对应称为 stackful 方案。

Lua 是 embedded/extension 语言，byte code 的运行总会夹杂 C 函数。这些 C 函数的 call stack 在逻辑上是 byte-code 运行状态的一部分，实际上则间杂在 Lua 虚拟机的 CRT stack 中 (在涉及 Lua 的情况下讨论 CRT stack 时，要始终说明是虚拟机的 CRT stack 还是 C 函数的 call stack)。从这个角度来说，embedded/extension 语言更倾向于选择 stackful 设计。但 stackful 设计的固有缺陷在于 stack 结构是平台相关的，很难用跨平台的方式实现诸多功能，比如协作式多任务 (cooperative multi-threading)，跟踪垃圾回收 (tracing-GC)，lexical closure。尽管不是全部原因，Python 缺少诸多高级特性与其 stackful 实现有很大关系。

为了遵守 ANSI C 的跨平台性和更好的实现高级动态功能，Lua 采用了 stackless 实现。这给处理 C 代码的 call stack 带来了一些挑战。Lua 的 stack 存储在 struct lua_State 的 stack field 中，是一个 TValue* 的数组。其内容包括：

函数指针。Proto* (Lua 函数) 或者 lua_CFunction (C 函数)。注意函数指针不是函数的返回地址。
函数的参数和返回值。包括 Lua 和 C 函数之间传递的参数和返回值。
Lua 函数的局部变量。
在这个 stack 上缺少一些属于 call stack 的东西：

C 代码本身的 call stack。
函数的返回地址。
Stack frame 信息，类似 SFP。
这是因为 Lua 采用了双 stack 结构。对应的 stack frame 信息存储在一个 struct CallInfo 链表中，每个节点对应一个 stack frame，它对 TValue* 数组 stack 的描述如下：

Field func 表示 stack frame 在 TValue* 数组上的起始位置 (之所以用 func 作为 field 名称是因为在 TValue* 数组上这个位置永远是函数指针)，field top 表示结束位置。
Field union u 存储和函数类型相关的信息。Lua 函数信息存储在 u.l 中，C 函数在 u.c 中。
u.l.savedpc 表示函数的返回地址。这个值仅当 Lua 函数作为 caller 的情况有效。C 函数作为 caller 时，返回地址在 CRT stack 中。
当 C 函数中发生 yield 时，CRT stack 被破坏，该 coroutine 下次被 resume 的执行地址由 u.c.k 来承担。详见《 Programming in Lua（三）－ Yields in C 》。
这里值得多说一句，为什么在 C 函数中执行 yield 会破坏 CRT stack？上文说过，Lua 的设计主要是 stackless 方式，其具体实现是通过 luaV_execute() 中的循环执行 byte code，通过额外数据结构 (其实是双数据结构) 而非 CRT stack 来维护 call stack。但在 resume coroutine 时，luaV_execute() 间接地递归调用自己并在 callee 的循环中执行 resumed coroutine。也就是说由 CRT stack 来维护 coroutine 上下文切换。Yields 的机制是 longjmp 回到 luaV_execute() 函数递归调用自身的下一条指令 (虚拟机的 native 指令而非 byte-code 指令)，同时把 CRT stack 恢复到 resume 前的状态。所以 yields-in-C 会破坏 C 函数的 call stack。

尽管 coroutine 涉及了对 CRT stack 的操作，但是和 error 一样，仅限于 ANSI C 支持的 longjmp，不会破坏 Lua 虚拟机的跨平台性。问题是，为什么 Lua 要在总体的 stackless 设计中制造这个 stackful 例外？首先退一步说，即使采用 stackless 方式实现 coroutine 切换，仅仅能避免在 yields-in-byte-code 中使用 longjmp，仍然无法避免在 yields-in-C 中使用 longjmp。这是因为，虽然不再有必要 longjmp 回到最近一次 resume 之处，但是仍然需要从 yield 之处回到最近的 Lua 虚拟机代码。不仅如此，stackless 方式还要给 resumes-in-C 引入类似的 longjmp (因为不再利用 CRT stack，所以 resumes-in-C 也必须立即回到 Lua 虚拟机代码)，破坏调用 resume 的 C 函数的 call stack，给 resumes-in-C 加上同现在的 yields-in-C 一样的局限性。而现在的 stackful 方法则完全没有这方面的问题。这正是无需 lua_resumek() 的原因。Stackful coroutine 是一个非常巧妙的设计。

## Programming in Lua（四）－ Nil 和 List

粗浅地看，Lua 的 nil 很容易被等同于「无」。如下面这段代码：

```
function r_nil()
    return nil
end

function r()
    return
end

a = r_nil()
b = r()

print(a .. ", " .. b)  -->  nil, nil
```

尽管函数 r_nil() 和 r() 的返回语句分别带有和不带有 nil，接受它们返回值的变量 a 和 b 的值都是 nil。另一个例子是 nil 对 table 的作用。

```
tab_v = { attr1 = 1, attr2 = 2 }
for k,v in pairs(tab_v) do
    print(k .. ", " .. v)
end  -->  attr1, 1
     -->  attr2, 2

tab_v.attr1 = nil
for k,v in pairs(tab_v) do
    print(k .. ", " .. v)
end  -->  attr2, 2
```

将 table 的一个 field 赋值为 nil 不仅仅改变其值，而是让这个 field 本身消失了 (这个例子中是 field attr1)。

分析 nil 的实际含义可以从 Lua 的另一个比较特殊的概念 —— list 入手。List 的特殊性在于它不是 first-class 类型。「First-class」是动态语言中常被提及的概念。编程语言有越多的构成元素符合 first-class 标准，其概念模型就越一致、越简单。Lua 的基本数据类型 (包括 nil) 和函数都符合 first-class。满足 first-class 标准通常有四个要求：

1. 可以被赋值给变量；
2. 可以作为参数；
3. 可以作为返回值；
4. 可以作为数据结构的构成部分。( 注意 nil 并不完全符合这个要求，但是可以通过某个 field 的缺失来表示 nil。)

在《Programming in Lua, 2ed》的第 5.1 节提到 list 只能用于四种情形：

    These lists appear in four constructions in Lua: multiple assignments, arguments to function calls, table constructors, and return statements.

List 有两种具体的表现形式，一种是用逗号分割的一组表达式，表示一个具体长度的 list；另一种是三个点构成的省略号 (...)，表示其长度和内容不定。第二种表示方式不能用在 multiple assignments 的等号左方，也不能创建新 list，只能从函数的形式参数列表中获得。由此可以看出，list 不符合 first-class 标准：

* 它的部分内容可以赋给几个变量，但本身不能作为整体赋给变量；
* 它是参数列表的全部或一部分，但不是任何参数 (注意两者的区别)；
* 它不能作为数据结构的构成部分。注意，「...」不能作为 closure 的 upvalue。用 first-class function 存储 list 的方式行不通。
* 作为非 first-class 类型，list 无法被生命周期较长的数据结构存储。短期的完整传递 list 的内容只能利用函数调用/返回的方式：

```
function f_outer(...) -- important: f_out() must accept
                      -- "...".
end

f_outer(f_inner())
-- pass the list returned by f_inner() to
-- f_outer() as the latter's argument list

f_outer(1, 2, f_inner())
-- pass f_outer() a new list, which is "1, 2" appended
-- by f_inner()'s returned list

function f_caller(...)
   f_callee(...) -- pass argument list of f_caller()
                 -- to f_callee()

   return f()    -- pass list returned by f() to one
                 -- level up
end
```

另外还有一些反例：

```
function f_caller(...)
   a, b = ...   -- not pass a list, "a, b" is
                -- a different list of two elements
                -- obtained by adjusting the "...",
                -- and this list is very short-live,
                -- existing in this line only

   tab = {...}  -- not pass a list, tab won't
                -- have fields for nils in the "..."

   local function test(a, b)
   end
   test(...)    -- not pass a list, test()'s
                -- argument list accepts only the first
                -- two items of "..."

   for i in ... do  -- the "for" uses only the first
                    -- three elements in "..."
                    -- (two accepted by for internally,
                    -- and one received by i)
   end
end
```

List 会成为 Lua 中为数不多的非 first-class 类型是因为它实际代表了 stack 上的一段数据。一般只有动态分配的数据能作为 first-class 类型，操纵 stack 上的数据则只能通过函数调用的参数和返回值等有限的方式进行 (这也是因为 stack 在一定程度上代表了程序的 continuation)。不过在其它语言中，stack 的内容并没有被抽象为类似 list 这样可以被操作 (尽管不能像 first-class 类型那样自由地操作) 的概念。因为 Lua 提供了多返回值，鼓励可变参数以及参数/返回值和 table 的互相转化，特别是它著名的 C 接口就以 stack 为中心来设计，所以它有了独特的 list 概念来操作 stack。

如果在 Lua 中一定要将 list 和 first-class 混用怎么办呢？比如说，一个函数返回的 list 通常还是要存储在变量中，或者应用在某个表达式中。这是上面的反例代码中已经提及的机制 —— adjustment。Adjustment 并不是真的传递一个 list 的内容，而是用一个 list 的内容构建另一个新的 list。当新 list 的长度小于原 list，多余的值被丢弃，当新 list 长度大于原 list，就用 nil 补齐。

Lua 的 nil 担当了三种角色：

* 一般的数据类型，通常标志某种特殊情况 (应用或算法本身的特殊情况，而非语言的特殊情况)
* Table field 的删除器
* List adjustment 的补全值

Lua 的 nil 不代表「无」，反而恰恰起到了「有」的作用。在应用 adjustment 的情况下，我们往往用新 list 末尾的 nil 来判断原 list 的「无」。这个做法有一个缺陷：无法辩别原 list 末尾本来就确实含有的 nil。如果需要区别对待 list 结束和 list 本身含有 nil 这两种情况，既可以自行编写 C 代码来检测 stack，也可以使用 Lua 现成的 API select()。回到第一个例子，稍加修改就可以区别两种情况：

```
function r_nil()
    return nil
end

function r()
    return
end

a = select("#", r_nil())
b = select("#", r())

print(a .. ", " .. b)  -->  1, 0
```

下面是精确区别 list 结束的一个实际例子 —— 关于 stack 的递归终止条件。若希望一个函数对它的 argument list 中的每个参数执行 op() 操作：

```
function map_list(op, ...)
    if select("#", ...) == 0 then
        return
    else
        local a = ...
        return op(a), map_list(op,
                               sub_list(...))
    end
end
```

函数 sub_list() 返回的 list 是其接受的 argument list 去掉第一个元素。这个函数的实现如下 (如果用 C 语言来实现会更简单)。如果 op() 允许接受 nil 并且在此情况下返回有意义的值，或者 map_list() 接受的 list 在中间含有 nil，那么 map_list() 的递归终止条件就必须基于 select() 而不可以基于对 nil 的判断。

```
function sub_list(...)
    local list_start
    function list_start(start, ...)
        if start > select("#", ...) then
            return
        else
            return select(start, ...),
                   list_start(start + 1, ...)
        end
    end
    return list_start(2, ...)
end
```

List 是 Lua 中最不符合 first-class 的数据类型。但由于其不能作为变量但可以被函数的返回值构建的特性，List 反而可能是 Lua 中最纯粹的 functional programming 元素。放弃 table 而完全用 list 来编写 Lua 程序也许是把 Lua 转化为一种 FP 语言最简单的手段。

## Programming in Lua（三）－ Yields in C

Handling Yields in C 是 Lua 5.2 的重大改进之一，最早从 blog《Lua 5.2 如何实现 C 调用中的 Continuation》了解到。这些资料围绕新 API lua_yieldk，lua_callk，和 lua_pcallk 来介绍这个新特性，自然有很多关于新增加的 continuation 参数的讨论。其实以 continuation 参数作为切入点介绍 yields-in-C 容易混淆问题的实质。首先回顾一下《Programming in Lua, 2ed》(中文版) 中的一段话 (第 30.1 章)：

    The only way for a C function to yield is when returning, so that it actually does not suspend itself, but its caller — which should be a Lua function.

这段话针对 Lua 5.1 而写，当时尚无 continuation 参数。严格地说这会误导读者。根据描述本身，可以理解为 Lua 无法在 C 代码中 yield (包括被 C 代码再次调用的第二层 Lua 代码以及之后的 stack 上更深的执行层次) 是因为无法纪录这种情况下 resume 所需的信息 —— C 代码的 stack 和 program counter。这种解释的推论是，在 C 代码即将返回 Lua 前，由于 C stack 已经恢复为调用前的状态 (可以称为「空 stack」)，program counter 也处于即将进入 Lua 代码的状态，所以可以调用 lua_yield。原理上这个结论可以推广到 lua_call/lua_pcall。如果程序在 Lua 和 C  代码之间调用切换多次，整个 virtual stack 上的 Lua 部分的 stack 会被 C 代码分割成若干段。不过只要这三个 API 总是在 C 代码即将返回 Lua 前被调用，那么这些 C stack 都是空 stack，Lua VM 只需知道 C 代码在 Lua stack 段间的位置，不需要实际纪录 C stack/program counter 本身的内容。「在多于一层 C/Lua 切换的情形下 yield」应该正常工作。

问题是 Lua 5.1 不支持「在多于一层 C/Lua 切换的情形下 yield」！

根据上面的分析，这个限制并非 Lua 语言或 C API 本身的设计所固有，它是一个纯粹的 VM 实现问题。也就是说，即便 Lua 在 5.1 之后不引入 continuation 参数，保留「lua_yield (以及 lua_call/lua_pcall) 只能在即将返回到 Lua 之前调用」这个限制，也还是可以支持从 C 或者从第二层及以上的 Lua 代码中 yield。

Lua 5.2 实现了「在多于一层 C/Lua 切换的情形下 yield」，这是一个 VM 内部改进，仅仅为此并无必要引入 continuation 参数。 Continuation 参数解决的是另一个问题 ——「Lua 无法跟踪程序在 C 代码中的 stack 和 program counter」，但仍保留诸多限制：首先，它无法解决纪录 C stack 的问题，所以，仍然不允许在 C stack 上有多于一层 C 函数时调用新 API；其次，它也无法纪录 program counter，编写 C 代码时必须手工把可能发生 yield 之后的 C 代码 factor 到一个单独的 C 函数中，通过函数分割这种变通方式部分的模拟 yield 时的 program counter。由于没有真正的管理 C stack，充当 continuation 参数的 C 函数在运行中不能依赖 caller 的 C stack (实际上这个问题不大，因为它只能接受一个 lua_State 结构)。最后，仿照某些评测给 Lua 5.2 的新特性做一个「优雅 / 有待改进 / 丑陋」的总结：

优雅

实现了「在多于一层 C/Lua 切换的情形下 yield」。对于「Lua 无法跟踪程序在 C 代码中的 stack 和 program counter」这个问题的剪裁得当，既扩大了支持的应用场景，放松了对 C 代码的限制。同时避免了编程接口过分复杂化，和使用底层 C runtime 机制破坏 VM 的跨平台性。

有待改进

文档没有分别说明两个问题，混淆了 VM 内部实现的改进和 API 改变的原因。

丑陋

新 API 在 continuation 参数为 NULL 时沿袭旧 API 的限制 —— 禁止在多于一层 C/Lua 切换的情形下 yield。这是不必要的，也是混淆两个独立问题的误解最大的来源。现在，对于那些已经在「即将返回 Lua 之前」被调用的 lua_yieldk/lua_callk/lua_pcalk，也必须传入一个 no-op 的 continuation 函数。不过，Lua 5.2 的发布已经有段时日，估计这个 API 上的小问题也不会再未来更改了。

## Programming in Lua（二）－ 异常与错误码

我不喜欢编程语言用「异常处理 (exception handling) 」的方式处理错误。从以往经历看，先有 C++ 创造了最差的异常实现 —— 没有 GC 帮助内存管理，扰乱 C 的二进制接口 (Application Binary Interface, ABI)。为了绕过这个拖累，维护 C++ 代码往往要花费双重开销来完成没有异常的语言可以免费获得的东西：code review 必须保证代码的「异常安全 (exception-safty)」[1]，同时不写会抛出异常的新代码。

Java 提供了 GC，解决了安全实现异常处理最大的的先决条件。不过凡事皆 checked-exception 的方式令人毫无好感 [2]。Objective-C/Cocoa 中没有跨越 block 的异常机制，基本上采取传统的返回错误码方式，让我舒了一口气。但是接下来，Lua 通过 longjmp 实现跨函数的类似异常处理。一方面，让我怀疑 Lua 以简洁著称的设计是否在这点上采取了错误方式；另一方面，longjmp 并未实际引起麻烦，让我好奇异常处理是否也有某些价值。

异常处理和传统的返回错误码 (error code) 两种处理错误的方式是一场持久的争论。就在最近，围绕 Go 语言完全抛弃异常处理的语言特性，《Why I’m not leaving Python for Go》的作者表了极大失望。

Russ Cox 针对上文为 Go 语言进行了辩护。其中提到了 Raymond Chen 两篇旧日的 blog：

* 《Cleaner, more elegant, and wrong》
* 《Cleaner, more elegant, and harder to recognize》

Raymond Chen 用严密的逻辑和实例说明了编写正确异常处理的代码 [3] 非常非常困难。特别要注意 (但不限于) 以下两点：

正确管理资源，特别是资源的回收；
关键数据的修改尽可能滞后。在中间可能抛出异常的步骤中，随时保证数据处于一致 (integral) 的合法状态。
关注第一点也许会令人假定，如果程序不涉及内存以外的资源，并有成熟的内存管理机制，就足以保证写出正确的异常处理代码。毕竟把异常处理放到 feature list 中的语言无不首先重视提供 GC 机制。由于需要根据异常的 stack unwinding 情形考虑内存回收，这些语言一般采用 root-tracing GC 而非 ref-counting [4]。但是，将资源管理局限于内存并不足以对第二条豁免，比如复杂的图结构 (graph structure)，或者更常见的情形：对象需要向多个相互关联的全局表注册自身的引用。而且话说回来，「纯」内存数据操作除了内存用尽 (out of memory) 之外又有什么值得担忧的错误需要处理呢？归根结底异常处理是一个主要面向 I/O 问题的机制。

在「纯」内存无 I/O 的环境下，能体现异常处理价值的领域并不多，仅存的适用领域之一是语言虚拟机。这正是 Lua 采用 longjmp 类似异常处理的原因，主要用于类型检查和数组越界等语言虚拟机问题。而且这时处理的错误往往不是最终产品代码 (production code) 期待的行为，并不真正用来弥补错误，只是起一些辅助作用，比如揭示 bug 和收集诊断信息，防止应用完全退出，在多文档应用中让用户有机会保存其它信息，或者让应用以 reset 之后的状态接受其它请求。类似于 Go 中的 panic 机制和 Java 中的 runtime-exception (unchecked excpetion)。

GC 虽然是实现安全的异常处理机制的先决条件之一，但只是朝向最终解决问题的很小一步。因为真正能体现异常处理价值的地方是 I/O 密集程序。有哪些 I/O 机制目前可以做到「关键数据的修改尽可能滞后。在中间可能抛出异常的步骤中，随时保证数据处于一致的合法状态」呢？作为 naive 的尝试，C++ 提出了 RAII。但是很遗憾，异常安全的需求明显超出了 RAII 的能力。除了关系型数据库事务处理 (RDBMS transaction) 的二步式提交 (two-phase commit)，我不知道还有什么 I/O 机制满足这个要求。也就是说，在日常需要的软件工具中包括图形化窗口化 UI，网络，打印等等常见 I/O 操作中，只有纯粹的数据库 CRUD 系统这个特殊领域适于异常处理机制。正因为如此，非数据库的 I/O API 的错误处理都应该采取返回错误码形式。特别是，以异常处理文件访问错误的 API 都是失败的设计 [5]。Java 正是被鼓吹适合数据库 CRUD 领域，所以其异常处理机制获得了一些正面评价。但是当其野心不限于此时，将仅限于数据库领域用的还不错的异常处理机制匆忙的推广到其它问题就招致了恶名。

某些系统通过异常处理或者类似异常处理的机制来解决某些问题，而且解决得还不错。这是它们的设计者针对一些能体现异常处理价值的特定领域选择的方案。这些成功案例并不能简单地推广。保守地说，要采用异常处理，必须保证所有资源置于二步式提交的事务管理之下；或者限于虚拟机内部对类型检查等非 I/O 操作的「粗粒度」错误处理。「粗粒度」表示一旦发生错误，系统采取的应对策略是放弃整个粒度较大的操作，异常处理仅仅保证程序不退出，收集 bug 诊断信息，或者保留机会处理其它请求，而不是去弥补刚发生的错误。特别是对于 Lua，这个问题还有一层含义。Lua 允许用 C 编写扩展。这种情况下要把基于 longjmp 的异常处理部分限于开始的参数类型检查，置于触及关键数据和 I/O 操作之前，一旦 C 代码涉及了实质的数据和 I/O 操作，错误处理方式就必须变为返回错误码机制。Lua 支持多返回值特性正是为返回错误码方式的应用提供便利。显然，Lua 的可扩展性也是其基于 longjmp 的机制彰显天下的原因，对于 Java 来说，虚拟机内部的具体实现和使用它的程序员是毫不相关的。

脚注：

C++ 中所谓的「异常安全」也不过就是尽量使用 on-stack 对象 (以及基于 on-stack 对象的「智能」指针) 和 RAII (下文还有涉及) 而已。
错误处理有经常被人混淆的两个方面。一是如何保证程序员不忽略可能的错误；二是在程序员意识到可能的错误时，如何编写正确的处理代码。本文只讨论第二个方面。因为，如何「不忽略可能的错误」属于程序员掌控应用逻辑的问题，已经超出了编程语言的能力。Java 的 checked-exception 试图用语言解决这个问题，但是即便是 checked-exception，也允许程序员相当容易的把异常遗留给上层 caller。其结果是，越多的错误集中在一处处理，而且远离错误发生的地点，这段异常处理代码的正确性就越难保证 (或者这段代码除了 crash/quit 无法做任何其它有意义的工作)。也许，这正是没有任何其它语言借鉴 checked-exception 机制的原因。
注意这里的「异常处理的代码」指程序员用具备异常处理机制的语言编写处理实际错误的代码，不要和异常机制本身的实现混淆。
Objective-C/Cocoa 舍弃异常处理的可能原因之一。另一方面，如果在 stack unwinding 时进行特定的处理，也可以用 ref-counting GC 配合异常。比如 C++ 调用 destructor 以及由此衍生的「智能」指针，还有 Python 的机制。但是我不喜欢这种将 unwinding 复杂化的机制。
导致每行一个 try-catch block。
