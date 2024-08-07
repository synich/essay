# 09 lua闭包和其他语言比较以及修改upvalue

## 闭包能力比较

构建闭包的特殊性在于捕获非本地的栈上变量，如果是访问全局变量，不能称为闭包。最早明确这个特性的大约是scheme吧，lua和js也照样实现。而python则用nonlocal关键字更加显示地表明要捕获上级栈的变量，但同时又不能是global，所以看似怪异，细想倒也有几分道理。

```
def foo():
    conf = 555  #  newclo捕获这个变量稀松平常，都能做到
    def newclo():
        nonlocal conf
        print(conf)

def main():
    conf = 111  # 起初以为即使foo中不定义conf，lua和js能捕获这个定义，但python和scheme不行，实际是lua和js把变量提升为全局变量，能引用但已不是闭包了
    foo()
```

## 修改闭包自由变量

lua闭包中引用的upvalue类似于面向对象中实例的私有成员，是不应该被外界修改的，或者说外界也感知不到这个存在。今天看lua的手册，debug库中存在getupvalue/setupvalue函数对，利用这两个函数可以获取/修改upvalue。这两个函数访问upvalue的方式是用一个int类型的index编号，而文档对这个编号的含义也不作保证，所以这个功能放在debug库也算合理吧。

首先对闭包来说，upvalue是什么时候创建的呢？是在lparser.c中由解析过程创建的，当解析器每识别一个变量，如果这个变量在函数栈上未定义，则会逐级地往上找直到找到为止，之后就在函数的proto中增加一个upvalue。因为每个闭包都含有独立的upvalue列表，所以upvalue必然是词法定界的。

虽然文档说index的含义是随意的，但通过代码还是可以知道，就是upvalue在函数中被最先引用的顺序。如果一个函数定义如下：

```
local function foo()
  local b = 2
  local a = 1
  return function () print(a) b = b+1 end
end
```

内部返回函数先调用了print(a)，print在栈上未定义，则它就是第一个upvalue，又因为print是定义在顶级函数的`_ENV`变量中，所以这个函数的第一个upvalue就是_ENV，第二个自然是a，第三个是b。这个a、b的定义顺序无关。另外由于`_ENV`是在lua5.2后引入的定义，在lua5.1中的话，1就指a，而2是b。也就是说这个功能是版本不兼容的。不过本来lua的兼容性就不是完美向后，且这个又是个debug函数，考虑到引入`_ENV`后的概念统一性，这个变动还是值得的。

至于在其它语言中是否存在修改upvalue的机制，暂时还没有找到，等找到了再补上。
