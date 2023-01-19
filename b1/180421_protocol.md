# 浏览器对文件的处理

协议工作经常遇到Web开发问及如何处理二进制数据的问题，查了资料并记录。

最早的HTML浏览器实现，是李在1990年实做的，IETF在93年中发布了相关草案，在95年11月24日发布的HTML2.0规范RFC1866，这份规范的内容非常简洁，只有77页。它定义了HTML的MIME类型、基本元素，紧接着在次日，发布了名为《HTML中基于表单的文件上传》的1867。后来的RFC1942又扩充了table的表示法。

1866的HTML表单规范为INPUT元素的TYPE属性定义了八种可能的值，分别是：CHECKBOX, HIDDEN, IMAGE, PASSWORD, RADIO, RESET, SUBMIT, TEXT。另外，当表单采用POST方式的时候，表单默认的具有"application/x-www-form-urlencoded" 的ENCTYPE属性。1867则建议对HTML做出了两处修改：

1. 为INPUT元素的TYPE属性增加了一个FILE选项。
2. INPUT标记可以具有ACCEPT属性，该属性能够指定可被上传的文件类型或文件格式列表。

另外，本建议还定义了一种新的MIME类型：multipart/form-data（因为urlencoded效率太低了），以及当处理一个带有
ENCTYPE="multipart/form-data" 并且/或含有`<INPUT type="file">`的标记的表单时所应该
采取的行为。

由于ENCTYPE不同，每个文件都必须配备一个单独的表单。不能和文本类的form共用一个表单。

随着HTML的发展，IETF也就是RFC的责任方决定将它交给W3C组织专门维护，也就没有RFC来记载HTML的描述了。

上传
----
时间来到了HTML5标准，file元素配合FileReader对象，有了更多的变化。通过getElementById拿到这个file对象后，一个files的数组(虽然我没见过支持多文件选择，也许是为了以后扩展吧)，取`files[0]`就是文件对象，这个对象可以传到FileReader.readAsXXX。由于JS的异步属性，读取到的内容惯用法是在回调函数中返回，
```
reader=new FileReader;
reader.readAsDataURL(files[0]);
reader.onload = function(){ this.result;// this指向reader，读取成功onload，不考虑成功失败，用onloadend也行}
```

奇怪的是即使用二进制读出图片数据，再用base64转换得到的长度始终有问题，只能用DataURL获取图片，原因未知。

下载
----
静态方式的下载用href标签可以实现`<a href=http://www.xx.com/xx.zip>点击下载</a>`，但是问题不少，用PHP实现，核心代码

```
  header("Content-Type: application/octet-stream");
  header("Content-Length: ".$fsize);
  header("Content-Disposition: attachment; filename=xx.zip" );
  @ob_clean();
  flush();
  readfile($f);
  exit;
```

把文件类型改成octet，然后用readfile函数把文件写入标准输出流，由于PHP的stdout已经绑定到HTTP连接，客户端就能得到完整的文件。通常Content-Length是规范要求必须有的，没有的话浏览器也会兼容，但下载过程中无法显示总长度和当前进度。标准中这个字段表示传输过程中的长度，嚼字眼的话说明不是文本的原始长度，比如开启了gzip压缩，传输长度和实体长度就不一样，如果PHP外面的nginx又套了gzip，由于nginx无法事先知道要代理的内容长度，干脆全部用chunk方式传输，此时Content-Length会被chunk遮蔽，也不会有问题。