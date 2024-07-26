# 12 Lisp与静态类型

by 190111

别的不说罢，你跟我说 Common Lisp 的类型系统是宏？没有融入语言核心？SBCL 等实现的 static type declaration 不需要编译器层面的支持？可去您的罢。SBCL 这种还不够静态？没办法 OOP 这玩意总归得用些动态类型特性，那我们限制在一个比较小的语言标准， barak/stalin 能通过分析整个程序推导静态类型直接免除运行时的动态分发，用的就是标准的 R4RS，不需要任何额外的类型声明。

啥，要的是那种 type as specification 的类型系统，那种 tc 过后就 strip 掉的东西不用 preprocessing 实现还能用啥？

啥，要 Lisp semantic 的支持，讲道理本质上是 untyped lambda/predict logic 的玩意要怎么加。

用 ADT 有啥问题么，搞得和 Lisp 就不是 ADT 了一样

```
data Lisp = Symbol String
          | Nil
          | Cons Lisp Lisp

example :: Lisp
example = (Cons (Symbol "defun")
           (Cons (Symbol "id")
            (Cons (Cons (Symbol "x") Nil)
              (Cons (Symbol "x") Nil))))
```

还 list 换 lazy stream，lazy stream 本质上就是个给定上一个输出给出下一个输出的函数，有啥花头的，CLtL2 Appendix A 就有 Series 了，Appendix B 就是 Generator 了。

References

CLtL2 by Guy Steele 顺便一说，81-86讨论语言方向，86到94年才最终定稿。

Interpreting Lisp by Gary Knott

这里应该有一本用 ML/Haskell 写 Lisp 解释器的书，然而我忘了具体哪本了

Programming Languages and Lambda Calculi by Matthias Felleisen & Matthew Flatt
