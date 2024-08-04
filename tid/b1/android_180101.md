# 开发安卓程序

## 使用DroidScript

本来是想用ionic在手机上做些开发，安装失败后，发现DroidScript安卓程序，可以在PC端浏览器连接手机，并在浏览器上进行编码调试。支持HTML和App两种开发模式，从通用性来说肯定是HTML好，App支持的插件丰富一些。

支持很多特性，但Reference没有写只能从Demo去看。写好的程序可以打包成apk，Img目录如果有和工程同名的png文件，则该文件会作为apk的图标。支持debug和release签名。如果是release方式需要先生成私有的keystore文件，以后输入密码就可以打包了。

### 网络请求

HTML模式本质上是原生程序中内嵌了web页面，布局在四边稍有些空白，可以访问完整的window对象。虽然具备XMLHttpRequest，但可能是受限于跨域，另外提供了HttpRequest方法进行网络通信，可以向任意地址请求，HTTP头也没有Origin字段。至少支持get/post/put/delete方式(其它几乎没有使用，不测了)。参数只能以URL Encode方式编码，也就不能像jQuery那样写成json并由jQuery去转换，略有些不便。更坑的是分隔符居然用`|`而不是标准的`&`，如果用`&`程序会强行转码导致PHP上无法从`$_POST`找到希望的key。使用get或delete时，参数只能通过url方式携带，而post或put则一定在request body中。

比如发起这样一个请求`httpAjax("delete", "/index.php?t=3", "id=1|name=jojo", handleParam);`，抓包可以看到变成了`index.php?t=3?id=1&name=jojo`，强行把url和参数用?符号连接起来，导致后台如果用PHP解析，把`3?id=1`当作t的值。

### 多字节字符

支持很差，界面上无法输入中文，甚至复制中文后就不能再输入了，只能尽量用英文。导致一个更不方便的问题，写的中文日记无法提交，只能先将中文用JS的encodeURI转码再附到提交数据上，但这样和PC端Web上提交的内容不同。比如**看**字，PC端抓包是`%E7%9C%8B`；而经过encodeURI转码后的看字，抓包则是`%25E7%259C%258B`，两者比较前者9字节后者15字节。重复的部分就是`%`后面的字符要怎么解释，encodeURI相当于%要转译两次，因此负载密度很低。通过base64解决这个问题，但base64的结果会有=，建议用encodeURIComponent方法把=也进行转码。而encodeURI不对+=等特殊字符转码。

### WebServer

支持创建服务端，并能上传和下载文件，但是上传功能并不明显，通过自带demo发现，当在CreateWebServer的option指定Upload，就能以POST方式发起upload请求，形如`curl -F "DB=@a.db" -F "DB1=@b.db" ip:port/upload`，其中-F后面的字段可以随意指定，会自动创建同名文件夹。

### 源码如何进入apk

**assets/user子目录**放了我们编写的代码、图片、字体，另外assets下有一堆依赖js文件，还有几个子目录暂不清楚

## 使用AndroLua

一个在Android用lua开发程序的应用，利用了JNI技术。JNI的交互是在java中定义若干个native方式的接口，通过javah导出头文件。在C函数中实现这些导出头文件对应的函数。这是java调用C的流程。想从C调用java，就要借助传给C语言JNIEnv变量并保存下来，后续用这个变量找class和method，并通过JNIEnv来调用。利用lua、C、Java三者之间两两互通，最终实现lua和java的互操作。

最初的想法来自Lua的Kepler项目中luajava这个子项目。代码分为C和Java两部分，先看C语言部分。

1.1版本就luajava.c一个文件。前半部分定义了5个lua操作java对象的函数，new/newInstance/bindClass/createProxy/loadLib。4.0版本又增加了多个函数，为简化起见先学习这5个。

这5个函数肯定放入lua的table，并以字符串和C函数的关系绑定。这个L保存在CPtr.java定义的private long peer;成员变量。

lua中会以newuserdata方式创建JNIEnv类型变量，并命名为`__JNIEnv`保存到`LUA_REGISTRYINDEX`里。每当这个userdata被触发gc时，会找JNIEnv并用DeleteGlobalRef方式对jobject的引用计数减1。

luajava.c的后半部分定义了107个JNI的C实现，注册5个函数是在LuaState.java中定义为native方式的名为`luajava_open`的函数，由于javah的转换,到了C语言中函数名会稍有不同，但还是能看出来。C语言中实现了5大函数的注册。而在java的LuaState构造函数中，实现了`luajava_open`的调用。

如果是通过java的console方式，会在Console.java的main函数构造LuaState，实现5大函数在lua的注册，接下来就可以在lua中调用java了。

每次在abstract的JavaFunction调用LuaState.pushJavaFunction，就会在lua中创建新的userdata，再创建一个table，并设置`__call`域，执行函数调用int execute()签名函数。所有的入参在lua栈上，出参会压入栈上，返回的int就表示出参个数。

## 开发过程

利用布局器交互式地添加几个简单的控件，.aly文件会依次出现这些控件，然后加上id="xx"之后，就可以在代码中操作这些控件。布局器只要一个LuaWebView，剩下的就是web开发和打包。
