# 03 TinyScheme的运行过程

其前身是MiniScheme，代码量不到2500行，大量使用全局变量，风格算不上好，但对于trace来说很方便。

car和cdr是lisp系最典型的特征，通过宏包装后，在C层面大量使用。为了减少分配碎片，一次性先分配连续的内存，其中每个元素典型的tag value风格。每次分配或释放都会将cdr指向正确的位置。

```
struct cell{
  tag;
  union : {
    struct pair {
      cell* left;
      cell* right;
    };
  }
}
```

虚拟机运行中，共用到4个寄存器。args, envir, code, dump。其中dump值得一说，可以将它等效地认为是C语言的栈。顺便说句cadr的读法是从右往左，先cdr再car，取第2个元素，习惯表示记住就行。

运行前先将args设置为pair，car是待运行的文件名，其它3个寄存器为NULL。

第一条指令是LOAD，接下来是T0LVL，此时会把envir绑定到global env，这个阶段只是准备，所以命名为0。然后会依次向dump保存VALUEPRINT和T1LVL，由于cons队列属性，后保存的先被取出执行，而T1LVL实质就是eval，到这里就已经构成了LOAD(就是READ)，EVAL，PRINT的完整过程，加上外层的无限循环，整个REPL就完备了。

因为初始化的时候，往往把常用的放在前面，但保存的数据结构也是cons,导致搜索的耗时会变长，似乎逆序是更好的选择。

有3个在执行中很常用的宏，`s_goto`，`s_save`，`s_return`。goto直接更改op并进入下一次循环，save和return要配合dump寄存器保存所有的状态。`s_save`将op, args, envir, code,倒序挂在dump前面，`s_return`会将当前求得的值保存在value(也叫`ret_value`)，然后从dump中以save的逆序取出4个元素，赋值给op, args, envir, code。此后dump就回到上一次状态，类似x86的push esp;push ebp;和pop指令，最终的目的都是要保证栈平衡。return比save多一步赋值value也好理解，因为已经把这次的求值结果保存在value了，接下来就是取下一个op，这时可能会用到value。在`OP_DEF1`的结尾就是return，之后从dump中取出op，但是如果注释掉了`OP_VALUEPRINT`语句，堆栈就不平衡，导致下一次eval时op是乱码，引发程序崩溃。

典型如(define a 3)这句，先READ，发现是左括号，进入RDSEXPR，读到ATOM后，先save一个RDLIST，再goto到RDSEXPR，所以看起来会有两次连续的RDSEXPR。每次RDLIST都会从上一步的RDSEXPR得到value，依次是define, a, 3。读完之后，这3个元素就构成一个完整的list，进入EVAL开始求值。

由于只有闭包，函数定义和对象的类型是一样的。car是code，cdr是env。普通的函数env指向global，对象的cddr是global，cdar是其upvalue。code的car是参数列表，cdr是行为，通常是lambda。在闭包合成的过程中，被绑定的参数被挂接到global前面，从而在求值时就可以先找到。

看个示例
```
(define (bi a)
   (lambda () (+ a 3)))
(define c (bi 1))
```

函数定义bi是这样

![def](/img/scm-def.png)

生成的闭包c是这样

![closure](/img/scm-clo.png)

global由于始终按向car上挂接，非常不平衡，是个优化点。
