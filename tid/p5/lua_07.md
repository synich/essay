# 07 Lua的编译期和运行期区分

虽然是一门解释型语言，但Lua其实也分了编译期和运行期，只是通常在lua的程序里顺带把luac的功能给自动执行了。但作为一个运行效率为第一位的语言，编译期更多的意义在于把源码转译为伪字节码，不会作过多语义上的校验。比如下面这个例子。

function a:foo()  print("hello") end

如果直接用lua运行，会报attempt to index global 'a'(a nil value)，但实际上在编译期，这仍然是可以通过的。

如果用luac先执行，会得到两个chunk，一个是main，一个是函数定义。main中有四条语句：

GETGLOBAL    CLOSURE   SETTABLE  RETURN

前两句是可以顺利执行的，a虽然不存在，会默认赋值nil。但到SETTABLE时，这个nil就原型毕露了。也就对应上面运行时那句attempt to报错。

也就是说luac只能做到语法层面的校验，但基于性能的考虑，不会做语义层面的判断(如果要做的话，代码量可就不止当前的2万行了)。

说下MetaLua对编译的作法，在编译理论里，parse和compile是两个阶段，source经过parse只能生成AST，再把AST送compile才能生成执行码(可以是机器指令或VM指令)。YACC也好ANTLR也好，都只是parse工具。Lisp语法就直接是AST了所以不需要parse但还是要有compile。由于有两个阶段，MetaLua也提供了mlp和mlc两个工具对应。非Lisp风格的编程语言如果要扩展，多少都要在parse阶段做些处理，典型如增加关键字，就在parse阶段把新增的关键字转译成AST里的function，才能在compile后正常执行。

因为MetaLua的存在，将源程序先编译成luac再执行就能看出明显的区别，compile阶段的操作可以在编译成luac时很直观地看出来，且不会带到执行期。

最后补充几个Lua的语法细节

Lua的函数到底是传值还是传引用？这是我从王垠的
[这篇文章](http://www.yinwang.org/blog-cn/2016/06/08/java-value-type)
想到的。

上面这篇文章的结论是Java从语义层面，只有引用类型。原生类型看起来像值类型，
只是一种实现的优化。既然Lua也是从Lisp/Scheme系继承而来，
就做个实验验证下，到底Lua是否符合王垠所定义的引用类型。

字符串拼接如果报nil错误，假如有多个nil只会提示最后一个错误，不确定是否lua编译器按从右向左计算参数的方式？