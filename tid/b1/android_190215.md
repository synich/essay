# Android安装Linux环境

15年时试用过kbox，毕竟是个半成品，到2019年2月，安卓跑终端已经很成熟了。和Linux比，安卓的模拟环境是单用户且用户名已预置，在4.2以前，用户名就是个序号，4.2之后扩充形成类似`u0_a99`的命名方式，但本质还是单用户，且没有密码。home目录下不会再有子目录，自然不能创建新用户。

已经root可以用linux deploy。这个软件会在/dev/block/loop0（或loop1）块设备上创建rootfs，并安装完整操作系统，因此，从体验上最接近完整系统。

没有root的机器，根据安卓不同版本，选择不同的软件。

* 安卓5.0及以上，用Termux或UbuntuForAndroid
* 安卓4.4及以下，用GNURoot

## Termux

由于文件系统无法遵循FHS规范，加上依赖的C库是bionic，所以不能直接拿其它发行版的二进制程序来用，需要单独编译。除了基础的库依赖/system/lib/下的libc.so、libm.so、libdl.so之外，其它动态库都在Termux的lib目录内，因此也可以说不是个自完备的系统。相比bionic的libc.so，glibc则命名为lib-2.32.so，再用libc.so.6软链接过去。

包管理器是dpkg和apt，又用shell封装了简单的pkg前端。初始化安装后有大约65个包，ca-certificates包只有一个文件，记录了可信任的CA，提供者是curl的作者，可见CA的基础性。在一次升级过程中遇到依赖的libandroid-support无法升级，甚至用`-o APT::Force-LoopBreak=yes install libxxx` 命令还导致所有程序全部被清空的惨剧。据说是用了改版的apt，使升级策略变成了滚动升级。重装之后提示仓库版本和本地不同，我选择D看差异却导致再也无法继续，只能再次重装时只敢选N(保留我的配置)，折腾3次才重新装上。

如果更换源，要先执行`apt-get update`更新缓存才能执行进一步操作。

默认bash，用chsh可以换sh，原理是把默认shell写入$HOME/.termux/shell。login不能作为默认shell。bash有700多K，而dash仅130K。bash提供了很多交互上方便的特性，典型的像通过改变PS1变量更换提示符，还有个内建钩子函数`command_not_found_handle`，当执行一个不存在的命令，会用一个外部程序给出更好的提示，比如用pkg安装某个对应包。

在termux上编译软件要注意，因为默认的/usr/local路径不可用，必须用 ./configure --prefix=$PREFIX/stow/xx-1.0 方式显示指定安装路径。安装后，进入stow目录，执行stow xx-1.0就能用了，执行stow -D xx-1.0则删除该软件。

## UbuntuForAndroid

自带ssh，装上就能用。源比debian要少太多，先安装software-properties-common再用add-apt-repository ppa:添加相应的源才能安装。在换国内源时遇到若干问题

1. 先确保安装了*ca-certificates*
2. 网上换源的文章都只适用于x86系，如果是arm的话，要把url的ubuntu换成ubuntu-ports
3. apt-get update会提示签名不通过，改成`deb [trusted=yes] http:...`。注意如果没有装第1步提到的包，即使加了trusted也没用

## GNURoot Gentoo

可以安装debian jessie，理论上可以换源逐步升级到最新版本。不过在5.0不让装。

又试了Gentoo，依然遇到sshd问题。首先是没有公私钥对，用`ssh-keygen -t rsa -f ssh_host_rsa_key`生成，还是会断开，通过修改配置项`UsePrivilegeSeparation no`后能登陆。这个选项在7.5版本后废弃，强制yes，但在安卓系统下，可能是exec机制不同，必须no才能连接。如果sshd不管怎么配置都不能用，可以换dropbear，因为只用一个进程，免去了exec的麻烦。默认没有公钥的话，用dropbearkey -t rsa  -f dropbear_rsa_host_key。由于Gentoo的portage机制导致小文过多，同步后直接把inode用完（至少13万个），导致系统无法使用。这可能也和手机版本4.2，默认只有19万inode，而另一台6.0上的inode有64万多，可惜无法尝试了。

由于ebuild不能用，只能源码编译，没有自带解压zip的软件，网上找到的unzip源码竟然是2010年最后更新的6.0版本，看起来也不会再更新了。支持非常多的操作系统，以致于根目录下没有Makefile，看了帮助才知道要自己从相应的目录复制Makefile，在那个操作系统百花齐放年代的软件，风格和如今大为不同。可能是太常用也太古老的关系，busybox也整合了unzip功能，倒不一定非得使用原始的unzip。顺便说下unzip和zip分属两个包，版本号也完全不同，有点难以想象。

应用市场能下载和GNURoot配套的镜像都比较旧，可用lxc制作的发行包(https://images.linuxcontainers.org/images/), arch或alpine也有独立发布的arm包(选armhf，不支持aarch64)。下载发行包后，按以下顺序操作

1. 进入/host-rootfs/data/data/champion.gnuroot/app_install目录，有roots/support/versions 共3个文件夹。versions不用管，在roots和support下创建同名文件，名字随便取以后会显示在下拉框。roots包含的是发行版的rootfs，support是proot和busybox。由此看出GNURoot的流程大概就是busybox内用proot加载rootfs，达到模拟操作系统的目的。
2. 创建host-rootfs目录，如果没有/etc/resolv.conf也复制一份。

做完以上两步，再打开GNURoot的下拉框，就可以看到刚安装的发行版了。

* 不成功案例1: 先安装GNURoot的aboriginal包，然后不另建目录，直接把发行版的rootfs覆盖上去，再次打开会退出，可见必须另建新目录。在覆盖时遇到一个有趣的问题，原有的bin/目录是指向usr/bin/的软链接，这时一定要用`rm -rf bin`，不可以在bin后面加/，否则会把指向的目录删掉。因为软链接是文件，不加末尾的/，rm只删除这个软链，而加了/的话，会被作为目录删除导致悲剧。
* 不成功案例2: 在安卓5上可以安装GNURoot，但安装dropbear后，ssh输入密码成功后，提示`client_loop: send disconnect: Broken pipe`，然后断开。可见终究还是不能用。

## GNURoot Aboriginal

有台配置极差的老机只能装这个版本，sshd也不能用，好在上传busybox1.31通过telnetd可以使用。如果遇到telnetd可以连接但无法创建tty，可以用`busybox nc -lkp 4444 -e /bin/sh`创建简单的登陆方式，虽然没有高亮或补全，但可以救急。busybox还能挂httpd，真是个神奇的程序。

## GNURoot Debian Jessie

可以逐个版本地滚动升级上来

```
apt-get update
apt-get upgrade
apt-get dist-upgrade
sed -i 's/jessie/stretch/g' /etc/apt/sources.list
```

之后再重复以上3升级步骤，此时要多一条

```
apt-get autoremove
```

这样就彻底向上跳了一个版本，后续版本的更新类似。不过在一台未root的手机上操作，最终却因为libc无法更新停在了half-install状态，此时尝试装file，会提示需要libc >= 1.20，但是jessie的版本是1.19，只有stretch是1.24，无法安装新的软件，导致这个版本等于是废了。

## proot原理

上述种种的地基就是proot，理论上只要有它，就可以安装完整的linux发行版。

设想一下，如果把整个发行版的内容挂载到host的某个目录，并以此目录为根，就在一个系统内有了另一个子发行版。最早的切换根目录使用chroot，这次用的是proot，虽然都带root字样，但两者差别极大。chroot是系统函数，而proot则是基于ptrace接口的应用程序，p猜测是pseudo的简写。proot对它fork出的子进程做了ptrace挂钩，当子进程读写文件时，由父进程转成对/proc/pid/fd的读写，实现了子进程内对文件路径的改写。当然proot还实现了诸如进程身份修改、挂载host路径等额外功能。

termux下的proot会和打了patch的termux-chroot一起构造假的root环境，如果不是termux，也可以使用静态proot。镜像可以从lxc-images下载，说明这类镜像只依赖内核的syscall就能运行。

### 选项说明

proot的选项很多，一般都会封装一个脚本，以下是重要的选项

1. 取消LD\_PRELOAD环境变量
2. 用-r指定根目录，但proot还提供了-S或-R，都是-r的超集，会额外加载一些host目录。-S还会使guset用户为root，更加方便
3. 用一到多个-b加载额外的host目录，-w指定root目录
4. 用`env -i`清空环境变量，再按需指定HOME/PATH/LANG等常用环境变量
5. 设置PROOT_NO_SECCOMP=1关闭可信计算，设置PROOT_TMP_DIR目录（安卓没有/tmp）
6. 执行sh进入发行版
