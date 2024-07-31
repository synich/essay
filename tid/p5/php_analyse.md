# 90 【转】对PHP的分析

我不考虑可以用封装库解决的问题，比如不考虑 JSON api，in_array 默认 == 等等
我不考虑各种 VM 实现的问题，比如 C 扩展常驻内存

我不考虑 PHP 文档的问题，不考虑 PHP 历史上的问题，比如 5.3 中不能 parse $cb()()
我不考虑 parser 的报错信息难读问题

文章内容目录：

* FP：set! 和 defun 是不一样的，但是 PHP 连 set! 都不如
* MP: MP 不是 toString 或者 any -> String， 而是 Expr -> Expr 和 Expr -> Q
* OO: The big idea is messaging.

eechen 说我们可以使用 $func来在 PHP 中实现 FP，但是这是不可行的。让我们考虑最简单的 fib
```
$fib = function ($x) use ($fib) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($fib, [$x-1]);
};
var_dump($fibs(10));
或者

$fib = function ($x) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($fib, [$x-1]);
};
var_dump($fibs(10));
```
二者皆会报错，第一个说找不到 $fib，第二个说 $fib 是没有定义的 NULL。

继而我们猜测这只是 PHP 解释器的一个小 bug，我们只需要把 closure 的位置在 AST 往下压一层之后 use 就能找到了，比如
```
function id($x) {return $x;)
$fib = id(function ($x) use ($fib) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($fib, [$x-1]);
});
var_dump($fibs(10));
```
依然是找不到 $fib。


可能这时候我们只是认为 use 之前需要声明，只是一个 php 解释器上实现的一个小 bug，比如
```
$fib = NULL;
$fib = function ($x) use ($fib) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($fib, [$x-1]);
};
var_dump($fibs(10));
```
结果是 $fib 在 closure 中对应的值 NULL，无法被访问。

这就是我们说 PHP 既不支持函数作为第一成员又没有 scope 的原因。scope 是作用域内 symbol 和 value 的绑定。PHP 并不存在一个正常的讲上层 scope 的某个 symbol 映射放到 closure 中的方法，PHP 的所谓的 use 只是即时地在 closure 中插入一个 $fib = NULL ，而并非是将对 $fib 的访问转移到上层 scope 的访问中。

简单来讲，**PHP 所谓的 scope 不是 scope，而只是一个解释求值的 barrier，你不可能访问上层 scope 的 symbol。而 php 的 closure 也不是 closure，php 的 closure 只能绑定 value 而不能绑定 symbol。**

如果说要强行 $func 来实现自指递归或者互指递归也不是不可以，那么你需要这么写
```
$scope = [];
$scope['fib'] = function ($x) use ($scope) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($scope['fib'], [$x-1]);
};
$fib = $scope['fib'];

或者更加规范的，默认使用的 scope 入口和 defun

function createDefun($scope) {
   return function($fname, $definition) use ($scope) {
       $scope[$fname] = function () use ($scope, $fname, $definition) {
          $args = func_get_args();
          $scope[$fname] = call_user_func_array($definition, array_merge([$scope], $args));
       };
   };
};

$sp = [];
$defun = createDefun($sp);
$defun('fib', function($scope, $x) {
  if ($x == 0) {
    return 1;
  }
  return $x* call_user_func_array($scope['fib'], [$x-1]);
});
$fib = $sp['fib'];
```
我只是觉得，「一个语言支持 FP 范式」和「一个语言需要自行实现 scope 然后就可以通过手动注入 scope 然后就可以 FP 了」应该是完全不同的两个意思吧？

这也是我们说 「PHP 不是一门支持 FP 的语言」时和说「JS，Py 等等可以写 FP，但是毕竟不是一门 FP 语言」的不同。如果我们有其他语言的经验，（无论这语言是 Py2/Py3，JS，Perl5，还是利用 operation() 当作 function 的旧 CPP，甚至是他喵的 MatLab），我们可以看到他们访问上层 scope 中的 symbol 是自然而然的；而 PHP 我们要么自己实现一个 scope 和 defun，要么就是使用 array(__NAMESPACE__ . '\' . $className, $funcName) 和 static 这种并非设计为 FP 的 ugly hack。所以我们可以安全地宣称，PHP 是不支持 FP 的。

PS：在本节末尾指出来一下， eechen 原文误以为「PHP 变量可以绑定类」，实际上 PHP 变量只能被赋值为类的实例而不能绑定类。这种不能绑定类特性的缺乏导致了没法实现 immutable-js BaseRecord = Record({...}) 之类的基于函数的类派生，也对实现利用 cache 来加速 immutable 变量的生成增添了很多不必要的 boilerplate code

MP: MP 不是 toString 或者 any -> String， 而是 Expr -> Expr 和 Expr -> Q

一个语言是否具有 MP 的能力并不是其是否有一个叫做 XXXRefection 的方法，实际上 PHP 的 reflection 只是一系列拿到源码的 toString；这类方法在其他语言中也是常见，比如 ES3 时代就有了 Function.prototype.toString这样的方法
```
function hasContent() {/*
    Line 1
    Line 2
    Line 3
  */}
var content = hasContent.toString.split('\n').slice(1, -1).join('\n')
```
如果我说 ES3 时代就实现了 MP，我觉得我会被 JSer 打死。甚至 ES5 时代 styled-component 通过了 Tagged templates 实现了 JS 中解析运行 CSS，JSers 也没有吹什么 「JS 是一个支持了 MP」的语言（虽然我明年准备看看能不能借用 tagged template 可以访问 js obj 的特性来实现一些简单的可访问 JS 变量的 DSL，当然这只能说能有一点 MP 技巧；和真正利用 MP 做 code gen 离得很远）


MP 是利用已知代码进行 code generaation 的手段。比如 Julia 如果不想多次写 dimension 可以（免责声明：自转行后大概有一年没写 Julia 了，所以下面可能会有简单的语法错误或者漏写 global 或者 quote）

const c = @cmm( squeeze(sum(mean(a,3),2))) ## cmm stands for common math macros

扩展成如下代码以避免写两次 dimension

const c = squeeze(sum(mean(a,3),2)), (2,3))

同样我们可以轻松地在处理 NaN 的时候利用 macro 来做替换

const c = @cmm( periodic(mean(x,2, isNaN=false)))

替换成这样的形式，也就是我们在没有提供 isNaN 接口的时候，一定程度上可以类似用写 R 的方式处理数据

const c =  periodic(nonNaNMean(x,2))

甚至可以模拟一下 typeclass，下面是利用 MP 将 svd, eof, 等等方法从 Array{Float, 2} 扩展到 Array{Float64, n} 的一种 macro 示例

```
const (eofs, pcs) = fuck2D(
  quote
    global SST // SST is a 3D array of lat * lon * time
    describe(SST, 3) // 3 is the timal dimension;
    return svd(SST)
  end
)
这将扩展成现将 SST 转成 2D array， 然后将 分析后的 1D array 转回 2D 的方法

const (eofs, pcs) = do
   global SST
   SST_config_#1 = create_Dconfig({timal_dims: 3})
   (SST2D_#1, from_1D_to_sp, from_1D_to_timal) = decompose(SST, SST_config_#1);
   (eofs1D_#1,pc1D_#1) = svd(SST2D_#1)
   eofs_#1 = intercept_1D(eofs1D_#1, from_1D_to_sp)
   pcs_#1  = intercept_1D(pcs1D_#1, from_1D_to_timal)
   return (eofs_#1, pcs_#1)
end
```

这类宏生成代码节省了大量手动写 adapter 的时间，实现了类似 type class 的效果。另外一类常用的 MP 做法是将任何一个需要埋点的函数
```
function func(a,b,c) {
     return func(a', b', c')
}
这类代码转换成类似

function func_effect(f, a, b, c) {
      call_effect(f, a', b', c')
}
```
这样我们可以在 call_effect 中使用统一的 effect 处理和上下文传递等等。

首先PHPer 看不懂 MP 但是又说 PHP 支持 MP 难道是我的错么？
这里只是展现一下为什么 MP 的实践需要 AST；在这类需求中，文本替换然后 eval 显然是不安全而且不够灵活的。不在 AST 上 walk 一下还能怎么办呢，难道拿头锤 regex 做替换？

一个 PHPer 可能会争论说其实这类 MP 实践在 PHP 中是可以做到的；然后他可能会举出类似于 Roave/BetterReflection这样的库；显然，在看过这种库之后，即使不懂 MP 也能发现很明显的风险：

其 parser 库并非是 php 解释器自己的 parser，而是另一种 PHP 实现的 https://github.com/nikic/PHP-Parser ；也就是任何 PHP-Parser 和 php 解释器 parser 的不一致都会影响到结果 （而且难以 debug）
PHP 并没有 eval(Expr) 的手段，对于变换后的 AST，需要使用 PHP-Parser 来 write string，然后执行转写的 string。这不仅仅依赖于 PHP-parser 的正确性，而且任何 php 的报错都会在 eval 这一行，eval（string） 永远是危险的呀

而且不可避免的，这样的 parser 实践还会导致所有含有副作用的语言中 MP 共同要面对的问题：副作用跟踪。考虑到我们在某个文件中元编程两次

eval(AST2String(expr1))

eval(AST2String(expr2))

如果在 expr1 中含有了

function foo {...}
bar_effect = ...；
然后 expr2 含有了

function foo {...}
bar_effect = ...;
然后 expr1 的部分结果就有被 expr2 覆盖的风险。

在 Julia 中，macroexpand 直接会分析上下文并且在变量后面加上 `_#number` 这样的后缀防止覆写变量；而且很多 lisp 系语言中，eval 本身是 lexical scope 下在一个新的 scope 进行的。

OOP：三原则或者四圣谛只是 90 年代类似 Java 语言对于 OOP 的一种实现手段而已

本来我以为我这里不需要解释一下 extends 的问题，可以直接讨论层次复杂度和静态检查的关系。我发现我还是必须引用一下 Alan Kay 的名言 [The big idea is "messaging"](http://wiki.c2.com/?AlanKayOnMessaging)

只要我们能够实现层次划分和父子 components 之间的 messaging 传递，那么 OOP 所需要的 divide and conquer 是自然而然的，而且会便利实现 testable module （类似于为了测试方便， database 仅仅被实现为获得值和更新值的一种特例，而非必要的 backend）。

而旧时代的 java 以及其所代码的三原则，实际上很容易出现两个很讨厌的事情，一者是子类对父类的副作用污染，另外一种是只要一个香蕉但是拿到了香蕉加猴子加森林。

当然 data class 和 sub typing 本身就是很讨厌的强行 binding 数据和方法的手段，但是如果不得不这么做了，实际上我们更常委托的方式而非 extends 的方式处理父类和子类的关系。当然，把大部分所需要的方法重新写一遍是很讨厌的 repeat yourself 行为。所以对于动态语言，我们常常依赖约定自动推导 b -> f a -> f b 或者 (a-> b) -> f a -> f b 来压缩类的层次。Java 等等静态语言虽然不能使用这种方法，但是静态分析可以保证在使用工厂或者其他委托方法时候代码的正确性。

然后 PHP 学 Java 了，但是问题是 PHP 能够用静态分析保证委托足够复杂时的正确性，PHP 行么？没有静态分析学 java 就像猪学鸟跳出飞机一样。

尾声

如果你不会 FP，不懂 FP，也没写过 FP，那么就不要说别人「无脑黑 PHP 不支持 FP」
如果你不会 MP，不懂 MP，也没写过 MP，那么就不要说别人「无脑黑 PHP 不支持 MP」
如果你对 OO 的理解只停留在三原则上....算了，对于这种 ill-defined 的东西你开心就好
如果你只会 PHP，或者只会用 PHP 的方式写很多副作用满天飞的语言... 就不要讲什么「好的程序只和程序员有关，和程序语言无关」；这类编程经验不能教人「什么是好的程序」

其实说句实话，作者还真不是了解 php，起码一些基础不行，简单的问题复杂化了，或者是 JavaScript 给你了一些固定的思维方式。明显就是作用域问题，至于为什么 use 继承不了，考虑考虑操作符优先级。

```
$fib = function ($x) { 
  global $fib;
 if ($x == 0) { return 1; }
 return $x * $fib($x-1);
};
```
var_dump($fib(10))