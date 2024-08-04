# 安卓APK内容分析

## 压缩包的文件构成

最小的apk有5个文件和目录，由Java编译的字节码、资源文件原生库以及辅助文件(如编译说明、签名)共同打成的zip包。

* classes.dex: 核心字节码
* AndroidManifest.xml: 不同apk之间就是依靠记录在本文件的包名，以及META-INF数字签名共同进行区分的。
* resources.arsc
* assets目录
* META-INF目录: 记录了所有文件的SHA-1结果。有些制作程序会在./res子目录包含数字签名

除了最小化组成，还会经常看到以下文件或目录

* lib目录: 存放和芯片相关的二进制so，子目录名标识对应的指令集，如armeabi（v5指令集，首次支持MMU的ARM9），或armeabi-v7a（v7指令集，Cortex）

### Java字节码码说明

classes.dex文件是Dalvik字节码，也是主执行代码。java把每个源文件编译成class，而apk中只有一个dex，有点jar的味道。

用户安装在/data目录下的apk，通常都包含dex。/system目录下的apk内没有dex，替代的是外部的odex文件。在真正执行前，会将dex做进一步优化，分Dalvik或ART优化，版本4.4以前使用dexopt生成odex文件，版本5之后使用dex2oat生成用于ART的oat格式(可能也是.dex的扩展名)。dex是跨平台的，odex/oat是平台依赖的，存放odex/oat位置就是dalvik-cache。

## 文件内容

每个apk会在/data/data/目录下存放文件（小米会创建/data/usr/0/别名）。这个目录下的文件夹比较固定，至少有 files, shared\_prefs, cache, code\_cache。有些还会有databases, lib, app\_XXX这样的目录。