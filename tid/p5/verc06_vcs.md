# 04 Git远程访问辨析

git虽然是个分布式版本管理工具，但在我看来网络协议的支持是开发比较晚的，共有4种协议：

1. local协议，其实就是把另一个目录看成是远程仓库，非要说形式的话，可以写成file://前缀地址。如果对应的目录是NFS盘，也算是一种远程目录吧，不过file://方式比ssh方式会慢一些
2. http协议，https://为前缀的地址，又细分dumb和1.6.6版本后新增的smart方式
3. ssh协议，有两种形式，ssh://前缀，或是user@server。是3种协议中，惟一可以不带schema前缀的地址，全功能，但不支持匿名访问
4. git协议，git://为前缀的地址，没有鉴权功能，只适合做匿名仓库

早期的dumb版http访问，严格说并不算一种协议，只要在Web服务端把仓库路径开放出来，客户端利用http协议去访问这个远程路径，不能差分比较和传输，权限控制也全依赖于Web服务器的实现，好处是不挑Web服务器。后来出了个smart版本，要求Web服务必须支持CGI模式，利用http为管道进行两端的协商。

ssh使用时，似乎都采用共用同一个账号（一般是git），每个用户提供不同的公钥方式访问。但ssh作为授权登陆协议，天然不具备匿名访问方式，作为一个开源软件，却不提供让人随意下载的能力，就显得很怪异，加上ssh方案在横向扩容上存在困难，随着http逐渐成熟，因此提供商对ssh方式热情不高，甚至github还提供了如何禁用ssh访问的说明。和ssh协议相反，git协议不支持鉴权，好处是在1.6.6版本以前，可以提供进度条，在智能http出现之前，这种方式和ssh方式形成互补，我甚至想，git协议是不是在没有开发出智能http协议前的一个临时方案，在特定历史时期有其价值。随着智能http日渐普及，git协议似乎没有用武之地，加之git协议还要监听一个非标端口，过防火墙非常困难，目前看来已彻底无用。

## HTTP Smart协议详解

官方文档明确要求，服务端必须是stateless服务，一切的状态必须记录在客户端，这么做的好处当然是便于服务端扩展。有两个版本，1.6.6的版本是version1，但在大的仓库中还是比较耗时，google在2018年发布了Wire协议，标识为version2，从2.18开始支持，更加命令导向，似乎想往rpc方向发展。

smart协议要求请求的url中，queryString有且只有一个service=xxx参数（仅限v1版，v2版放开此限制），参数共有11种，其中2条POST和9条GET协议。

两条POST协议对应git-upload-pack和git-receive-pack命令，九条GET协议获取的都是.git目录下的文件，用git的术语就是LooseObject、InfoPack、PackFile。

* info/refs
* HEAD
* objects/info/\*
* objects/pack/\*.pack和\*.idx

## 本地和网络的同步

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
