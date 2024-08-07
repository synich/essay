# 10 GCC编译4阶段的一些理解

by 160109

起因是这样的，安装了GCC4.7和4.8两个版本，但是4.8不知什么原因输出临时目录总是出错，原因及修改方法见这里，
所以只能用4.8配合-pipe选项先生成.o文件，再用4.7链接成可执行程序。于是想了解下这么做为什么是可行的。

C语言的编译分4个步骤，第一步cpp预编译，后缀名.i，这一步因为宏的机制几乎没有新特性，且功能也不多，不会有太大的变化。这个不详细研究了。第二步cc1编译成汇编语言，这是整个编译最复杂的地方，涉及语言特性支持和优化，一般说的版本就是指cc1，C++则是cc1plus。
由这步生成后缀.s的汇编文件。第三步as(又名gas)将汇编语言转机器码并生成对应平台的目标文件，如ELF或COFF文件，最后由ld将多个目标文件生成可执行程序或库，文件格式为ELF或PE。

其中的第三、四步用的as和ld，其实并不在gcc的范畴内，其版本号是属于binutils这个项目下，
因为as的工作在于把汇编语言转机器码，并生成对应平台的目标文件，
生成机器码这步没什么好说的，不同指令集有各自的代码，相对比较直观。
但要生成各种平台对应的目标文件，这就涉及到一个抽象层，而一般用得最多的，
就是BFD库，如果输入as -v也会出现as BFD version字样，生成的目标文件经ld链接，
而ld只是个软链接，真正的文件可能是ld.bfd，也可能是ld.gold。
看名字就知道ld.bfd表示使用BFD库来生成平台相关文件，而ld.gold则是google研发的链接版本，
据说速度很快，但我的机器上没有安装，也不清楚依赖的gold库到底是个什么库，
只知道gold版只支持ELF，所以GNU必然不变采用作为默认实现，其功能应该和BFD是类似。

由于是两个软件包，怎么配套并没有一个非常严格的要求，因此用gcc4.8编译，最后用4.7链接也问题不大。只是默认会链接到4.7的库目录。如果想用4.8的目录，则可用用--sysroot选项来指定。
综上来看，编译的几个阶段，重心是不一样。而每两个阶段间都需要有一个规范。cc1和as之间采用的是AT&T规范，as和ld之间则是平台相关的目标格式。正是因为有了这些规范，4步编译才能看起来仿佛一步似地完成。

## 一些有用的编译指令

`gcc -print-file-name=libc.so`获得libc.so的位置

`libstdc++`是`g++`的专属库，gcc命令不能自动和C++程序使用的库联接，使用`gcc -lstdc++`就可以。

静态编译带运行时，`g++ -static-libgcc -static-libstdc++`

编译时设置rpath和dynamic linker（绝对路径）：gcc -Wl,-rpath='/my/lib',-dynamic-linker='/my/lib/ld-linux.so.2'

rpath，全名run-time search path，是elf文件中一个字段，它指定了可执行文件执行时搜索so文件的第一优先位置，一般编译器默认将该字段设为空。elf文件中还有一个类似的字段runpath，其作用与rpath类似，但搜索优先级稍低。搜索优先级:

`rpath > LD_LIBRARY_PATH > runpath > ldconfig缓存 > 默认的/lib,/usr/lib等`

如果需要使用相对路径指定lib文件夹，可以使用ORIGIN变量，ld会将ORIGIN理解成可执行文件所在的路径。`gcc -Wl,-rpath='$ORIGIN/../lib'`

无法编译程序时，可以通过patchelf修改rpath和interpreter。

```
patchelf --set-rpath '$ORIGIN' your_program
patchelf --set-interpreter /my/lib/ld-linux.so.2 your_program
```

利用$ORIGIN方式把依赖so放一起，portable化。也可以使用pwd获取当前路径，使用相对路径指向本地lib。

```
patchelf --set-rpath `pwd`/../lib your_program
patchelf --set-interpreter `pwd`/../lib/ld-linux-x86-64.so.2 ./your_program
```