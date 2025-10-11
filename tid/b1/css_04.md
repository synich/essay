# 04-CSS高级布局

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

父元素使用`position: fixed`保持锁定，子元素使用`position: absolute;bottom 1em;`实现沉底效果

### 特性解释

为什么会有高度(边距)塌陷

> 其实是为了兼容老一辈设计师，堆叠两个元素时，如果叠加边距会很难看，标委会做了妥协，认同了塌陷这种反理工男直觉的特性。

## BFC(Block Foramtting Context)及其兄弟

CSS2.0有了Fomatting Context概念，到了2.1明确定义了BFC和IFC；到3.0更是为flex和grid定义了FFC和GFC概念。

涉及脱离文档流的场景，就可以用BFC。通过对父元素添加overflow:auto/hidden;display:flow-root;都可以会触发BFC，父元素会强制计算子元素的布局，使得布局正确。BFC只是改变了布局计算方式，并没有改变浮动属性。BFC的三大作用

* 清除浮动
* 包裏浮动
* 避免塌陷

### Stacking Context定位上下文

不同样式触发的BFC在计算时会有些小差异，比如absolute子元素无法参与布局计算，这时只有overflow: hidden;能将外溢部分裁剪clip，其它BFC方式则没有这种能力。更技术的讲，overflow内含absolute/float时，会隐式创建定位上下文，其他BFC不具备，所以子元素会溢出。

定位往往和浮动相关，又和z-index有紧密联系。