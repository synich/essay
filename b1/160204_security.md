SSH点滴
====
验证方式
----
从日志能看到3种验证方式，debug3: preferred publickey,keyboard-interactive,password。后两种表现上都是密码输入，区别是password是RFC-4252(sec 8)定义的，而keyboard在RFC-4256定义。理论上keyboard会询问用户各种问题，但从实现角度看，只用了密码一种方式。所以两种不同的规范看起来就像一样了(甚至xshell面对keyboard模式能自动输入密码)。两者都可以在`sshd_config`中独立控制，keyboard是KbdInteractiveAuthentication(也可以不设置，用ChallengeResponseAuthentication)，password是PasswordAuthentication。

使用的加密套件是一直在加强的，遇到过用15年的dropbear连接20年的版本，会报没有合适的mac套件，如果是openssh可以加`KexAlgorithms diffie-hellman-group1-sha1`强制允许不够安全的加密方式。

公钥登陆
----
Tinysshd不支持用户名密码登陆(甚至还删除了RSA公钥，只支持ed25519)，又比如安卓的用户体系被裁剪，只有PubkeyAuthentication。部分魔改的安卓程序可以支持用户登陆，比如dory的nodejs，就支持将密码做了SHA256的值保存到~/.ssh/doryauth，不过不是通用做法。

首先使用ssh-keygen -t rsa -C "your@email"工具产生公私钥对，会提示输入passphrase，这是私钥的一个密码，相当于做了二次的保密。如果是生产环境，这个私钥的密码是必须要设置的，我用在内网和虚拟机比较多，再说用公钥登陆本来就是为了方便，所以暂时先不设了，但从安全性角度看，为私钥加个密码，在私钥丢失的时候，还是很有作用的。除了rsa还有dss, dsa, ecdsa, ed25519等很多方式，从7.0版本开始默认不再支持dss。

SSH2版本的公钥文件格式有IETF SECSH(似乎又叫SSL PEM)和OpenSSH两种格式，SSH1已经看不到，不去管它。

* SSL PEM: 文件内容以`-----BEGIN RSA PUBLIC KEY-----`开头，以`-----END RSA PUBLIC KEY-----`结尾
* OpenSSH格式: 从OpenSSH 7.8版本(18年7月)开始作为默认格式，内容全在一行，以ssh-rsa开头，rsa可以换成其它加密技术

命令执行后，生成密钥对，分别是私钥id\_rsa和公钥id\_rsa.pub(算法不同名字会有差异)。需要把公钥上传服务器你想登陆的用户名目录下。
把生成的公钥文件id\_rsa.pub上传并导入ssh服务器的用户目录下的~/.ssh/authorized\_keys文件(OpenSSH和Dropbear都是这个文件)。这样服务器的配置就完成了。补充一点权限相关内容，.ssh目录需要0700权限，而authorized\_keys则需要更严格的0600权限。

为什么上传公钥呢，因为公钥是你发送给运维的，当然不能含有密码，从这个角度看，私钥是更不能外泄的。

接下来就是配置客户端了，只要能拿到RSA私钥的关键数据(即N、E数)，私钥的文本格式不重要。选用putty或SecureCRT的作法稍有不同，
putty用的格式比较特殊，需要使用puttygen这个工具把ssh-keygen生成的id\_rsa转成.ppk后缀的文件，
不过这不影响私钥的数据。如果原始的私钥是带passphrase，puttygen在转换时也会要求输入原始密码，如果输入正确，可以修改密码，
如果输入错误，则是无法转换的。passphrase是用sha256加密，所以puttygen实际上是无法得知原始密码的。当然转换后保存的也是经sha256计算得到的值。**如果用命令行ssh，一定要保证id\_rsa以LF结尾**，出现过误将回车符保存成CRLF，导致ssh报错Invalid format。如果本地有多份id\_rsa私钥，用-i选择指定。虽然默认会用当前用户名路径下的id\_rsa，但不代表绑定当前用户名，比如从A机器用u1用户登陆B机器的u2，即使私钥文件放在u1的目录下，只要指定了登陆B用u2用户，私钥就会和u2目录下的公钥匹配。*私钥放在哪里，并不代表绑定哪个用户，但公钥放在哪个用户的目录下，是绑定该用户的*。

到这步，公钥和私钥都准备好了，怎么在登陆时让putty自动找到私钥呢？putty对不同的ssh服务器有个session的概念，首先load需要登陆的服务器session，在Connection->Data菜单的Auto-login Username输入登陆的用户名，
这样就能在服务器对应目录下寻找公钥，然后在Connection->SSH->Auth的Private key file for authentication中配置转换好的.ppk私钥路径。最后把这些改动save到putty的session中。之后对这个session直接点击open，就可以用公钥方式登服务器了。

**归纳起来就是：先用ssh-keygen生成公私钥，公钥上传sshd服务器，私钥指定给ssh客户端。**

在配置了公钥登陆后，甚至可以禁止密码登陆方式，修改/etc/sshd/sshd_config文件，PasswordAuthentication no。默认允许密码认证。

为了方便使用公钥，专门设计出了ssh-agent和ssh-add这两个程序。首先用ssh-agent $shell启动代理，代理会在/tmp用域套接字监听，然后用ssh-add添加私钥，如果有phrase则输入，代理就得到了私钥。之后再连接远程就不再需要输入私钥的phrase。

主流的生成公私钥对工具是ssh-keygen，偏偏putty提供了类似的puttygen，但格式又不同，生成公私钥对后，千万不要用save public key按钮，因为openssh不识别这种文件格式，需要把窗口中的内容复制出来。

用termux时遇到了server refused our key的错误，折腾再三，将`/usr/etc/ssh/sshd_config`内容加上这几句。似乎0.73版本后没有问题。
```
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile ~/.ssh/authorized_keys
```

通过看putty的log，了解公钥认证的流程。网络连接和加密算法协商之后，putty会从私钥中生成公钥并发给服务器，如果配置了该公钥，服务器会返回接受该公钥。然后putty再发送公钥的签名，签名也被接受后，就进入Access Granted状态。打开一个session，得知agent-forwarding port-forwarding pty user-rc x11-forwarding这些属性，设置pty的速度，双向都是38400kbps，至此会话建立成功。

结合以上的流程，可能失败的原因是缺少最后一句配置，指定公钥文件保存的位置。对sshd来说，收到putty提供的公钥，如果不知道去哪里找，显示会refused。但是对多用户系统是否也能这么写？怀疑应该是可以的，因为即使是公钥登陆，也必须指定用户名（公私钥对和用户名没有关系）。有了用户名，sshd就能从~映射到对应的用户目录。

keygen的使用
----
* ssh-keygen -y -f 私钥  # 从私钥计算公钥，可用-yf
* ssh-keygen -l -f 公钥  # 从公钥计算指纹，可用-lf

隧道
----
平时用ssh感觉永远是连上远程主机并打开shell，其实只有加密连接远程主机这步不可缺少，在远程主机上打开shell是个默认行为，如果选择不打开shell，这时连接已经建立，就可以利用这条加密连接做些其它事，这就是隧道（又叫端口转发，因为是基于ssh的端口，工作在TCP层）。

ssh连接建立后，双端配合启动隧道功能。隧道在客户端打开，所以是ssh在监听，而sshd负责消息转发。以L本地转发为例，客户侧的程序ClientProgram和ssh间是明文通信，ssh和sshd之间当然是密文，到了服务端的sshd侧，再按明文发给预设的端口，就完成了隧道的使命。

因为ssh原本的任务就是加密并在server端启动shell进程，隧道无非是把启动shell改成向另一个指定端口转发消息，和整个流程是契合的。

认证代理
--
使用公私钥登陆时，如果所有主机用同一个私钥还好，但现实往往不同主机配不同私钥，ssh只认`id_rsa`一个名字（算法不同名字不同），这就导致要手动指定私钥。为解决这个问题，就有了ssh-agent和ssh-add这套方案，可以一次性手动把所有私钥通过ssh-add加到agent，如果私钥有passphrase，只要在add时输入一次，只要agent不挂，以后不用再输入，这样看起来私钥带上passphrase也并不麻烦。但有点让我介意的是，即使退出终端agent并不会结束，下一个人或者其他人登陆这台主机，可以可享agent规则登陆所有你登陆的主机，只是无法知道passpharse。虽说并没有更多的权限，但总感到有些不妥。
