# 04 LuaJIT的编译过程和FFI接口

编译LuaJIT比Lua要复杂很多，共分三个步骤。先看src目录下的host目录，首先要编译出host内的minilua，用它驱动dynasm/dynasm.lua并配合`vm_xxx.dasc`来生成`buildvm_arch.h`(但是也可以在Makefile中指定minilua的替代品，所以它并不是严格意义的必须)，这个头文件是生成buildvm程序的关键文件。有了buildvm之后，再用它生成`lj_vm.o`和一系列的`lj_xxx.h`以及jit/vmdef.lua文件，都具备后才能最终生成LuaJIT程序。

但是偶尔也有意外，比如我在Win7环境用gcc编译，本来期望生成`lj_vm.o`，却生成了`lj_vm.s`汇编文件，用gcc转成.o会报错，大意是.hidden位置不对。我查了原因似乎是这样，.hidden是ELF格式的指示符，在windows平台没有这种特性，所以会报错。说明虽然gcc本身跨平台，但如果用了些汇编级别的文件格式相关的指令，还是会编译不过的。但这个可以规避，至少vc就没有这个问题，应该是某个编译开关没考虑周全导致的。除了这个，生成的动态文件名也有些差异，windows平台是51，而其它平台是5.1，不知道为什么windows会少一个点，莫非又搞特殊化？LuaJIT的接口一直保持和5.1兼容，后来也慢慢导入5.2的接口，到2.1.0版本共引入了8个5.2的C-API。

buildvm的作用是，它会先执行`build_code`，再根据处理器和OS生成汇编码，比如windows就是`emit_peobj`。

OpenResty的核心模块`ngx_lua`是用Lua的CFunction方式实现的，
从issue得知有lua-resty-core是基于ffi的实现，且后续会放弃对CFunction方式的支持。
看了LuaJIT的FFI介绍并简单看了源码，才发现错过了这么好东西。

FFI简单的说就是只要能拿到动态库(dll/so)均可，并且有相应的函数声明，
就可以直接地从LuaJIT中调用C语言函数。而且调用方式非常简单直观，
就和调用C语言一样，完全不需要像Lua那样的各种压栈操作。

实现原理是需要先调用ffi.load("ssl")，这个函数的内部实现就是LoadLibrary/dlopen。
再通过ffi.cdef中定义的函数名，通过GetProcAddress/dlsym找到函数地址就能调用了。
当然这里还有些cdecl/stdcall的转换动作。
如果在Windows平台上还会默认加载kernel32/user32/gdi32这三大默认库，
因此常用函数甚至不需要load就能调用了。

有这么好用的功能，难怪`ngx_lua`的实现都换成FFI方式了。