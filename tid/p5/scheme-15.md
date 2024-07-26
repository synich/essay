# 15 Lisp的语法真的是括号吗

by 190601

1. Common Lisp 己经有 package 和 gensym 两个机制防变量捕捉，除了麻煩点并无硬伤，且有向旧的 Lisp Machine Lisp 等兼容的考量。

2. 提 hygienic macro 的，无非说的是这个，也是 Scheme 用的那个 sytanx

The original algorithm (KFFD algorithm) for a hygienic macro system was presented by Kohlbecker

先加点私货说 Scheme，先学 Scheme 的大多有个通病，老是想著用 list，因為 R6RS 里并沒有 struct 嘛，毕竟搞理论的人用的。用 struct 有什么好的呢？或者说以实用标榜自已的 CL 有什么高见吗？ Lisp Machine Manual 有讲：

*The contract from ship to its callers only speaks about what happens if the caller calls these functions. The contract makes no guarantees at all about what would happen if the caller were to start poking around on his own using aref. A caller who does so is in error;*

CL 的核心是 CLOS，在 OOP 中，object 是有 contract 的，尽管一个 object 本质可能是个 array or list，但还是要用 contract 提供的 accessor，用 nth or aref 就是 violation。这就是 CL 和 Scheme 的思想区別了。

学 Lisp，尤其 CL 要有一个概念牢記，我们写的 (defun foo (x) ...) 等等，都不是表达式，而是由 reader 读成名为 list 的数据结构，编绎器直接 compile 的是数据结构。实际上数据结构是不是真的 list 都不重要，只要 hack 下 eval，用 array 以致 class 表示代码都可以。CL macro 的思想，就是直接通过语言自身处理因为灵活性可能出現的各种数据结构。可能这个只有熟練 CL 了以后才能体会，但我以為，這就是 CL 所代表的 Lisp 本貭。在进一步，以後写 CL 都不需要用文本，代码項目直接保存为数据结构。

而 Scheme 的 syntax，就有了个 assumption，就是代碼只能是 List，只能限于 S-exp，不然就要 heavily hack 它的 syntax 的系統，而在 CL 中一用 defstruct 各種 handler 就定义好了，不用特別为用 macro 实現个什麼東西。同理其他比如 Rust Clojure 的 hygienic macro，都用的是 pattern match，包括 Scheme 在內，它們在设计時都还停留把代碼當表达式的层次。
