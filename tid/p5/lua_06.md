# 06 Lua中引入对象风格的价值和loop的实现

用弱类型语言写代码，函数多了以后参数具备明确含义就很重要了。就好比web开发不可能总是用原生的json包打天下，定义一个类，更多的也是对接口的一个契约，使其在函数名之外具备更详细的自解释性。至于C++面向对象三要素的封装尤其访问性封装和继承，目前我还没觉得有什么用处，对动态语言来说多态已经在语法层面失去价值，反而使接口和实现分离这个最本初的愿望更直接地体现出来了。

接下来先分析loop.base的实现原理，base是基本，就做了最简单的引入类和实例概念：整段代码20行，如下

```
function rawnew(class, object)
	return setmetatable(object or {}, class)
end

function new(class, ...)
	if class.__init then
		return class:__init(...)
	else return rawnew(class, ...)
	end
end

function initclass(class)
	if class == nil then class = {} end
	if class.__index == nil then class.__index = class end
	return class
end

local MetaClass = { __call = new }
function class(yourDef)
	return setmetatable(initclass(yourDef), MetaClass)
end
```

创建类需要指定具名字段并返回一个可以call的物件，因此创建是function，返回的则是设置了metatable中`__call`字段的table。如果没有定义任何东西，库也会默认生成个{}，而接下来这句设置`__index`的作用要在new中才会体现。先来看`__call`对应的的函数new。触发这个方法时，第一个传入的参数是class这个function生成的物件，从rawnew函数可以看到这个物件被当作一个object的元表，此时object需要能访问到类中定义的成员，显然需要`__index`方法，又因为这个object不能再创建对象，所以也不会有`__call`字段定义。到此功能原型就出来了。

上面说完了base类，这时还不具备继承功能，先说单继承，这是loop.simple的职责，simple要实现继承，在base基础上要再做两件事：

1. 要能够访问到基类的属性
2. 既然是继承类，也要能够构造实现，也就要有`__call`方法

来看simple的代码

```
local DerivedClass = ObjectCache {
	retrieve = function(self, super)
    -- return a new class extended super with __call, so it's different from origin super
		return base.class { __index = super, __call = new }
	end,
}
function class(subDef, super)
	if super then
		return DerivedClass[super](initclass(subDef))
	else return base.class(subDef)
	end
end
```

如果class的第二个参数(父类)非空，则通过DerivedClass[super]的方式生成一个带`__call`的强化版super类，且索引也指向super。再以subDef为参数向super类上附着子类的参数，这样继承的目的就达到了。