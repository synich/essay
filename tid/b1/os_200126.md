# 安卓程序的构建与链接

## configure的改造

尝试在安卓编译python，保证PATH有gcc/ar/make，再改几行脚本就行。

1. configure以及触发的config.sub和install-sh默认通过/bin/sh执行，要换成可以运行的sh路径。
2. configure中有CONFIG_SHELL变量默认指向/bin/sh，可以改脚步也可以通过export这个变量来修改，但必须export，只是在shell定义没用。因为configure会fork大量进程，只有export后子进程才能感知到
3. 手动修改configure的`__ANDROID_API__`为某个版本，怀疑可能个用的gcc有关，好在改完这行就能用了

## linker

在termux(android5 API21)编译的程序，放到4.2的机器上执行，报`line 1: syntax error: unexpected ")"`无法执行，第1行出现/system/bin/linker字样，故有此文。

在android 2.x及4.0或更远古时代，系统在执行一个elf文件时，这个elf文件是固定加载到某个内存位置的。而后来llvm的出现，使得编译出来的elf文件，可以加载到内存中的任意位置，这种就叫pie。5.0后的android系统强制要求只能加载pie的文件，也就是说，使用gcc编译的固定基址的elf文件就再也不能执行了(大概这也是termux只支持clang不支持gcc的原因？)。

Android在启动一个新的进程的时候，调用execv函数族trap到内核，由kernel去检查和加载可执行文件；kernel做完可执行文件的加载的同时会加载/system/bin/linker，然后由linker去加载依赖的动态库，并调用可执行文件的入口函数，完成控制权的转移。linker还参与了调试的一些东西。通俗地说，它是一个elf文件的解释器。