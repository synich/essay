# 05-CSS框架学习笔记

不能和编程语言的框架类比，更像是一套工具集或是一种惯用法的集合。记录pico.css的要点

CSS三种使用场景语法不同，要注意区分

* HTML元素class属性：只有空格分开的多个原子化的css定义类。标签名、ID不写在class里，不在此论述
* JS选择器
* CSS定义样式：无空格的连写式和emmet的简写法一致，可以组合标签、ID、类、自定义属性。定义时，多个类名之间有无空格的含义完全不同，`.a.b`表示同时有两个类，`.a .b`表示a下的b类，但不匹配a。除了空格还支持`>`和`+`等更具体的关系描述符

## 伪类伪元素和定义变量

开头是这样一段代码

```
:root {
  --pico-spacing: 1rem;
}
```

`:root`是伪类，特指根元素也就是html。--开头是变量，在后面可以用var(--pico)取值。整段表示对html全局定义一些变量，方便后续使用。

一个`:`开头的往往是伪类，两个冒号开头是伪元素。还有似乎是厂商专属`::-webkit`或`::moz`。看这个例子

```
:where(nav li)::before {
    float: left;
    content: "-"
}
```

`:where`是比较新的伪类，用于选择具有子孙关系的元素；`::before`则是伪元素，整个连一起看就是选中nav下的li，然后在每个li的左侧加一个"-"

## 属性选择器

先看css中的定义

```
[data-tooltip] {
    position: relative;
}
```

按规范，HTML元素可以自由添加`data-`前缀的属性，不管值是什么，上述的选择器都能生效。比如`<p data-tooltip="123">hello</p>`。

如果写成`[data-tooltip=hi]`，表示值必须是`hi`才能生效。

### 多属性语法

如果是两个及以上的方括号，要怎么理解？如果是两个连在一起`[a][b]`，相当于and，既一个元素同时具有这两种属性时生效。

如果是通过逗号连在一起`[a],[b]`，则表示两个连续元素，分别有a和b属性时生效。比如`<button a><input b>`

## 问题排查

* 上下两个元素设置一样的 max-width,但显示时上窄不宽

原因是下面的元素设置了 padding 的左右值,而上面的元素未设置默认 0.max-width 默认表示 content 宽度,除非指定 border-box,才表示带边框的盒宽度

## HTML转PDF的技巧

CSS的@media print可以单独控制打印稿的样式，格式

```
<style>
@font-face {font-family:"MyF";src:url("file:///C:/Windows/Fonts/lucon.ttf");}
@media print {
p.xx_font { font-family:"MyF"; !important}
}
</style>
```

用wkhtmltopdf一定要加上--print-media-type才生效。-s 指定页大小，格式化的有 A0-A9, B0-B10，另外还有数种Letter, Ledger, Folio, Tabloid格式。要控制页边距，则用 -B -T -L -R 后面跟实际的物理单位控制。一台5.5寸手机大约在B7和B8之间。

指定字体更复杂一些，首先通过font-face定义一个字体名，并用绝对路径方式定位到字体，因为是src:url导入的外部ttf文件，所以必须通过css类关联到元素才能改变字体。
