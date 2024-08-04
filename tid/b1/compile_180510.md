# 实战flex和lemon要点

以前写过flex和bison的实战，这两个工具出现在70年代，bison生成的主函数入口名只能是int yyparse(),内部强制调用yylex函数，语法驱动词法，传递数据使用全局变量的形式，从代码美学角度看相当令人不快。最近学习了SQLite项目下的lemon，从语法分析上来说比bison更简洁一些。PHP开发组在10年曾发起动议用lemon替换bison，不过后来不知何故不了了之。使用lemon配合flex可以直观地解决重入问题，bison也可以，但略复杂。

先说flex生成可重入代码的方式，使用`flex -R`或者用%option reentrant都能达到效果。生成的函数原型变为`int yylex (yyscan_t yyscanner);`。通过yyget_text(yyscanner)和yyget_leng(yyscanner)的调用方式，取代了以往全局变量yytext和yyleng的使用方式。

在使用前后要分别调用`yylex_init`和`yylex_destroy`。如果要指定输入文件，用`yyset_in`函数(非重入版也有这个函数)。和lemon配合时，flex是驱动者，每条规则匹配的执行动作不需要return，而是在执行动作中从yyscanner提取token，处理并交给lemon进行解析。

lemon只是生成解析函数，被词法驱动调用，函数原型如下，函数名可以自定义。

```
void Parse(
  void *yyp,                   /* The parser */
  int yymajor,                 /* The major token code number */
  ParseTOKENTYPE yyminor       /* The value for the token */
  ParseARG_PDECL               /* Optional %extra_argument parameter */
)
```

major表示符号类型，所以固定为int就够了。相应的minor是该符号的值，需要自定义union才行。minor主要用在shift和报错时用。

用%name xyz指令可以替换Parse成你想要的函数名，一共会导出7个函数，其它都是以static约束并以`yy_`开头的内部函数。这7个函数只有主函数和Alloc及Free必须使用，Init和Finalize似乎不应该暴露，还有两个Trace和StackPeak是辅助用途。

类似%name这样的指令共有23个

```
name
include
code
token_destructor
default_destructor
token_prefix
syntax_error
parse_accept
parse_failure
stack_overflow
extra_argument
token_type
default_type
stack_size
start_symbol
left
right
nonassoc
destructor
type
fallback
wildcard
token_class
```

改为可重入后，很多函数声明被改变，但工具并没有自动生成对应的接口申明，必须手工补齐，是个不足。

flex和bison配合的时候，每当识别到一个符号动作的最后，都会return该符号对应的枚举。但和lemon配合时，如果在词法动作中执行lemon的Parse函数，就不需要return。因为lex函数内有个while循环，只要不return就会不停地找下一个符号。不考虑初始化和结束动作，只要调用yylex();Parse();就是解析的全部了。

lemon内部也有while循环，其目的是收到新的符号后，可能会反复的shift或reduce。直到出现错误或者栈溢出结束循环。

lemon在计算规则时会计算shift、reduce和shiftreduce的范围。shift的最小值是0，只定义最大值，另外两个既有最大也有最小值。

解析函数根据计算的act的区间范围，调用shift(shiftreduce也算shift)或reduce。因为Parse内有循环，只要正常一定会reduce到accept状态，都不属于只能是错误。

lemon在解析y文件时，有22种分支，包括自动机状态，出错和特殊符号的处理。

lemon不允许开始符出现在规则右侧，因此一定要为开始符定义一条专门的规则，从生成的代码可以看到，开始符的规则在default分支，是最特殊的，这条规则通常什么也不会做。如果一条产生式有多种写法，不需要写`|`，把不同的产生式分开写出来，lemon会负责合并这些规则。因为每个语句最终都对应到一个case，这样考虑的话分开写反而更自然。

`token_type`标识lex的终结符，而`type`标识lemon内的非终结符。

除了用指令，有3个宏可以控制lemon的Parser结构。分别是水位警示、错误回退和栈增长控制。reduce需要用栈暂存数据，bison默认深度是200，lemon是100，但是可以定义宏为负值做到自增长，如果不定义宏，到100就报错退出了。产生式的每个符号，以最右边为0，向左依次-1并在栈上可以找到。

## lemon阅读

lemon生成后的代码大多数是表驱动，虽然大的结构能看懂，但怎么得到表却要看本体才能明白。

程序有几个结构要关注，除了最大的lemon，就是rule、action、symbol最为重要。从入口来看，先确定终结符的最大个数，然后构造First集和Follow集。lemon的目的是得到一个语法分析器，但它自身又必须有词法分析，否则y文件都不能解析。

整个流程是如下几个步骤

1. 计算First集
2. 计算LR(0)状态机，次复杂
3. 计算Follow集（包含一个前置的FindLinks 不知道该怎么翻译）
4. 计算并压缩Action表，其中压缩可以通过命令行选项控制。此步已经是LALR
5. 生成LALR分析器，最复杂

计算First集要考虑空规则