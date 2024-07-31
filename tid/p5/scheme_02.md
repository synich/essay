# 02 几个实现简探Gambit/Chibi/Chicken/S7

## Gambit

两个主要执行程序：gsi和gsc，gsi是执行器，可以debug，gsc将scm源码先编译成一种叫gvm(gambit virtual machine)的中间语言，再翻译成C源码方式。转译后的源码内容是各种宏的排列，大约是gvm语言的转译版，完全没有可读性。

用`gsc -c`生成的c文件是，没有main函数，无法编译成可执行程序。main函数的定义在libgambit.a里。但是要将main函数和用户实现函数联系起来，还必须有一个称为link文件的东西。要用`gsc -link`方式生成。如果一份example.scm文件会生成example.c和example_.c两个文件。后一个文件接近500K大小，但是不管scm文件的内容是什么，这个link文件的内容几乎是一样的，因为它的作用主要是初始化scheme环境并调用用户代码。因此有多个scm文件时，只要对其中的主启动文件生成link文件就可以了。

最后再链接入libgambit.a就能生成平台可执行程序了。不过在windows上用gcc编译时提示找不到`chkstk_ms`函数，chkstk要解决的是这样一个问题：每个程序默认分配4K栈长度(64位是8K)，如果超过这个长度，会触发OS的缺页机制，但如果超过2页，可能会引起非法访问，所以微软加了这个函数。GCC也有类似机制，但函数名却不一样。有人说从VC拷贝chkstk.obj可以解决，但是我按这个做法无用，暂时无解。

另一个角度看，由于main函数是定义在libgambit.a中，也没办法把scheme和C混合编程。

有个并行扩展termite，把对象尽可能地序列化，不能序列化的本地资源以代理的方式pid化。

## Chicken

chicken主包有csi和csc以及一些安装egg的程序，优化力度没有Gambit大，但轻量，同时周边生态非常好。由于和C的交互性比较好，还有chicken-libs和chicken-dev两个附加包，libs只含一个libchicken.so.xx（xx是具体实现版本），运行时加载。当然也支持静态编译，就归属于dev包，里面有.h和.a文件，同时还有个.so的软链接。

Gambit和Chicken都是能把Scheme编译成C源码的实现(另外还有Bigloo)。

## Chibi

和前两个相比起来，Chibi只是一个非常小的实现，只有9个文件不到两万行源码，但却很有意思。

9个文件除掉main文件，剩下分为SEXP和EVAL两部分。SEXP包括`gc.o sexp.o bignum.o gc_heap.o`，S表达求值和两种GC策略及大数。EVAL包括`opcodes.o vm.o eval.o simplify.o`，实现求值、虚拟机指令、优化。

和最常见的configure/make编译方式不同，Chibi的configure却顽皮地写了句：`Autoconf is an evil piece bloatware encouraging cargo-cult programming.`，直接用make就可以。即使如此也能做到在很多平台直接编译成功。第一次看到有人这样嘲讽Autoconf，算是说出了我的心声吧。win编译chibi-scheme，改完Makefile.libs的CC和PREFIX，make生成可用的库。

实现上有很多有趣的实现技巧，比如用GCC的特性，`typedef int sint128_t __attribute__((mode(TI)));`定义128位int，在Windows平台使用`(DBL_MAX*DBL_MAX)`和`log(-2)`定义infinity和nan。

核心形式只有10个：`DEFINE,SET,LAMBDA,IF,BEGIN,QUOTE,SYNTAX_QUOTE,DEFINE_SYNTAX,LET_SYNTAX,LETREC_SYNTAX`。

chibi支持以C语言写插件并调用(如果不这样，scheme也不可能有大用了)，但想从C调用还没找到路径。

snow-fort.org是符合R7RS的包站

## S7

对tinyscheme做了极大的丰富，并且持续演进。宏和模块机制借鉴CL。

### 编译

虽说核心只有.h和.c各一个，但选项很多，又没有提供Makefile，还是要仔细看文档才行。默认把s7.c和repl.c编译成standalone的方式，虽然在安卓上能编译出二进制文件，但运行时要新编译libc的扩展，会遇到诸如没有wordexp.h头文件，没有网络库等。只能加上`DWITH_MAIN`选项编译s7.c得到standalone文件。还有如果遇到复数函数链接报错，还要在编译时加上`DHAVE_COMPLEX_NUMBERS=0`手动关闭。

### 模块

特殊变量`*features*`能看到当前加载的所有模块列表，但是可笑的是这个列表可以通过provide随意往里添加。虽然正常都是require然后找到那个文件，由该文件的首行实现provide。总觉得这种方式过于老式且似乎不能防止恶意行为。provide行为和lua的module很像，想来当时也是抄的吧，不过lua自己仅使用了一个版本就弃用，是不是也说明了什么。

### 自带库

大量使用了宏和C语言FFI，复杂不易懂。
