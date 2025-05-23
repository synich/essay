# Widnows的编译库的理解

## 生成动态库

windows下生成动态库，会输出3个文件。通过dumpbin把三者的段内容分别打印并比较一下。

exp类型也是COFF OBJECT，即和编译生成的.obj是一样的。

打印/symbols，只有exp有大量的输出，而dll和lib没有输出。因为/symbols表示COFF 符号表，只有exp和obj能输出。exp的symbols分两类，Static和External，意义很直接。

打印/imports，只有dll有大量输出，大多是依赖系统库，如MVVCRT等，而lib和exp无输出。只对exe和dll有意义。

打印/exports，dll和lib都有大量输出，而exp没有输出。dll和lib的输出差异在于，dll输出的符号和函数中一致(似乎是Name)，而lib的符号则多了一个下划线前缀(似乎是Symbol Name)。

另外编译后的资源文件.res也是COFF OBJECT类型，也是按段来组织的。

另外lib和exp都无法反编译，即/disasm无输出，应该是内部只有符号表，无text段的关系。而dll是有大量的反汇编代码。说明编译时导入的lib也就是起到了符号寻路的作用，没有真正有意义的代码段。

dll的反汇编代码，尤其跳转类je/jne指令后面都是绝对地址，说明不是地址无关代码，需要运行时做基址重定位，即ReBase修正。

## 使用动态库

使用dll库时需要一个同名的.lib，称为导入库。而windows下的静态库的后缀也是.lib。这是经常让人迷惑的地方。由于Linux没有对应导入库的形态，编译时直接指定.dll已可以。

但是MinGW移植的GCC做得更友好一点，编译时直接指定dll文件名，就可以生成可执行文件，其实是不需要导入库这东西。相比起来VC作为原生编译器，限制反而更多一点。MinGW作为Port，当然也能支持导入库。一般情况下VC生成的导入库可以直接被GCC读取(用cdecl导出的)，如果是stdcall导出的符号，因为VC会加上“`_`”前缀，所以把“`_`”去掉就可以给GCC用了。还有一种方式是用pexports从dll中导出.def文件，再用dlltool也能生成导入库。从这个角度看，MinGW直接支持编译时指定dll，也是理所当然的。

另外MinGW下有一个工具叫reimp，整个代码都不大，简单地看了代码，导入库的格式如下，头部的MagicNumber是`!<arch>\n`共8个字符，再之后是结构体

```
struct ar_hdr {
  char ar_name[16];
  char ar_date[12];
  char ar_uid[6];
  char ar_gid[6];
  char ar_mode[8];
  char ar_size[10];
  char ar_fmag[2];
};
```

而且这个结构体会重复多次出现，此结构出现两次后，会出现一段字符串表，所有需要导入的符号都在这里。但是数量上会多一点。比如dll有128个符号，字符串表会有128x2+3=259个符号。x2是因为每个符号都是有一个对应的`__imp_`对应符号，另外+3是在首部有`__IMPORT_DESCRIPTOR_`和`__NULL_IMPORT_DESCRIPTOR`开头的字符串，末尾处有一个0x7F开头的字符串(对应ASCII的del键，不是个可打印字符)。这3个去掉之后，剩下的导出符号就可以对上了。

最后用这个方法做了个试验，找到一个tcmalloc.dll，然后通过pexports生成.def文件，再用dlltool生成导入库，用gcc编译成功通过且能运行。直接用dll也运行正常。

## gcc与MS的C运行时关系

windows上的gcc，不论是MinGW还是TDM移植，都依赖MS的C运行时，定义`__MSVCRT_VERSION__`，为了守住最低版本兼容性，往往比较保守。比如gcc10该值是0x700，对应win7的C运行时

头文件和gcc不是一一对应，而是覆盖多个版本的gcc，并通过宏来区分支持的特性。比如3.4.5版本自带的头文件要求0x601以上才支持stat64，但gcc的值却是0x600，导致没有这个定义。我强行改之后能通过编译，但不确定运行是否有问题