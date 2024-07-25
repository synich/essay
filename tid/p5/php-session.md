# PHP的SESSION机制

HTTP/HTML起初是为展示文件而设计的，天然就是短连接没有状态。
像登陆业务却需要长连接，加之PHP又不具备daemon化特征，因此解决这个问题就要有些技巧。

先说短连接，TCP基于无连接的IP能达到流式效果，大概是有TCP首部的序号和确认序号机制，
要在HTTP的短连接上要达到同样的效果，一样要有类似TCP序号的标记，这就是COOKIE。
比如第一次登陆后返回一个特殊的COOKIE值，下次客户端把COOKIE带上，就能在短连接上模拟长连接的效果了。浏览器出于安全方面的考虑，不会主动添加COOKIE，都是由服务端增加，有时会对COOKIE设置超时时间，到了之后浏览器删除。

传输层面的问题解决了，接着就是服务端识别问题。如果像C或Java一直在监听，只需要把会话号记在内存就可以了，PHP却只能依靠持久化的方式，比如写文件来标记。
前面提到COOKIE必须是服务端主动添加，要开启该功能就要调用`session_start`函数，也可以理解为服务端要向HTTP回复中写入Set-Cookie了。

通过HTTP请求抓包中的COOKIE部分进一步地理解(如果是服务端返回则用Set-Cookie)：

* Cookie: TRACKID=6a366db255a08732cc44b1e1913dd2da; PHPSESSID=hamehnglgsj2sg6nbguq2146o3

TRACKID是Lighttpd的`mod_usertrack`模块产生的，用于配合clickstream功能，不去分析它，只关注PHPSESSID。PHP的session和上例的Key=Value类似，对应PHP的两个函数：
Key是`session_name()`，可以在php.ini自定义，对应HTTP包头中的标记，不同的语言都会有不同定义，JSP默认用JSESSIONID定义。

* session.name = PHPSESSID

Value是`session_id()`，同样在php.ini有两个设置项

* `session.hash_function` = 0  // 0-MD5，1-SHA1
* `session.hash_bits_per_character` = 5 // 每5bit生成一个可打印字符

value不能由用户定义，但可以变换表现形式。以上的例子使用MD5且每5bit表现成一个字符，因此128/5=26。和抓包符合。

下一个问题，每次请求来的时候PHP被唤醒，因此必然会把持久化的session恢复到内存。持久化方式有files、memcache、redis等，当然最简单的还是files。

* `session.save_handler` = files  // 对应的方法`session_module_name()`
* `session.save_path` = "/tmp"

如果files就要配置保存路径。对应memcache的话就是IP和端口。
files的名称一般是`sess_idvalue`，对应刚才的抓包，持久化的文件名就是`sess_hamehnglgsj2sg6nbguq2146o3`。每次请求到来，根据Cookie构造出session文件名，如果能读取文件，说明会话存在，从这个文件就可以还原回上一个状态。

当然session的id值不能一成不变，默认3小时一换。通过`session.cache_expire = 180`来调整。
会话的id值如果想省事可以交给PHP来生成。高级点的玩法比如通过浏览器请求的其它数据来构造，
然后先调用`session_id`再调用`session_start`，就能自定义会话号了。
不过看反馈，似乎把`session.use_strict_mode`置为1会失效。

如果要在PHP中打开会话，调用`session_start()`，先检查`$_COOKIE`变量(由HTTP包头的Cookie构造得来)里的PHPSESSID。
如果存在和COOKIE[PHPSESSID]对应的文件，就读取这个文件，并通过`session_decode()`得到`$_SESSION`变量，
除非我们手动管理会话的持久化方式(比如用redis或其它数据库)，否则不调用`session_start`直接访问`$_SESSION`，因为变量没有构造，PHP会报警告。

`$_SESSION`里的键值对的持久化方式可配

* session.serialize_handler = php

php和serialize()一样，还有binary等其它方式。至于会话内容可以通过`session_encode()`看到，修改后再用`session_decode()`设置回`$_SESSION`。

说完服务端，再说说浏览器端。每次发起请求，看似只是个地址，但头部至少有Host, Connection, Agent, Referer, Cookie字段。即使跨域也会携带Cookie，这也是引起CSRF的根本原因。

总结起来可以说，Cookie是有形的手，而Session是无形的手，要启动这只无形的手，需要`session_start`的一声令下。