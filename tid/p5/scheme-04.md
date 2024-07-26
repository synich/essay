# 04 【译】Scheme的面向对象呈现（部分）

by 140225

## 关于Scheme的OO呈现

话题因为读者疑议而起，川合先亮出自己的观点，Scheme的OO呈现和别的语言并无太多不同，只是因为规范里没有定义，导致了多种不同的实现。如果采用CLOS的风格（他自己的Gauche就是），形式上就是（动词 名词）。这和很多OO语言采用名词.动词在语法顺序上是反的。但这不是更自然吗？川合先是吐槽，很多人认为名词 动词的方式更合理，只是他们早就习惯了这种方式，并没有真正去思考为什么。

## 抽象的角度

程序常说要抽象，是以对象还是函数来抽象？川合觉得如果以函数为抽象，将函数互相传递可以带来更丰富的表现力。

以树的遍历为例子，如果是面向类的话，需要事先定义tree, leaf, node这些类。

如果是函数导向，则将对树操作的函数是这个样子：

```
(define (tree-walk tree proc leaf? walker)
    (define (rec node)
      (walker (lambda (n) (if (leaf? n) (proc n) (rec n))) node))
    (if (leaf? tree) (proc tree) (rec tree)))
```

leaf?取树的节点，返回是不是叶子，walker是取得树节点的函数，对node所有子节点进行高阶函数调用的方法。如果树是用列表来表现，leaf?就是(lambda (x) (not (pair? x)))，walker就是for-each。树如果具现化为文件系统，leaf?就替换为file-is-directory?，walker就是(lambda (proc x) (for-each proc (list-directory x)))

类指向的好处是，看到数据定义，可以知道要如何操作，但操作就必须要从具体的类或树开始继承（如果支持接口继承，会好一点）

函数指向的好处是，在呈现概念时比较纯粹，对树可能的操作并不作限制，如果要让tree-walk运行起来，只要传入适当的leaf?和walker函数就可以。但是也存在可能需要传入的函数不止2、3个，可能会是5个甚至10个，如果看这10个函数，就很难发现tree-walk的本来用意了。

## 实例解读

看了翻译的文章，看个实际的Gauche-Scheme对象系统，它上承STklos，是从最早的TinyCLOS继承下来的概念，有三个最重要的概念

* Class
* Generic Function
* Method

CLOS系统中，Method并不属于特定的Class。通过define-method宏定义出来的变量，
是Generic Function的实例。

Gauche的write/display函数，面对一个复杂对象，会调用和这个对象有关的
write-object函数，通过它来呈现。类似Lua的`__tostring`或JavaScript的toString方法。