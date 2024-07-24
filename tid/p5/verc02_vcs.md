# 02 CVS的特点和使用

cvs对rcs工具的改进并加入了网络功能，它内部的管理单位是文件，而不是整个目录的快照。这一点和svn/git的理念差异是很大的。

## 基础用法

用cvs创建新项目，不一定要先import才能check out。可以在REPO的目录下，直接新建一个目录，比如foo。就可以cvs co foo来导出这个项目了。对于个人使用记录历史，这个方式简单明了，不需要记忆复杂的cvs import语法。叉开说一句，因为cvs的配置不记录提交者信息，或者就是用USER环境变量，因此在import项目时，提供vendor就很重要了，否则这个项目的owner就没有了。

中心REPO下的目录，在cvs的术语里叫module，有了module概念对很多rlog、rtag命令就好理解了。r系列命令可以不用check out一个项目，甚至在A项目中，也能对B项目进行tag或log操作。

cvs log命令能看到有个state标记，一般不改动默认是Exp。如果做了cvs remove操作，还会记录dead这种特殊的state。log命令可以查看指定state的日志，如果指定错，就只显示等同于log -h的head日志。使用cvs admin -sXXX可以修改。cvs的手册建议使用Exp(试验)、Stab(稳定)、Rel(发布)这3种。其实-s后面可以输入任何值都允许，为了社区交流方便，还是按惯例使用比较好。由于开分支后还是能看到主干或其它分支的日志，我想到的做法是在开发支后，用admin指令把state状态也一起修改，以后查日志时用log -s XXX就可以得到这个分支的日志。

## 分支管理

### 查看分支

当你还没有接触tag命令时，肯定已经发现每次check in，cvs会有个自动递增的数字，1.1 -> 1.2这种。这个自动递增的数字称为Revision。就像通常写程序的人会用ID一样，这个数字更多地是用于区分不同时间的唯一性，却很难记忆，因此到了程序发布版本时，项目经理会阶段性地打个标签，这时就需要用tag命令，给当前版本取个好记的名字了。

cvs st命令显示的Sticky Tag: newtry(branch: 1.4.2)括号内如果是branch:就表示该个文件处在哪个分支（再次强调，cvs是管理到文件粒度，所以工作区的文件可能分属不同分支），st -v会在最后多出一段全部分支/里程碑的列表。
<pre>
Existing Tags:
  tr4     (revision:  1.4)
  newtry  (branch:  1.4.2)
</pre>
可以看到共有两个创建过的tag。括号里revision表示固化标签，表示发布版。而branch，就是基于tr4建立的分支。

分支涉及revision/tag/branch这三个比较像的概念，这也是cvs较难理解的部分。revision是cvs自动管理的类似1.3、1.5.2.4这样的数字；tag(包括rtag)/branch(tag的-b选项)这些高级的操作，必须依附于revision。之间的关系有点像IP和域名体系，便于人的记忆、使用。

### 创建分支

通过cvs tag -b name来建立分支，cvs会自动分配revision用于内部维护。-b表示基于当前的状态开分支，可能是HEAD上开出的分支，也可能是分支的分支，因为每次做了分支，版本号就会多出两个数字，因此基于分支的分支就会有至少6个数字，看起来会很冗长。附带说一句，不指定文件名的话，默认把当前版本控制的全部文件标记为分支了。如果指定了文件名，反而在cvs up -r newtry切换分支时，只会保留标记过的文件，整个工程可能会编译不了。

使用tag -b操作后，本地CVS目录的Repository文件会用Txxx的方式记录了每个文件所用的tag。用cvs up -A后，文件回到Head状态(但不Sticky)，同时Tag文件会消失。用tag -d只能删除revision类型的tag，而branch类型的tag因为可以生长，默认不能删，必须用-dB branch隐藏命令才能删，尽量不要删除branch。

为什么分支命令是tag的一个选项？可能cvs的开发者认为，branch是tag的一种特殊实现，因此并没有给branch一个独立的子命令，但是如果先熟悉了git再去用cvs，就会觉得难上手。一个教训是，要不要复用，得看概念是否有差别，如果仅因为实现上的类似就去复用，对使用者其实并不友好。

### 切换分支

使用cvs up -r brname切换到具名分支，用cvs up -A回到主干（按帮助的说法是把sticky标签去掉，隐藏名HEAD）。通过up -r HEAD也可以进入主干，但是这样会让版本变为sticky，不能check in，感觉HEAD没什么用，难怪做成了隐藏。如果只是想回到过去并重新来过，需要用-p -r rev的方式来避免sticky。

结合cvs保存文件的方式，就会比较好理解分支管理。REPO下保存每个文件带`,v`后缀的文件，这里记录了各种分支的所有版本号。用cvs up -r xxx时相当于遍历REPO下的每个文件，如果这个文件有对应的tag，就进行签出，没有对应tag就不会有这个文件，就实现了版本切换。因此默认打tag时就不要带文件名了，除非切分支的时候故意不想要某几个文件，只是这样操作起来实在太啰嗦，估计也没人愿意这么做。

### 创建里程碑

cvs一旦打上标签比如alpha，不论是通过指定名称还是程序自动赋予的1.4这种，后期通过cvs up -r alpha回到这个版本，在这种标签上做的任意改动，是不能check in的(后面会提避开的方式)，CVS称这种特性为Sticky，tag相当于milestone，在cvs的概念里，并不希望去修改它。一个不能提交的tag是没有意义的，要修改就需要branch。

如果想要基于过去的某个tag做bugfix，使用cvs tag -b -r alpha alpha-patch命令，这个命令不太直观，-r 和alpha联用，指明基于alpha这个tag，开一个称为alpha-patch的新分支号。这个alpha-patch分支(或者说带了-b选项的tag)可以check in。1.1、1.2这个版本号类似主干，用up -r 1.x回到主干的某个历史是不能提交的，因为这时revision再加1会冲突。此时必须基于这个版本创建branch，并用up -r alpha-patch的方式切换到这个分支上，基于此才能继续提交。

tag会记录在CVS总仓库的module中；而branch除了记录在module外，还会记录在cvs总仓库的CVSROOT/val-tags。

### 社区用法

用cvs实现OpenBSD的版本发布方式，我觉得还是比较困难的。以下纯为假设，操作会失败。先设定一个revision比如1.5作为tag基，在这个tag上开branch，在此branch上提交代码。到一定时候，把branch的末端merge回1.5的tag，这时的tag不能直接提交，只能在commit时指定新的revision如1.6来提交。后续在1.6上再重复刚才流程，定tag、开branch，开发合并最后提交新的1.7revision。就我个人操作而言，只用branch，不用revision的方式至少可以做到随意切换。以后真遇到需求了，再来研究revision的用法吧。

## 远程仓库

C/S模式是从本地访问基础上加上用户认证实现的。支持密码(:pserver:)、GSSAPI(:gserver:)、Kerberos(:kserver:)这3种认证，如果cvs pserver能正常执行，说明支持密码认证，其它两种同理。一般不由cvs监听，交给xinetd监听，收到请求后调用cvs来执行客户端的命令。

在仓库目录下的CVSROOT/passwd配置用户名和密码，最简单的配置就一行`user:`，无密码且同名映射到系统用户。据说有潜在的安全隐患，最好用独立的cvs内的passwd认证。cvs登时的用户名可以和系统的用户名不同，但最终还是要用别名方式映射到系统用户，因为登陆之后的操作仍然是本地操作，需要有用户身份。cvs用户和系统不同可以实现复杂的权限管理，简单项目可以不用这个特性。

除了passwd文件，还有readers和writers文件控制读写权限，这3个文件在cvs init之后不会生成。

在debian/jessie上开远程仓库却遇到无权限问题，寻找良久无果。kali版本的xinetd默认只使用IPv6模式，所以要手动指定IPv4，否则报无法连接

配置文件/etc/xinetd.d/cvspserver内容如下

```
service cvspserver
{
port = 2401
socket_type = stream
protocol = tcp
flags = IPv4
wait = no
user = root
passenv = PATH
server = /usr/bin/cvs
server_args = -f --allow-root=/home/android/CVSREPO pserver
}
```

客户端配置`CVSROOT=:pserver:username@ip:/xxx/repo`
。如果设置了密码又不想每次输入，用cvs login命令操作一次，密码会保存在~/.cvspass文件，如果不想保存，cvs logout会清除。

## 管理员功能

admin是很强大的功能，管理员可以改变提交记录(-m)甚至能删除历史(-o outdate)。用`admin -o 1.1:1.3 xxx`这条命令，就能把1.1到1.3的历史都删除。这是直接向CVSROOT这个总仓库进行作业，但是不允许把历史全删掉，至少要保留一条记录。又比如用`admin -m 1.4:modify xxx`就可以在提交后发现问题时做补救(或者掩饰)。

cvs没有锁的概念，好像类似的是watch/edit/unedit。使用了watch后在仓库的目录中会产生CVS目录，这个目录内会有个fileattr，没有做过watch可不会有哦。被watch后的文件，check out后便是只读，必须用edit来编辑，这个和svn的lock file特性似乎是一样的。但是我只在本地操作，脱离了用户和权限，watch特性就发挥不出来了。

## 缺陷

回车符以CRLF保存，改为LF无法diff也无法提交，只能ci -f强制提交，但是导出后依然是CRLF。
