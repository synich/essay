# 版本管理工具

## 发展历程

到今天为止，版本管理工具可以粗略地分为三代：

1. SCCS在1972年开创了版本管理的理念，最初是用SNOBL4开发，后来借着Unix的东风，以C语言重写并跑在PDP-11上，这个软件现在已经没有维护了。第一代中还在维护的，是诞生于1982年的RCS，在GNU上能找到最新的发布版。
2. 中心式管理，代表作为1986年的CVS和2000年的SVN。SVN至今还有旺盛的生命力，在企业市场也非常有竞争力。
3. 分布式管理，为了适应互联网出现后的开发方式，2000年出现了BitKeeper(和SVN同年)，稍后的2005年4月，同时诞生了广为人知的Git和Hg，仍在蓬勃发展。

第一代版本控制都是针对文件为单位，RCS使用的`,v`方式保存文件，被CVS继承。这一代并没有多人合作的概念，每次编辑文件前必须要先锁定，提交后再释放。2010年前后，日系传统企业的软件管理仍在使用。

第二代的CVS作为中心存储式版本管理，工作路径不放任何历史，虽然每级目录下都会有CVS目录，但里面的内容都是同样的3个文件(开分支会多个Tag)，Root和Repository共同构成了仓库的存储路径，Root文件保存远程档案的路径，如果是个网络地址，要求系统中必须有rsh，所以windows下无法看到远程的历史记录。Entries的内容则多一点，要记录该目录下被管理的每个文件名。

现在还在用cvs管理代码的项目里，我所知名气最大的是OpenBSD。它和cvs的渊源还有个故事：OpenBSD是开源的，但创始人Theo de Raddt觉得只开源代码而不开源代码历史是不够的，在1995年的秋天开放了anoncvs这个系统，并提出了open source repository概念，虽然现在可能有了更好的协作方式，但这在当时还是很有启发性的。

观察CVS的REPO目录可以发现，CVS和第一代都是以文件为最小单元进行管理的，与之对比svn是以目录为最小单元。理论上cvs的控制粒度更精细，相应的操作也更繁琐。cvs的所有命令，都可以不带文件名，表示当前所管理的文件都受此命令控制，达到了对目录整个操作的目的。比如svn固定版本只能对目录固定到某一版本，如果基于特殊原因，想对其中一个文件使用旧版本是做不到的，用cvs就可以在整个REPO指定版本的基础上，再附加对某个文件的固化，可以做到比svn更细致的控制。换句话说这也是svn的优点，SVN相较于VSS、CVS有几个显著的区别，其中最重要的特性之一就是原子性提交，每一个提交都是由多个文件的修改组成，而且这个提交是原子性的，要么这些修改全部成功，要么全部失败。

SVN的分支管理，把每个目录做了一个单独的拷贝，非常占用服务器空间，好处就是分支没用之后，直接把目录删掉就好，大概这就是所谓的易于理解吧。在第三代面前完全不够看不说，我认为甚至还不如CVS。尽管CVS说起来有很多缺陷，个人使用已足够。

第三代的引领者BitKeeper在2002到2005年被用于Linux内核开发，后来针对特点，开发出了Git。除此之外Hg也广泛被认可。配套的还有工作流程的变化(Integrator workflow积分流)，这才是称之为第三代最大的原因吧。

名为分布式管理，但是千万不要认为各分支平等，这其中就有一个更平等的分支，或者叫blessed repository，由项目的管理者持有。如果想把改动合并到这个`reference`分支，发起一个request，只有管理者pull并merge这个请求，才算合入。所以分布式开发模式经常会看到`pull request`。这种模式改变的是存储方式，但代码的管控仍然是严格的。

接下来就从历史发展的先后，重点看看cvs、git还有一个比较小众的分布式管理软件fossil吧。

## CVS的特点和使用

### 历史

最初的版本管理工具SCCS处理的是代码的差分和比较，今天仍在使用的diff和patch干的就是这个。diff看着简单，背后的理论延伸非常庞大，输出格式也有多种，除了默认的normal输出，unified也很多，而ed输出，估计现在都找不到ed软件了吧。虽然现在已经不会再独立使用这两个程序，但版本比较工具在底层还依赖它。第一个diff成熟版本在1974年随着版本5的Unix一起发布。10年后，Larry Wall发布了patch（之后的1985年，他发布了perl）。

cvs对rcs工具的改进并加入了网络功能，它内部的管理单位是文件，而不是整个目录的快照。这一点和svn/git的理念差异是很大的。

### 基础用法

用cvs创建新项目，不一定要先import才能check out。可以在REPO的目录下，直接新建一个目录，比如foo。就可以cvs co foo来导出这个项目了。对于个人使用记录历史，这个方式简单明了，不需要记忆复杂的cvs import语法。叉开说一句，因为cvs的配置不记录提交者信息，或者就是用USER环境变量，因此在import项目时，提供vendor就很重要了，否则这个项目的owner就没有了。

中心REPO下的目录，在cvs的术语里叫module，有了module概念对很多rlog、rtag命令就好理解了。r系列命令可以不用check out一个项目，甚至在A项目中，也能对B项目进行tag或log操作。

cvs log命令能看到有个state标记，一般不改动默认是Exp。如果做了cvs remove操作，还会记录dead这种特殊的state。log命令可以查看指定state的日志，如果指定错，就只显示等同于log -h的head日志。使用cvs admin -sXXX可以修改。cvs的手册建议使用Exp(试验)、Stab(稳定)、Rel(发布)这3种。其实-s后面可以输入任何值都允许，为了社区交流方便，还是按惯例使用比较好。由于开分支后还是能看到主干或其它分支的日志，我想到的做法是在开发支后，用admin指令把state状态也一起修改，以后查日志时用log -s XXX就可以得到这个分支的日志。

### 分支管理

#### 查看分支

当你还没有接触tag命令时，肯定已经发现每次check in，cvs会有个自动递增的数字，1.1 -> 1.2这种。这个自动递增的数字称为Revision。就像通常写程序的人会用ID一样，这个数字更多地是用于区分不同时间的唯一性，却很难记忆，因此到了程序发布版本时，项目经理会阶段性地打个标签，这时就需要用tag命令，给当前版本取个好记的名字了。

cvs st命令显示的Sticky Tag: newtry(branch: 1.4.2)括号内如果是branch:就表示该个文件处在哪个分支（再次强调，cvs是管理到文件粒度，所以工作区的文件可能分属不同分支），st -v会在最后多出一段全部分支/里程碑的列表。
<pre>
Existing Tags:
  tr4     (revision:  1.4)
  newtry  (branch:  1.4.2)
</pre>
可以看到共有两个创建过的tag。括号里revision表示固化标签，表示发布版。而branch，就是基于tr4建立的分支。

分支涉及revision/tag/branch这三个比较像的概念，这也是cvs较难理解的部分。revision是cvs自动管理的类似1.3、1.5.2.4这样的数字；tag(包括rtag)/branch(tag的-b选项)这些高级的操作，必须依附于revision。之间的关系有点像IP和域名体系，便于人的记忆、使用。

#### 创建分支

通过cvs tag -b name来建立分支，cvs会自动分配revision用于内部维护。-b表示基于当前的状态开分支，可能是HEAD上开出的分支，也可能是分支的分支，因为每次做了分支，版本号就会多出两个数字，因此基于分支的分支就会有至少6个数字，看起来会很冗长。附带说一句，不指定文件名的话，默认把当前版本控制的全部文件标记为分支了。如果指定了文件名，反而在cvs up -r newtry切换分支时，只会保留标记过的文件，整个工程可能会编译不了。

使用tag -b操作后，本地CVS目录的Repository文件会用Txxx的方式记录了每个文件所用的tag。用cvs up -A后，文件回到Head状态(但不Sticky)，同时Tag文件会消失。用tag -d只能删除revision类型的tag，而branch类型的tag因为可以生长，默认不能删，必须用-dB branch隐藏命令才能删，尽量不要删除branch。

为什么分支命令是tag的一个选项？可能cvs的开发者认为，branch是tag的一种特殊实现，因此并没有给branch一个独立的子命令，但是如果先熟悉了git再去用cvs，就会觉得难上手。一个教训是，要不要复用，得看概念是否有差别，如果仅因为实现上的类似就去复用，对使用者其实并不友好。

#### 切换分支

使用cvs up -r brname切换到具名分支，用cvs up -A回到主干（按帮助的说法是把sticky标签去掉，隐藏名HEAD）。通过up -r HEAD也可以进入主干，但是这样会让版本变为sticky，不能check in，感觉HEAD没什么用，难怪做成了隐藏。如果只是想回到过去并重新来过，需要用-p -r rev的方式来避免sticky。

结合cvs保存文件的方式，就会比较好理解分支管理。REPO下保存每个文件带`,v`后缀的文件，这里记录了各种分支的所有版本号。用cvs up -r xxx时相当于遍历REPO下的每个文件，如果这个文件有对应的tag，就进行签出，没有对应tag就不会有这个文件，就实现了版本切换。因此默认打tag时就不要带文件名了，除非切分支的时候故意不想要某几个文件，只是这样操作起来实在太啰嗦，估计也没人愿意这么做。

#### 创建里程碑

cvs一旦打上标签比如alpha，不论是通过指定名称还是程序自动赋予的1.4这种，后期通过cvs up -r alpha回到这个版本，在这种标签上做的任意改动，是不能check in的(后面会提避开的方式)，CVS称这种特性为Sticky，tag相当于milestone，在cvs的概念里，并不希望去修改它。一个不能提交的tag是没有意义的，要修改就需要branch。

如果想要基于过去的某个tag做bugfix，使用cvs tag -b -r alpha alpha-patch命令，这个命令不太直观，-r 和alpha联用，指明基于alpha这个tag，开一个称为alpha-patch的新分支号。这个alpha-patch分支(或者说带了-b选项的tag)可以check in。1.1、1.2这个版本号类似主干，用up -r 1.x回到主干的某个历史是不能提交的，因为这时revision再加1会冲突。此时必须基于这个版本创建branch，并用up -r alpha-patch的方式切换到这个分支上，基于此才能继续提交。

tag会记录在CVS总仓库的module中；而branch除了记录在module外，还会记录在cvs总仓库的CVSROOT/val-tags。

#### 社区用法

用cvs实现OpenBSD的版本发布方式，我觉得还是比较困难的。以下纯为假设，操作会失败。先设定一个revision比如1.5作为tag基，在这个tag上开branch，在此branch上提交代码。到一定时候，把branch的末端merge回1.5的tag，这时的tag不能直接提交，只能在commit时指定新的revision如1.6来提交。后续在1.6上再重复刚才流程，定tag、开branch，开发合并最后提交新的1.7revision。就我个人操作而言，只用branch，不用revision的方式至少可以做到随意切换。以后真遇到需求了，再来研究revision的用法吧。

### 远程仓库

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

### 管理员功能

admin是很强大的功能，管理员可以改变提交记录(-m)甚至能删除历史(-o outdate)。用`admin -o 1.1:1.3 xxx`这条命令，就能把1.1到1.3的历史都删除。这是直接向CVSROOT这个总仓库进行作业，但是不允许把历史全删掉，至少要保留一条记录。又比如用`admin -m 1.4:modify xxx`就可以在提交后发现问题时做补救(或者掩饰)。

cvs没有锁的概念，好像类似的是watch/edit/unedit。使用了watch后在仓库的目录中会产生CVS目录，这个目录内会有个fileattr，没有做过watch可不会有哦。被watch后的文件，check out后便是只读，必须用edit来编辑，这个和svn的lock file特性似乎是一样的。但是我只在本地操作，脱离了用户和权限，watch特性就发挥不出来了。

### 缺陷

回车符以CRLF保存，改为LF无法diff也无法提交，只能ci -f强制提交，但是导出后依然是CRLF。

## 理解Git

和cvs/svn相比，操作粒度从文件变成了commit。而操作步骤上的变化则是多出了暂存区index的概念，每次提交都分为add(也可以用stage，同义词)和ci两个步骤。有观点提出，这是为了达到svn的多文件原子提交，但命令行不容易选文件，于是多出个中间环节，先小步多次挑选要提交的文件，用add将工作区的文件提交到index暂存区，然后ci实现原子化的从暂存区向仓库区的提交。通过日志也能看到commit前后两次index的变化，每次也会用sha1编码来表示。

其实暂存区并不是必备的，创建时用git init --bare就能创建没有.git目录的仓库（原来放在.git目录下的文件在当前目录直接能看到，相当于整个目录自己就是.git目录）。这个仓库无法执行add操作，一般用来做中心仓库，多人向裸仓库推。如果不这样，冲突会很多，所以有bare特性。

存储方式也不同于cvs的差分保存，每次提交都会保存一份完整的记录在objects/目录下，不仅文件，每次commit时的目录结构、日志都会保存。通过git gc打包会把这些文件压缩成idx和pack文件，如果操作过程干净，所有的独立文件都会被压缩，当遇到stash恢复冲突等特殊场景，会有少量文件无法被打包。

git有三个层面的配置local(repo级), global(用户级), system(/etc级)。

一切皆object的设计理念

每个object都用SHA-1表示，有4种类型：commit, tag, tree, blob。互相之间的关系是：tree和blob共同组成commit，对commit打上标记形成tag。

### commit

所有的提交形成一个commit树，每个commit号标示出树上唯一确定的点。本地或远程Branch、Tag、HEAD都是这个commit树上某个点或某根枝条的别名。

* HEAD: 动态指向这棵树上当前开发最新节点。注意这个最新不一定是树的末端，而是当前开发在哪个状态，随着每次提交动作而移动
* Tag: 静态指向commit树的某个节点，一旦确定就永远不再变化
* Branch: 对应commit树上某一段（如果不开分支，就是整棵树）的别名，由于是枝的形状，所以不表示某个具体的提交点，但可以沿着枝来溯源
* dangling/orphaned: 有些提交被reset或其它操作重置后，无法被任何的命名分支追踪到，成了孤立提交。用`git fsck --full --no-reflogs --unreachable --lost-found`和`git gc --prune=now`来找到或清理它们

### tag

打上tag后，可以用name-rev或describe查看某个commit和tag的关系，但似乎name-rev只能找比tag时间更早的commit，而describe恰好相反，只能找比tag时间晚的commit。

### 分支

仅仅init不会有分支，必须在提交后才会有第一个master。分支和暂存区之间会引入复杂的关系，如果暂存区有内容，换分支有可能被中止，提交或stash后才能继续换分支。说明只有分支是独立存在，暂存区只有一个，是多分支共享的。这也是stash存在的原因。

refs/heads/保存了所有分支。删除一个旧的分支，没问题。但如果删除的是比当前要新的分支，用-d是没用的，防止辛苦做的提交白白丢失。如果确实没用，-D还是能删的。

一个本地仓库可以对应多个远程分支，不同的远程仓库间用名字区分。比如用 `git remote add origin git@github.com:synich/demo.git` 添加一个远程origin分支。master和origin都是默认名字，并没有要求必须用这个名字，一般大家都遵守这种习惯。

远程分支和本地分支不一样。远程分支类似tag是一个引用，origin在本地仓库是个独立的命名空间，因此可以创建多个远程。每个远程分支都会和一个本地分支建立关联，关联之后，其它本地分支间的操作，再套上一层网络传输就可以无缝衔接了。

### 目录结构解读

工作区很好理解，写代码的根目录下自己写的代码都是，但除此以外只有.git目录代表仓库，所谓的索引到底是什么，有无实体？

#### 索引文件

秘密就在 `.git/index` 这个二进制文件，索引只会记录文件名和SHA-1，不记录具体内容。如果索引的文件条目特别多，可以用update-index --split-index切分。索引分了若干段，第一个是DIRC段，一般会有TREE段，至于更复杂的REUC/UNTR/FSMN段只在特定场景或配置后才会出现。

#### 仓库区

.git目录除index文件外的其它，就是仓库区

文件类

* HEAD/ORIG_HEAD/FETCH_HEAD: 存储当前检出的引用或者提交 ID	在远程服务器上用于展示默认分支
* config/description: 存储库配置，存储库配置优先级高于用户配置，用户配置优先级高于系统配置
* packed-refs: 存储库打包引用存储文件，默认不存在，运行 git pack-refs 或者 git gc 后出现

目录类

* objects: 存储库对象存储目录
* refs: 存储库引用存储目录
* logs: 似乎是日志
* info: 存储库信息，http dumb 协议依赖，但目前 dumb 协议已经无人问津
* hooks: Git 钩子目录，包括服务端钩子和客户端钩子，当设置了 core.hooksPath 时，则会从设置的钩子目录查找钩子

这些目录中最重要的是 objects 和 refs ，只需要两个目录的数据，就可以重建存储库了。在 objects 目录下，Git 对象可能以松散对象（SHA-1的前两字母）也可能以打包对象（info+pack）的形式存储。

### 命令分类

查看对象

* show
* cat-file

操作远程

* remote
* ls-remote

操作索引

* add命令是hash-object + update-index两条命令的组合封装

### 远程访问辨析

git虽然是个分布式版本管理工具，但在我看来网络协议的支持是开发比较晚的，共有4种协议：

1. local协议，其实就是把另一个目录看成是远程仓库，非要说形式的话，可以写成file://前缀地址。如果对应的目录是NFS盘，也算是一种远程目录吧，不过file://方式比ssh方式会慢一些
2. http协议，https://为前缀的地址，又细分dumb和1.6.6版本后新增的smart方式
3. ssh协议，有两种形式，ssh://前缀，或是user@server。是3种协议中，惟一可以不带schema前缀的地址，全功能，但不支持匿名访问
4. git协议，git://为前缀的地址，没有鉴权功能，只适合做匿名仓库

早期的dumb版http访问，严格说并不算一种协议，只要在Web服务端把仓库路径开放出来，客户端利用http协议去访问这个远程路径，不能差分比较和传输，权限控制也全依赖于Web服务器的实现，好处是不挑Web服务器。后来出了个smart版本，要求Web服务必须支持CGI模式，利用http为管道进行两端的协商。

ssh使用时，似乎都采用共用同一个账号（一般是git），每个用户提供不同的公钥方式访问。但ssh作为授权登陆协议，天然不具备匿名访问方式，作为一个开源软件，却不提供让人随意下载的能力，就显得很怪异，加上ssh方案在横向扩容上存在困难，随着http逐渐成熟，因此提供商对ssh方式热情不高，甚至github还提供了如何禁用ssh访问的说明。和ssh协议相反，git协议不支持鉴权，好处是在1.6.6版本以前，可以提供进度条，在智能http出现之前，这种方式和ssh方式形成互补，我甚至想，git协议是不是在没有开发出智能http协议前的一个临时方案，在特定历史时期有其价值。随着智能http日渐普及，git协议似乎没有用武之地，加之git协议还要监听一个非标端口，过防火墙非常困难，目前看来已彻底无用。

#### HTTP Smart协议详解

官方文档明确要求，服务端必须是stateless服务，一切的状态必须记录在客户端，这么做的好处当然是便于服务端扩展。有两个版本，1.6.6的版本是version1，但在大的仓库中还是比较耗时，google在2018年发布了Wire协议，标识为version2，从2.18开始支持，更加命令导向，似乎想往rpc方向发展。

smart协议要求请求的url中，queryString有且只有一个service=xxx参数（仅限v1版，v2版放开此限制），参数共有11种，其中2条POST和9条GET协议。

两条POST协议对应git-upload-pack和git-receive-pack命令，九条GET协议获取的都是.git目录下的文件，用git的术语就是LooseObject、InfoPack、PackFile。

* info/refs
* HEAD
* objects/info/\*
* objects/pack/\*.pack和\*.idx

#### 本地和网络的同步

从概念上说推送要解决两个问题，本地和远程repo怎么建立关联，通信使用什么方式。

clone其他人的库，然后本地进行操作，这种方式自不用说。如果是本地已经有的仓库，想主动推送到远程，就要用关联，操作顺序如下

1. 在web上操作创建一个空的repo(github给我们建的是bare仓库)，注意不要带README.md，后面从本地推上去
2. 进入本地要关联的repo，并执行 git remote add origin https://github.com/user/repo.git
3. git push -u origin master  建立关联
4. 以后每次用 git push 就行了

如果push的时候失败，往往是远端内容不一样，git pull --rebase origin master后再尝试push。每次提交都要求输入用户名和密码，为减少输入，将用户名密码写入配置git config --global credential.helper store，在HOME创建.git-credentials文件(这是store默认的读取文件名)，输入https://{username}:{passwd}@github.com并保存，以后就不用再输入密码了。和store对应的还有cache，默认缓存15分钟，过期要求重新输入。一旦向远程仓库推送过，.git-credentials的内容会被替换掉，无法直接看到明文的用户名和密码，有一定的安全防护。

用git remote -v可以看到当前的连接方式，有fetch和push两个地址。按上面示例操作后，是https方式， origin	https://github.com/user/repo.git (push) 。

除此之外还有SSH格式，用公钥完成认证。先用ssh-keygen先生成公私钥对，ssh-keygen -t rsa -C "your@email"。通过网页的方式把公钥内容贴到Account -> ssh public key对话框。接着把和远程的连接设置成ssh，git remote set-url origin [url]。对github来说，ssh的格式是git@github.com:USERNAME/REPO.git。如果是自建，格式可能是user@IP/REPO.git。

ssh的原理：git会调用ssh，根据ssh_config配置，私钥默认是~/.ssh/id_rsa文件，如果用ssh -T git@github.com会提示 Hi xxx! You've successfully authenticated, but GitHub does not provide shell access. 说明github主机支持ssh协议，且都使用git用户，至于你的用户名，是git用户下的二级用户。由此猜测ssh在不同的服务商不一定相同，换一个服务可能不支持，还是https最通用。

解释下参数中的origin和master

本地修改后要同步到远端源用git push origin master。origin就是git在clone时默认生成的名字，表示对应的remote源，刚clone下来的项目，在.git/refs/remotes目录下只有一个origin目录，且origin又只有一个master目录，这样看刚才那条命令就很好理解了。同一份git仓库可以push到github/gitlab/oschina等很多地方，无非在remotes目录下多几个不同命名的文件夹罢了。比如用git remote add oschina your-url，就会创建一个和origin平级的oschina目录。如果开了分支就可以origin branch-name。不过像个人用户如果项目简单，最简单一条git push就能完成。

如果我clone其他人的库，用我的密码推送呢大概率失败，取决于服务器的配置。

## 小众的fossil

git只是命令行工具，创建服务端必须依赖第三方软件，而fossil自带服务和用户管理，包括设置密码和权限，虽然不支持公钥，但个人使用足够。

初看命令和git有些类似，但语义不同。比如add只要做一次，后面只要被管理的文件有改动，commit就会提交。又比如仓库如果是同步远程的话，如果远程连不上，本地都无法提交。从这个角度看，git确实是完全的分布式版本管理。也难怪fossil的作者自己都说是大教堂模式。

再比如mv指令只能修改fossil管理的文件名，导致既要执行fossil mv又要执行mv，非常分裂而且不便。

默认clone时未指定用户，导致推送也没指定用户名，总是失败。解决办法用`remote-url add http://$USER@ip`，接着输入密码，就能指定向远端push的用户。

fossil的服务端每响应一次请求就会在后台fork出一个fossil进程，直到连接断开后一段才终止进程，实现得非常朴素。而且服务端用nginx的proxy_pass指令后，浏览器无法看，但好在不影响远端同步，就这么用着吧。

由于已经搭建好git仓库，fossil的体验至此阶段性结束，还是那句话，多用主流工具。
