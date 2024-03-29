# 人脸查询协议的理解

一个人脸查询协议反复看了大半年，每次看都有新的体会，直到现在我也不确信是不是完整理解它。

人脸比对涉及两种对像，历史库和注册库，保存的虽然都是人，但历史库是对人一瞬间的描述，注册库则是对人精确描述，两者差异极大。比如年龄，在历史库是年龄但到了注册库却变成了生日，同一件事要用两个角度去解释。

既然两种不同性质的库，查询条件就应该不一样，合在一个接口已经容易引起误解，偏偏最重要的，从哪个库查询字段却放在中间很不起眼的位置，人的理解思维总是头尾相对容易重视，中间如果太多往往会不耐烦地跳过，偏偏这个协议的协议字段有二十多个。

我的调整是，首先按历史库和注册库拆分成两条协议，并对查询条件分类。比如上面提到的年龄，另外像历史库用到的眼镜和注册库用到的家族住址。

除了指定信息查找外，人脸还有种好玩的查询叫以图搜图。给一张照片，会返回若干张和这个照片最像的候选人像。如果有图片，图片本身就表示了一切属性，此时检索条件又不一样，因此又再细分为信息查询和以图搜图。而以图搜图的条件也多是一些模糊性的条件，比如按人脸哪个区域比对（选眼睛还是鼻子）。

经过这样分解拆分成4条协议，再结合对业务理解，可读性才勉强到可用的程度。

再说说库相似度。有需求要求修改人脸库时可以修改相似度，最初我也觉得可以，但经人提醒意识到，为什么会有相似度，是因为人脸识别算法的不准确性需要阈值，但既然是阈值一定要结合当时的环境一起考虑，不应一概而论。环境就是视频通道，经过讲解让需求方接受了这个用法。看一个概念要理解其背后代表的含义和适用场景，否则就容易用偏。