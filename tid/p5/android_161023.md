# 一次安卓刷机失败的修复过程

手头有个华为手机，自带的EMUI实在太难用，偶然在华为论坛找到一个flyme的链接，大喜过望马上准备刷机。那篇帖子提供了两个链接，并且告诫说，
如果其中一个ROM导致黑屏，可以刷另一个ROM。本来这个时候，应该把两个ROM都下载后再开始刷机，但因为下载速度实在太慢，加之自己的大意，下载完一个ROM就急切地开始刷机了。果然悲剧发生了，刷完之后一进入系统就黑屏了。

在这个状态下，电脑不能识别手机，也就无法把新的ROM再拷贝进去，本想试着把新的ROM拷贝到TF卡，让Recovery从TF卡升级，
但进到Recovery，可能是Recovery的缺陷，一旦执行mount TF卡，就失去响应了。这时我已经有点着急了，难道只能线刷？网上线刷包倒不难找，
但是一来下载要花时间，二来线刷包和卡刷包的区别在哪里？既然有卡刷包，也能进到Recovery，非要线刷不可吗？

又在Recovery的菜单里找起来，惊喜地看到有个sideload的选项，说明写着通过adb sideload命令，可以把文件导入到手机。
看来可以在电脑上把卡刷包给写到flash上，但是操作之后却提示无法找到设备。猜想很可能是没有驱动，去哪里找驱动是个麻烦的问题。好在现在有各种方便的刷机工具，靠它来装上驱动，还是挺方便的。于是随便找了个下载安装，
再输入adb devices命令，果然手机被识别出来了。接下来手机侧点击sideload，有了驱动后再一次电脑上输入sideload命令，把卡刷包写入手机。经过漫长的等待，手机总算活过来了。

手机修复后，重新去思考修复过程，发现只要Recovery能用，且和卡刷包的版本是配对的，就能救回来。因为遇到过问题，从Android4.4系统，下载的5.0的卡刷包，升级后就不能引导进应用系统了。接下来就仔细缕缕这其中的关系：

先从系统结构说起：比如一个跑在x86上的linux，启动流程是先进入BIOS，然后引导kernel，最后执行init程序，就能进入shell或GUI了。那么对应手机，分别有如下这几个阶段：

* fastboot 也叫bootloader 对应BIOS，一般是u-boot来实现，功能比较简陋，无法交互，目的是引导到下一个阶段，比如Meta,factorymode,recovery,normal这几种模式。这种模式下的刷机，俗称线刷。
* recovery 这个就包含了kernel和定制的init的程序。这种模式下的刷机，俗称卡刷。
* normal 就是我们平时打开手机的flyme或MIUI系统，当然有kernel和init。

recovery和normal都带有kernel，可以分别独立启动，通常按电源键，会直接运行normal模式，只有同时按下音量键（具体取决于手机厂设置），才会选择recovery模式。只要这两个中任何一个正常，就能看到开机画面了。所以上文提到的就是recovery可用时的刷机策略。

但是如果Recovery坏了，或者Recovery和想升级的rom包不匹配，就需要更新Recovery了。更新Recovery有两种方式：

1. fastboot工具。如果Recovery有问题，这时选择进入手机的bootloader模式，(比如我这个华为手机，音量+和电源键是进入Recovery，音量-和电源是进入fastboot/bootloader)。
bootloader模式和adb是不同的，驱动也不一样，会出现adb能识别而fastboot识别不了的情况。要用fastboot flash recovery filename命令，
来写入第三方的Recovery。bootloader比Recovery的阶段早，所以这个阶段可以写Recovery，fastboot模式由于不具备交互界面，只能在电脑上操作，
2. 使用厂商提供的专用工具，还需要刷机包有分区表(通常卡刷包是不会有的)，
从分区表可以看到第一个和最后一个分区名为pgpt(primary gpt)和sgpt(secodary gpt)，
说明是按GUID Partition Table而不是MBR方式管理分区的。我手头的手机Recovery分区是16M，有了这个基础，下一步就是卡刷了。

很多厂商不希望玩家刷机，就故意把Recovery的功能做得很简陋，或者限制刷入包的签名，同时又在bootloader上做限制，不允许更新Recovery。
这就需要先解除bootloader的限制，即俗称的unlock。经过这一步，手机便失去了保修，换来的是可以自由地写入Recovery，然后各种Rom就可以烧入手机了。

前文还提到Recovery和Rom会不匹配，这就涉及另一个概念：底包。
经常在刷机论坛能看到底包说法，打开底包可以看到非常多的文件，
包括上文提到过的recovery，system.img,boot.img,userdata.img等文件，
还有些像moden_ltg.img,trustzone.bin,logo.bin等文件，
还有在操作中惟一可以由用户选择的文件——分区表。

不管卡刷也好，fastboot重写recovery，如果没有正确的分区表，也是不可能的。
从这里可以看出，如果要把系统写到一块完全空白的flash，确实需要线刷底包，
但是一般说的黑屏啊救砖什么的，通常分区表不至于损坏，只要下载到版本合适的Rom或Recovery，
就一定能救砖成功。

底包含有基带moden，还有用于DRM版权及支付的trustzone.bin文件，
这些文件都是厂商不愿意开放出来，且ROM的作者也不会去修改的地方。
可以认为卡刷包是把底包中和应用相关部分给替换的部分。

底包中往往有完整的分区表，比如MTK6752有24个分区，有ext4和RAW两种格式。
但是并不是每个分区都会写文件进去，像NVRAM分区保存的是IMEI串号，
就只定义了分区大小为5M，但不管哪种刷机方式都不会去改写它。
从这里也能看出：分区表绝对不能破坏，否则IMEI一旦丢失就没有任何方式能挽回，
除非保存过NVRAM的内容，否则只能返厂重写。

手机变砖后能和线刷工具通信，说明内部有一块固化的代码，MTK平台称为Bootrom，
代码固化在NOR flash上，同时还有一小块SRAM，执行DA程序，DA是Download
Agent的简称，用于接收线刷工具发到手机的数据。
所以至少MTK平台的启动第一步，并不是uboot，而是这块Bootrom。
这部分是无法访问的，如果被破坏，只能返厂维修了。

最后附一个MTK6752的分区实录，总计有24个分区，列出部分。
<pre>
preloader 256K
pgpt(first) 512K
proinfo  3M
nvram(IMEI) 5M
boot      20M
recovery  20M
logo      8M
tee1(trustzone)  5M
tee2(trustzone)  5M
system    1.5G
cache     320M
userdata  1180M
sgpt(last)    512K
</pre>
