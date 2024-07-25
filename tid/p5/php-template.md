# 04 PHP模板引擎学习

用了3种模板引擎，从Smarty入手，但是这个库很大，文件又多。另外找了两个模板库，
TinyButStrong(简称TBS)和RainTPL。TBS这个库很有欺骗性，可能和Smarty比确实小，
但也有近150K。说真的不能算tiny，而且它的功能有点过于强大了。
可以直接把SQL查询语句写到模板赋值里，
这大大超过了我的期望。RainTPL是个约30K的单文件，在3者中最符合我胃口。

既然是模板引擎，除了最常用的赋值，次常用的就是循环了，TBS太复杂，
就比比Smarty和RainTPL吧。

Smarty的循环语法相当不直观，类似下面这样
<pre>
<% foreach item=rs from=$arivList %>
<% $rs %>
<% /foreach %>
</pre>
尤其是item=和from=那两句，每次都让人无法记住，而且你还不知道怎么表示key。
反观RainTPL，简单到爆啊有没有
<pre>
{loop="arivList"}
{$value}
{/loop}
</pre>
RainTPL直接把键值命名固定，和Tiny一样。其实我觉得这种地方真没有定制化的必要，
都是程序员，简单直观就行了。有现成的$key和$value，谁愿意自定义啊。
而且自定义又增加了上下文关注的成本，我觉得是非常不划算的。

从刚才的循环可以看出，RainTPL使用了`{}`花括号对方式来标记，
和TBS的`[[]]`又或者Smarty的自定义一样，和HTML区分开。这里又要说说Smarty，
这种没有必要的自定义，挺分散精力的。

RainTPL除了{loop}和{/loop}之外，也提供了常用的其它语法

* {include="xxx"} 从html模板的目录下导入文件，由于RainTPL可以配置后缀，
所以这里不用填.html字样
* {if="expr(true/false)"}{elseif=""}{else}{/if} 分支语法，风格一致很好记
* {function="foo($bar)"} 在html写函数，不过暂时觉得没什么用？
* {$value.name|strtoupper} 把一个变量作为`|`后面的函数的参数，用返回值替换，
有点pipe的味道，不过我还是倾向尽量不要在模板中引进这种太花巧的语法。
* {noparse}{/noparse} 在这中间的变量不作转换
* {ignore}{/ignore} example没有示例
