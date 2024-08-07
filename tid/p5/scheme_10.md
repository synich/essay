# 10 LispMachine

by 190720

1. Lisp Machine 用 Lisp 做汇编指令纯属误传，虽然编译器能将 Lisp 编译成机器指令，也可以将机器转回人可读的 Lisp 代码，从某种角度来说，Lisp 处于直接和机器指令之间转换的层次，和现在常见的计算机的汇编是类似的。但说 Lisp Machin 用 Lisp 做汇编是不严谨的，因为 Lisp Machine 也有自己的汇编语言。

2. Lisp Machine 出现的背景是 16 位处理器向 32 位的迁移，主流 32 位处理器上运行的 Lisp 实现性能不理想，才有了 Lisp Machine 这一构想。当时的 Lisp Machine 有两大派系，MIT 和 Xerox ，分别对应当时两大主流方言 MacLisp 和 INTERLISP。我对 Xerox Lisp Machin 了解不多，以下主要基于 MIT Lisp Machine 的设计。

3. (MIT) Lisp Machine 的处理器实际就是个栈机器，Lisp 代码依次转化为栈操作执行：参数先依次压入栈，供计算指令调用，执行结果输出到返回栈。函数内部的函数调用就是建立一个新的栈帧，压入参数，输出结果到返回栈。一些特殊的函数直接实现成机器指令，从 destination 接受参数直接输出到返回栈。

4. Lisp Machine 设计成熟时期，用 Lisp Machine 做数值运算比在当时 32 位处理器上的 Fortran 还快。最大的特色其实是支持大屏图形界面和鼠标。

5. 很显然这种微处理器是复杂指令集设计，在现代已经过气了。后来基本等于免费分发的 Unix 配合摩托罗拉之类的廉价硬件平台很快取代了几十万美元一台的 Lisp Machine，导致本就经营不善的最大 Lisp Machine 公司之一 Symbolics 挂了，对业界又造成了打击。

6. 说 Lisp Machine 没有进程，Lisp 不适合用来描述操作系统云云，至少对于后期的 Lisp Machin 来说是错误的。Symbolics Lisp Machine 用物件导向设计操作系统，包括进程在内几乎所有系统构建抽象成物件，Lisp Machine Manual 的原句就是进程相当于虚拟 CPU。Unix 的一切皆文件就是一种弱层次的物件导向设计，Mach 微内核更是大量采用了物件导向设计，就连 Linux 都不可避免引入了 C艹，明显同时具有高级抽象和底层硬件的 Lisp Machin Lisp 是很合适的，而内核态和用户态的访问直接由定义方法来控制，这些问题在 Lisp Machine 还没过气之前都已经解决了。

7. 两个时代硬件的比较，Lisp Machine 晚期在 DEC Alpha 工作站上用虚拟机运行 Lisp Machine，做一次内存整理花费约 40 分钟，将同样的虚拟机移植到 Linux 后在 Core i7 四核上运行做相同操作，只要不到一分钟。

References:

[1] Guy Steele and Richard Gabriel, The Evolution of Lisp

[2] Richard Stallman, Daniel Weinreb and David Moon, Lisp Machine Manual, 6th Edition
