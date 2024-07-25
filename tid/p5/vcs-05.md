# 03 理解Git概念篇

和cvs/svn相比，操作粒度从文件变成了commit。而操作步骤上的变化则是多出了暂存区index的概念，每次提交都分为add(也可以用stage，同义词)和ci两个步骤。有观点提出，这是为了达到svn的多文件原子提交，但命令行不容易选文件，于是多出个中间环节，先小步多次挑选要提交的文件，用add将工作区的文件提交到index暂存区，然后ci实现原子化的从暂存区向仓库区的提交。通过日志也能看到commit前后两次index的变化，每次也会用sha1编码来表示。

其实暂存区并不是必备的，创建时用git init --bare就能创建没有.git目录的仓库（原来放在.git目录下的文件在当前目录直接能看到，相当于整个目录自己就是.git目录）。这个仓库无法执行add操作，一般用来做中心仓库，多人向裸仓库推。如果不这样，冲突会很多，所以有bare特性。

存储方式也不同于cvs的差分保存，每次提交都会保存一份完整的记录在objects/目录下，不仅文件，每次commit时的目录结构、日志都会保存。通过git gc打包会把这些文件压缩成idx和pack文件，如果操作过程干净，所有的独立文件都会被压缩，当遇到stash恢复冲突等特殊场景，会有少量文件无法被打包。

git有三个层面的配置local(repo级), global(用户级), system(/etc级)。

一切皆object的设计理念

每个object都用SHA-1表示，有4种类型：commit, tag, tree, blob。互相之间的关系是：tree和blob共同组成commit，对commit打上标记形成tag。

## commit

所有的提交形成一个commit树，每个commit号标示出树上唯一确定的点。本地或远程Branch、Tag、HEAD都是这个commit树上某个点或某根枝条的别名。

* HEAD: 动态指向这棵树上当前开发最新节点。注意这个最新不一定是树的末端，而是当前开发在哪个状态，随着每次提交动作而移动
* Tag: 静态指向commit树的某个节点，一旦确定就永远不再变化
* Branch: 对应commit树上某一段（如果不开分支，就是整棵树）的别名，由于是枝的形状，所以不表示某个具体的提交点，但可以沿着枝来溯源
* dangling/orphaned: 有些提交被reset或其它操作重置后，无法被任何的命名分支追踪到，成了孤立提交。用`git fsck --full --no-reflogs --unreachable --lost-found`和`git gc --prune=now`来找到或清理它们

## tag

打上tag后，可以用name-rev或describe查看某个commit和tag的关系，但似乎name-rev只能找比tag时间更早的commit，而describe恰好相反，只能找比tag时间晚的commit。

## 分支

仅仅init不会有分支，必须在提交后才会有第一个master。分支和暂存区之间会引入复杂的关系，如果暂存区有内容，换分支有可能被中止，提交或stash后才能继续换分支。说明只有分支是独立存在，暂存区只有一个，是多分支共享的。这也是stash存在的原因。

refs/heads/保存了所有分支。删除一个旧的分支，没问题。但如果删除的是比当前要新的分支，用-d是没用的，防止辛苦做的提交白白丢失。如果确实没用，-D还是能删的。

一个本地仓库可以对应多个远程分支，不同的远程仓库间用名字区分。比如用 `git remote add origin git@github.com:synich/demo.git` 添加一个远程origin分支。master和origin都是默认名字，并没有要求必须用这个名字，一般大家都遵守这种习惯。

远程分支和本地分支不一样。远程分支类似tag是一个引用，origin在本地仓库是个独立的命名空间，因此可以创建多个远程。每个远程分支都会和一个本地分支建立关联，关联之后，其它本地分支间的操作，再套上一层网络传输就可以无缝衔接了。

## 目录结构解读

工作区很好理解，写代码的根目录下自己写的代码都是，但除此以外只有.git目录代表仓库，所谓的索引到底是什么，有无实体？

### 索引文件

秘密就在 `.git/index` 这个二进制文件，索引只会记录文件名和SHA-1，不记录具体内容。如果索引的文件条目特别多，可以用update-index --split-index切分。索引分了若干段，第一个是DIRC段，一般会有TREE段，至于更复杂的REUC/UNTR/FSMN段只在特定场景或配置后才会出现。

### 仓库区

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

## 命令分类

查看对象

* show
* cat-file

操作远程

* remote
* ls-remote

操作索引

* add命令是hash-object + update-index两条命令的组合封装
