# flex和bison的理解

这两个工具是编译理论都会介绍的经典工具，分别用于词法和语法分析。词法比较简单，虽然有NFA和DFA的区分，但总的来说就是把原子的字符按规则合并成符号，但语法分析就有LL和LR两种差异很大的流派。从词法分析向LL演进，是比较自然的方式，但词法进到LR，中间存在一道鸿沟，这时我觉得更好的做法是先学习LR的语法分析，理解LR的思维，自然就明白为什么、何时需要词法，以及flex和bison两个工具的协作模式。

为什么Bison这种通过工具生成解析代码的方式被称为LR分析器，而手写解析器一般都是LL分析法呢？这两种方式都是BNF的解析方式，而BNF属于产生式文法，指先定义文章包含段落，段落包含句子，句子再包含单词，着眼点是从最顶层的结构，逐步扩展细化，最终推演到单词环节结束的过程。

不管是LL还是LR，解析词法符号都是从左向右，两者都是L，没有不同。如果将符号形成一个句子，就有了分歧。手写分析器是从左向右一旦符号成为一个合法句子，解析结束，优先从最左侧进行推导，所以称LL法。而Bison的解析思路，即使已经达到推演条件，还会继续读进符号，只有在读进的符号不能推演，才会结束，优先从最右侧进行推导，所以Bison的作法称为LR。看Bison的规则，人脑很难自然地联想出从文章细化到句子乃至单词是怎么结合上的，因此LR方式通常是用机器生成代码。

LL的术语是First/Follow集，而LR则称为shift/reduce。读入符号(shift)再生成句子(reduce)，这和书写yacc的规则是逆过程，不过不用担心，工具会把正确地完成这个逆过程。既然要先shift，就一定会有栈保存符号，Bison在语法分析前，先创建200长度的数组作为栈。每条规则的执行都会改变栈的深度。默认规则动作$$=$1就是在栈保存值，有这个值后面的解析才能找回值。

生成词法解析代码用flex一个二进制文件就够了，而生成语法解析代码不能只有bison二进制程序，必须配套多个m4脚本，这些文件称为skeleton（比如yacc.c或lalr.java等代码模板）和XSLT的输出模板目录，保存在/usr/share/bison。而且不同语言用到的文件也不一样。比如要实现C语言输出，至少要7个文件。

## flex

调用flex不需要特别的选项，windows平台可以加一个`--nounistd`防止编译错误。

lex的外部输入源有文件和字符串两种形式，但内部归约到一个统一的宏`YY_CURRENT_BUFFER`，这个buffer在lex内部以栈的形式保存，可以存在多个，也可以push/pop。

buffer可以从`extern FILE* yyin;`创建，默认读出16K的内容来生成buffer，也可以是字符串，字符串可以包含0。使用文件方式比较简单，在yylex函数中，如果判定外部没有初始化yyin，则将它赋初值为stdin。
因此在函数入口需要申明`extern FILE* yyin;`并从希望读取的文件来给yyin赋值。
如果不使用yyin，也可以用字符串，方法是用`yy_scan_string(C风格字符串)`或`yy_scan_bytes(二进制串)`指定字符串，再将返回的`YY_BUFFER_STATE`指针传给`yy_switch_to_buffer`，这样yylex()的输入就自动定向到字符串了。当然记得最后不要忘记调用`yy_delete_buffer`把指针给释放了。

lex的第一部分，要写上%option noyywrap(对版本有要求)，因为lex产生的代码会用到yywrap()这个函数，也可以把这个函数直接定义成`#define yywrap() 1`，上述这句也就是lex帮你定义这个宏。如果%option没用，变通方式直接定义yywrap()函数并返回1也可以(这也是flex库默认提供的实现，因为这个库太没用，基本都是手写这个函数)。
lex可以更改默认的变量名前缀，不用yy。如果把lex和其它语法分析器配合使用，会有效果。另外lex支持生成可重入代码，但在和bison配合时比较别扭，关于可重入的说明，在lex和lemon的文章中介绍。

### 踩坑记

flex的action部分如果要输出`[[`，比须写成`"[""["`，否则不仅会被吞掉还会警告。示例将py的长注释转为lua格式，方括号要转义

```
\"\"\"|\'\'\' { EXATR(v); if(0==v->st_lc){ TRANS("--[""["); v->st_lc=1;
```

## bison

bison处理文件最好加上-d和-t -r all选项，-d输出头文件，用于给flex指明终结符的定义，后面会详述。-t -r all输出详细报告，报告的内容分4部分

1. Grammer：从0开始编号，0也是终结态$accept，自动生成。其它都是用户自定义规则
2. Terminal：每个条目都是一个符号且定义了int值，对应lex返回的枚举或该字符的ASCII值，有两个特殊终结符，$end(0，代表YYEOF)和error(256)
3. Nonterminal：对应rule。就包括$accept，还会详细标明每条规则出现在哪条grammar的左或右，左右是语法分析很重要的特性
4. 最后是各种state,从0开始编号，会显示具体的shift或reduce动作。如果有冲突，会提示哪几个state存在歧义，大多数state会带一个default的reduce规则，当然也有不存在default的。如果default对应的是accept，这个state就是最终态了

除了-t -r all选项，还可以通过-g和-x选项输出automaton的graph和xml report，报告类似分为grammar和automaton两部分

* Grammar是各条BNF规则的描述
* 接着是Terminal和Nonterminal定义,Nonterminal的第一条同样是隐式的$accept
* automaton是多个state的合集,描述的是各个state之间的转换关系,每个state下面有itemset、action、solved-conflicts
* action包括了transition（shift和goto状态）和reduction（和rule关联）

通过yacc的规则，也生成了解析的C语言文件，但是数据(终结符，用%token定义的符号)需要从lex获取。前面提到bison -d会生成头文件，这个头文件就是给lex包含的，lex自己不需要生成头文件（因为就一个int yylex()函数原型）。除去注释，yacc生成的头文件包含4条内容

1. 一个enum的枚举声明，对应yylex()的返回符号类型
2. 声明YYSTYPE类型，int或union，这里的S指semantic的意思
3. 声明一个YYSTYPE类型的变量，yylval
4. 声明int yyparse()函数原型(低版本bison不会生成)

除了第4条比较显而易见，说说前3条必须存在的原因

先说enum枚举。lex在识别词法后，yylex()的返回值要把词的类型告知yacc，所以需要yacc在首部申明`%token ***`，token对应终结符，正好对应lex，还有一种%type，对应的是非终结符，用在yacc内部。
这个头文件就包含了%token声明的枚举定义。%token/%type不是C语句，不需要;结尾，当然带了也没关系。

yacc能支持递归，因此写规则时会出现循环引用和空规则。以下是最简化的lisp语法解析

```
sexp: /*empty-rule*/ {}
  |   sexp one_exp {}

one_exp: '(' mul_em ')' {}
  |   T_VARNAME {}

mul_em: one_exp {}
  |  mul_em one_exp {}
```

当规则引用自身时，**自己一定出现在左边**，否则会无限循环，又因为是产生式规则，右边的式子代表最新reduce的结果。规则互相引用时，也会有些微小的差别，不然又会引起循环。

## 对外函数接口

lex和yacc各自对外的惟一函数分别是int yylex()和int yyparse()，两个函数都无入参且返回int。虽然是自动生成的代码，但抛开各种表的数值不谈，流程还是能看明白的。

yylex()看似没有入参但其实是通过外部变量作为输入源，一方面有历史原因，而且既要接受文件句柄，又要接收字符串，一种类型较难表达，只能退而求其次用一种并不巧妙的方式。出参是识别到的终结符类型枚举（文件结束时返回0），枚举值由bison定义，标识符枚举从258开始（跳过单个字符的范围），需要int来表示。

yyparse()无参但有输入，输入就来自于其内部调用的yylex()。yyparse()返回的int表示错误码，共有0/1/2三种值，0代表正确，1表示异常，2表示内存耗尽（比如shift导致栈过深）。

## 交互与变量传递

yyparse()调用yylex()，涉及两种类型的数据传递

1. 这次的token类型是什么？
2. 这次的token要表达什么含义？

第1个简单，通过yylex()返回的int来表示，第2个就相对复杂，让我们进入lex看。lex的上下文，当前识别出的原始字符串，保存在yytext里，类型是`char*`，长度保存在yyleng，它和strlen(yytext)是一样的。但是yytext是yylex函数内的变量，yyparse()不能使用，正确的处理方式：**将yytext处理并保存到yylval变量**。

yylval是由bison定义的全局变量，它是yy lookahead value的简写，代表了一次识别出的终结符的具体值，调用yylex()后，yylval就可能有了数据，在yyparse()内部将yylval依次保存到yyvsa数组（通过yyvsp指针），类型和yylval一样也是YYSTYPE。在bison的上下文，用$1、$2语法来引用yyvsp数组中的对应位置，从而实现了变量传递。YYSTYPE默认是int类型，不是玩具程序的话，肯定需要更复杂类型，就用到yacc的%union{}语法来替换int类型。YYSTYPE（就是刚才定义的union）包含在头文件中，lex才能看到union的声明，识别到符号后，进而将yytext转换成相应的类型。

yyparse()是双栈式推进，yyssa表示state stack，yyvsa表示value stack，状态栈记录当前shift或reduce的阶段，而语法分析并不是最终目的，还需要输出分析结果，因此每一步的中间值也要记录下来，所以就有了值栈。两个栈的初始长度都是200，如果栈满了之后可以通过自定义的栈生长函数扩容，但最大不要超过10000。yyssa的当前状态经过yypact和yytable的转换，可以计算出要从yyvsa上POP多少个元素，根据.y文件的定义对yyvsa数组进行索引定位。

## 实战flex和bison注意事项

日常处理协议要做太多的转换工作，想试着能否用类似google的proto描述方式来自动化生成。决定用flex和bison再配合一个script语言如lua或js来做。期间走了不少弯路。

语法解析的bison会强制要求实现`yyerror(char*)`函数，但其实回调的信息很简单，基本就是syntax error没有指向性，这是LALR的固有缺陷，有两个改善的办法。在yyparse()调用之前打开调试开关

```
extern int yydebug;
yydebug = 1;
```

能打印出每个符号读入，shift/reduce的步骤。

如果嫌错误信息太长，可以语法分析错误时增加行号显示，要做两件事

1. 让flex对行号自增，加这条规则 `\n {yylineno++;}`
2. 让bison在yyerror中显示行号

```
extern int yylineno;
void yyerror(const char* str){
  printf("\nBison error at line:%d, %s\n",yylineno, str);
}
```

还有个小的细节要注意，打印到stderr而不是用printf输出到stdout，在后期会体现出便利性。

flex解析后的token的内容保存在yytext，同时yyleng记录了有效长度。通常这个值要传递给bison，并在语法规则匹配后再利用这些值做逻辑，但是最好不要在bison直接用yytext，因为等到触发bison的规则时，yytext/yyleng表示的是最后一个token，前几个token的值无法直接用yytext得到。通常作法是把词法匹配后的字符串dup一份，这就要求bison在匹配后还要做free的动作，不仔细配对很容易出错，我的办法比较讨巧，既然要dup字符串涉及内存管理，不如直接把这时的yytext传给script engine，利用脚本的垃圾收集机制管理内存。即脚本在flex阶段收集素材，而bison阶段处理素材。

bison的规则允许直接用单字符的终结符，要用上这个特性，flex规则的末尾要写上`. {return yytext[0];}`，如果不写，yylex()不会返回这个单字符，而使用flex默认的ECHO规则将这个单字打印到console上，并不会传递给bison。

脚本引擎和分析代码之间的交互有两个接口，分别是在flex调用的push(token, str)和bison调用的reach(rule)。语言先用lua，最终还是决定换成更大众的JavaScript，一是为了自己熟悉，另外JS的受众更多，维护人员会更好交接。关于JS的引擎单开一篇写。
