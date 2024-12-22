# 03-CSS布局

CSS最初并没有定位在布局功能，只是意外地发现盒模型配合float/position可以实现布局效果，但这种方式很hack且低效，还破坏元素间关系，所以增加了flex和grid布局。

## 盒模型

盒子的元素包括 margin, border, padding, conntent 四个部分。前3个都是修饰，width, height默认只影响content，通过修改盒模型调整宽高生效范围。稳定性从高到低width>padding>margin。

### display-布局总设计师

规范定义的盒模型只有block和inline两大类，block的原始语义是一个元素占有一行，主要有div/list-item/table这几种。block能内嵌block/inline，而inline只能内嵌inline。（题外话：由于table的历史比CSS更早，所以CSS用在table时，会有特殊的地方。再提下CSS与HTML历史的兼容性，由于CSS出现得比HTML晚，因此它一定要把HTML中所有的元素的特性纳入到自身的体系结构中。比如HTML的head标签不会显示，对应盒模型的属性就是display:none，不会影响布局，而body就是display:block，作为顶层的BOX容器呈现。任何新生事物都要能包容已有系统的能力，才是可被推广的系统。）

display: flow-root;这个属性全称是：display: block flow-root;，顾名思义，就一对外显示为block，对内创建一个独立的文档布局流（自身作为该布局流的根），而这个布局流构成的上下文即bfc。这个上下文对外表现出的独立性，就是包裹内部的浮动元素，不与外部的边距合并等效果

display: inline-block的全称是display: inline flow-root;，所以它也能开启bfc，和display: flow-root;的区别在于对外表现为inline。是对早期bug的一种不得已的合理化。比如有3个顺序的div，如果1和3都是inline-block且总宽度和小于父block，直接把1和3排列到一行里，如果这一行的剩余宽度还能放下第2个div，就放在同一行，否则在下一行排列。但是如果第二个div是float:left，会放在第一个div前面。

PS: inline元素不能设置宽高，绝对定位也可以通过边界位置反过来控制宽高

对整个页面来说，布局并不是只有一个，不同的局部块可以通过display设置不同的风格

## 传统（老式）布局

盒模型定义大小，定位决定位置，共同构成布局。三个关键字的优先顺序为display(不为none)>float(不为none)>position。

### float

CSS早期的术语来自印刷排版，被用于布局的float就来自印刷的图文混排。标准流是竖向排列的，如何实现横向排列是浮动的动因，因此浮动可以理解为横向排列，float只有左右两向，且浮动后z方向是同一层，不会互相覆盖

如果A元素上一个元素是浮动的，那么A元素会跟随在上一个元素水平方向的后边(如果一行放不下这两个元素，那么A元素会被挤到下一行)；如果A元素上一个元素是标准流中的元素，那么A的相对垂直位置不会改变，也就是说A的顶部总是和上一个元素的底部对齐，即跟在下面。

float用在布局时，一个父div内顺序放置多个div，每个div都设置成float，宽度未满时从左向右排列，如果宽度达到父div的上限，另起一行排列。举例来说，如果父div的宽度是90%，第一个子div是50%，第二个子div是40%，这两个就在同一行，如果第二个也是50%，就会被挤到下一行。

归根结底本来每个div单独占据一行，如果想让多个div在同一行，就要破坏div的block特性，让想处在同一行的多个div能float(漂浮)起来，注意必须都float才行。一旦这样块之间就再不是固定的排列关系，而要取决于div宽度总和，如果宽度够就被放在一行了。如果超出了，还是排列到下一行。排到下一行后，可以用left或right来决定对齐方式。

### position

字面意思是定位，是布局的补充，display和float还处在同一个平面，而position引入z-index，可以叠在其它元素上，实现特殊效果。除了z轴还有left,right,top,bottom可设置。position有几种选项

* relative 自由性在定位中最弱，但比float强。原始的位置仍会保留，相对原始位置布局。
* absolute 实现精确和自由地定位，但强依赖尺寸计算，不可滥用，有些场景反而不如float好用。定位的基准是第一个设置过position的父元素。如果不想全局定位，通常会把父元素设置成relative
* fixed 类似absolute，多了滚动时固定效果
* sticky

定位也可以理解为脱离文档流。流的两种概念

* 文档流: 相对于盒模型
* 文本流: 相对于文字段落

元素浮动后**脱离了文档流,但没有脱离文本流**。前半句是说紧随它的元素盒会占据浮动元素 Z 轴的底部位置；后半句则意味着紧随元素的文本,仍然认同浮动元素的文本,因此是跟随在后面。

float和absolute/fixed在大的层面都是定位，脱离了文档流，具有两个特性

* 包裹性: 元素默认的宽度会占满整行,哪怕内容很少,也会以空白填充满这一行。一旦加了 float,会导致盒的宽度收缩到和内容一样,这种情况下,就可以在该元素的水平方向继续放置别的元素(左右取决于 float 的值)
* 破坏性: 父元素的高度塌陷。float 元素脱离了文档流,导致父元素无法获取子元素的高度,于是父元素不再具有高度

## flex布局

有12个属性，分别作用在container和item上，此时float属性失效。

### container属性

* flex-direction
* flex-wrap
* justify-content
* align-content
* align-item

最后有个flex-flow是1,2的简写，熟悉后再用

### item属性

* order
* flex-grow
* flex-shrink
* flex-basis
* align-self

最后有个flex是2,3,4的简写，熟悉后再用

## grid

同样有container和item概念，分别有15个和10个属性

## 实践

侧边栏固定且沉底效果

父元素使用`position: fixed`保持锁定,子元素使用`position: absolute;bottom 1em;`实现沉底效果

### 特性解释

为什么会有高度(边距)塌陷

> 其实是为了兼容老一辈设计师,在堆叠两个元素时,如果叠加会很难看,标委会做了妥协,认同了塌陷这种反理工男直觉的特性。

BFC，通过display:flow-root开启。三大作用

* 清除浮动
* 包裏浮动
* 避免塌陷