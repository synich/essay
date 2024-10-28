# 08 Lua调试器clidebug使用说明

用lua -lclidebug xxx.lua来启动，进入后会停在第一行。
接下来介绍常用命令。

* setb linenum [file] -- 设置指定行号的断点，默认打在当前文件
* tb linenum [file] -- 设置临时断点，执行到该断点后，即取消断点
* delb linenum [file] -- 删除指定行号的断点，默认打在当前文件
* listb -- 列出所有断点
* run/cont -- 执行程序
* s [num] -- 单步进入，默认1步，可指定步数
* n [num] -- 单步跳过，默认1步，可指定步数
* fin -- 跳出函数
* p varible -- print, but format is somewhat different
* display varible -- 增加一个变量名到列表，以后每次单步会打印列表中的变量值
* undisplay -- 清空display列表
* vars [levelnum] -- 显示指定层级变量，默认1
* what funcname -- 显示函数信息
* exit -- stop debug

最后以上这些命令可以写在执行路径下的./clidebug.cmd里，比如文件里写setb 10，就能在启动后在10行打个断点。程序启动后会读这个文件，在经常调试时会比较方便。

大概说下原理，通过-lclidebug导入调试库，但这个库会先执行一个pause函数，
在pause里创建好一个协程coro_debug，这个函数会执行yield。
并通过debug.sethook(debug_hook, "crl")，
在debug_hook函数内，又通过debug.getinfo(level, "S")的方式得到执行的脚本名，
当debug_hook被回调出后，如果没有断点，则直接return，从回调返回，
把控制权交给主函数进行，即sethook的函数，如果有断点，会resume这个coro_debug函数，
在coro_debug里做while循环并io.read("*l")，等待用户输入动作，
只有run/step/next这三个命令，会触发yield动作，其它命名处理后，等待下一次用户输入。

这个流程的关键一环，是Lua自带了sethook这个函数，因为有了它Lua会在执行的过程中，
每次的call或单步，都会回调进hook函数。如果仅仅是这样，只能在hook函数中做一些固定的动作，
要让debug真正可用，就要在hook中引入协程，hook先让渡执行权，由用户来输入，
在协程中判断用户输入，如果是打印或设置断点，则执行后还在协程中，
只有step/next/run等命令，才会让渡回hook函数，每次hook函数被回调出来，
都会计算当前行号，如果这个行号上没有断点，hook回调结束，让主程序继续走下去。如果有断点，则resume协程。

通过这种方式，从而托管了后面的脚本文件的执行。

编程语言说到底还是函数的调用，调用成链必然会形成层次，debug.getlocal的第1个参数，表示的就是调用栈的层数。不同的语言可能表示法会有不同，lua用1表示当前的函数层（即调用链最末端的函数），然后以此为基准向main函数逐层递增。C语言的当前层是0，语言风格使然。恐怕不会有语言以main函数为1开始计算，这样的话很难定位到当前调用函数的层级，而出问题的往往是当前函数。

## 调试记录

mmm的dbop.lua，查某些词总是报错，但又没提示，将fetchall改用pcall，捕获异常处理查询乱码。最终定位到问题，`os.execute`传utf8字符串会偶现吞字符，比如"算 "输出后只有3字节，算的最后一个字节和空格被合并成0x3F(63)。只要吞字总是输出63，规律不明，只能base64转或输出到文件。但是用python就能正确传参。
