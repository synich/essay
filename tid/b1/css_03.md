# 03-CSS布局

CSS最初并没有定位在布局功能，只是意外地发现盒模型配合float可以实现布局效果，但用float方式不仅需要很多hack手法，还破坏元素间关系，所以增加了flex和grid作为更专门的布局手段。

## 盒模型

盒子的元素包括 margin, border, padding, conntent 四个部分。前3个都是修饰，width, height默认只影响content，通过修改盒模型调整宽高生效范围。稳定性从高到低width>padding>margin。

PS: inline元素不能设置宽高，绝对定位也可以通过边界位置反过来控制宽高

盒模型定义大小，定位决定位置，共同构成布局。相关的三个关键字的优先顺序为display(不为none)>float(不为none)>position。

## display

规范定义的盒模型只有block和inline两大类，block的原始语义是一个元素占有一行，主要有div/list-item/table这几种。block能内嵌block/inline，而inline只能内嵌inline。（题外话：由于table的历史比CSS更早，所以CSS用在table时，会有特殊的地方。再提下CSS与HTML历史的兼容性，由于CSS出现得比HTML晚，因此它一定要把HTML中所有的元素的特性纳入到自身的体系结构中。比如HTML的head标签不会显示，对应盒模型的属性就是display:none，不会影响布局，而body就是display:block，作为顶层的BOX容器呈现。任何新生事物都要能包容已有系统的能力，才是可被推广的系统。）

inline-block方式是对早期bug的一种不得已的合理化。比如有3个顺序的div，如果1和3都是inline-block且总宽度和小于父block，直接把1和3排列到一行里，如果这一行的剩余宽度还能放下第2个div，就放在同一行，否则在下一行排列。但是如果第二个div是float:left，会放在第一个div前面。

## float

CSS早期的术语来自印刷排版，被用于布局的float就来自印刷的图文混排。float用在布局时，一个父div内顺序放置多个div，每个div都设置成float，宽度未满时从左向右排列，如果宽度达到父div的上限，另起一行排列。举例来说，如果父div的宽度是90%，第一个子div是50%，第二个子div是40%，这两个就在同一行，如果第二个也是50%，就会被挤到下一行。

归根结底本来每个div单独占据一行，如果想让多个div在同一行，就要破坏div的block特性，让想处在同一行的多个div能float(漂浮)起来，注意必须都float才行。一旦这样块之间就再不是固定的排列关系，而要取决于div宽度总和，如果宽度够就被放在一行了。如果超出了，还是排列到下一行。排到下一行后，可以用left或right来决定对齐方式。

## position

字面意思是定位，是布局的补充，display和float还处在同一个平面，而position引入z-index，可以叠在其它元素上，实现特殊效果。除了z轴还有left,right,top,bottom可设置。position有几种选项

*relative 自由性在定位中最弱，但比float强。原始的位置仍会保留，相对原始位置布局。
*absolute 实现精确和自由地定位，但强依赖尺寸计算，不可滥用，有些场景反而不如float好用。定位的基准是第一个设置过position的父元素。如果不想全局定位，通常会把父元素设置成relative
*fixed 类似absolute，多了滚动时固定效果
* sticky
