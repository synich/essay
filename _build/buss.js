function _uniid(base){return `u${base}${Math.round(Math.random()*65536)}`}
function renderText(txt){
  if ("#"==txt[0]){return marked.parse(txt.replace(/\[\[([^\] ]+)\]\]/g, "*$1*"))}
  else {return `<p>${txt.replace(/\n/g, "<br/>")}</p>`}}
function dumpobj(e){var t= typeof e;for (let i in e){t=t+`\n${i} : ${e[i]}`};alert(t)}
function _ttl_of_text(txt){var sp= "#"==txt[0]?2:0;return txt.substring(sp, txt.indexOf("\n"))}
function _close_btn(uid){return `<input value="close" type=button onclick="$tm.ev_rmnode('${uid}')"/>`}
function saveFile(flname, txt){
  var a = document.createElement('a')
  a.download = flname
  a.href = URL.createObjectURL(new Blob([txt], {type: 'text/plain'}))
  a.click()
}
function createTitleLink(ttl, i){
  if (i!=undefined) {
	return `<p class="s_item" onclick="$tm.ev_shwCard(${i})">${ttl}</p>`
  }else {return `<p>ERR LINK: ${ttl}</p>`}
}
function createAllTopH(tag_n){
  var toph=""
  for (let t in config.tagtr[tag_n]){
	var showh = config.tagtr[tag_n][t]
	toph+=`<h2 class="top_h2" onclick="$tm.ev_shwHd('${t}')">${showh}</h2>`
  }
  return toph
}
function createCata(tag){
  var div = document.createElement('div')
  uniid=_uniid(tag)
  div.id=uniid
  div.className="card sec_pad"
  tag2ttl[tag].sort()
  var ttl_lnk=""
  for (let ttl of tag2ttl[tag]){
	let i = ttl2idx[ttl]
	let title_ctx_num = `${ttl} (${jctx[i]["text"].length}字)`
	ttl_lnk+=createTitleLink(title_ctx_num, i)
  }
  ttl_lnk+=`<hr />${tag} ${tag2ttl[tag].length}篇${_close_btn(uniid)}`
  div.innerHTML=ttl_lnk
  return div
}
function createCard(art, idx){
  var div = document.createElement('div')
  var uniid = _uniid(art["id"])
  div.id=uniid
  div.className="card art_pad"
  var ttl=_ttl_of_text(art["text"])
  var lnkelem=""
  if (lnkmap[ttl]){
	let lst=lnkmap[ttl].split(",")
	for (let v of lst){
	  lnkelem+=createTitleLink(v, ttl2idx[v])
	}
  }
  var edtbtn = config.edit?`<input value="edit" type=button onclick="$tm.ev_shwEdt(${idx})"/>`:"";
  var tag= art["tag"]=="unknown"?"":`_${art["tag"]}`
  div.innerHTML=renderText(art["text"])+`<hr />${art["id"]}${tag}
	${lnkelem}
	${edtbtn}
	${_close_btn(uniid)}`
  return div
}
function insert_div(target, div){
  document.getElementById(target).before(div)
  window.scrollTo({"left": div.offsetLeft, "top": div.offsetTop, behavior: "smooth"})
}
function _find_bykwd(kwd) {
  var ret = []
  var kl = kwd.split(/\s+/)
  var klen = kl.length
  for (let i in jctx) {
    var mc=0, mp, mt=""
    for (let j=0;j<klen;j++){
	  if (0==kl[j].length){mc++;continue}
	  var txt = jctx[i]["text"]
	  if (128>kl[j].charCodeAt(0)) {/*ignoreCase english*/
	    mp = txt.search(RegExp(kl[j],"i"))
	  } else {
		mp = txt.indexOf(kl[j])
	  }
	  mc += mp>=0?1:0
	  mt += mp>=0?`${txt.slice(Math.max(mp-5, 0),mp)}<span class="kwd_em">${kl[j]}</span>${txt.slice(mp+kl[j].length, mp+kl[j].length+6)} `:""
	}
    if (mc==klen) {ret.push([i, mt])}
  }
  return ret
}
var tmout
var ttl2idx={}
var tag2ttl={}
var lnkmap={}
// event function definition
top.$tm.ev_findkwd=function(){
  function _search() {
    var kwd = document.getElementById("kwd").value
    if (kwd.length==0) {document.getElementById("kwd_show").innerHTML ="";return}
    var lst = _find_bykwd(kwd)
    var jmp_ttl = ""
    for (let pr of lst){
	  let i=pr[0], mt=pr[1]
      let ttl = _ttl_of_text(jctx[i]["text"])
      jmp_ttl += createTitleLink(ttl, i)+mt
    }
    document.getElementById("kwd_show").innerHTML = jmp_ttl
  }
  clearTimeout(tmout)
  tmout=setTimeout(_search, 250)
}
top.$tm.ev_rmnode=function(id){var n=document.getElementById(id);n.remove()}
top.$tm.ev_save=function(idx, taid){
  var art = jctx[idx]
  var ta = document.getElementById(taid)
  saveFile(`${art["id"]}_${art["tag"]}.md`, ta.value)
}
top.$tm.ev_chgVorE=function(mdid){
  var md = document.getElementById(mdid)
  if (md.style.display=="none"){
	md.style.display="block"
  } else {
	md.style.display="none"
  }
}
top.$tm.ev_shwCard=function(idx){
  var div = createCard(jctx[idx], idx)
  insert_div("kwd_show", div)
}
top.$tm.ev_shwHd=function(tag) {
  var div = createCata(tag)
  insert_div("kwd_show", div)
}
top.$tm.ev_shwEdt=function(idx){
  var div = document.createElement('div')
  var art = jctx[idx]
  var uniid = _uniid(art["id"])
  div.id=uniid
  div.className="card art_pad edit_zone"
  var spid = _uniid("sp"+art["id"])
  var taid = _uniid("ta"+art["id"])
  var mdid = _uniid("dv"+art["id"])
  div.innerHTML=`<span style="color: blue">Draft Zone</span>
	<div style="display: flex">
	<div class="auto_high sd_by_sd">
	  <span id="${spid}" class="auto_high"></span>
	  <textarea id="${taid}" class="auto_high"></textarea>
	</div>
	<div id="${mdid}" style="display: none" class="sd_by_sd prv_pad"></div>
	</div>
	<hr />
	<input value="preview" type=button onclick="$tm.ev_chgVorE('${mdid}')"/>
	<input value="save" type=button onclick="$tm.ev_save(${idx}, '${taid}')" />
	${_close_btn(uniid)}`
  insert_div("kwd_show", div)
  var ta = document.getElementById(taid)
  ta.value = art["text"]
  document.getElementById(mdid).innerHTML = renderText(ta.value)
  ta.addEventListener('input', function(ev){
	document.getElementById(mdid).innerHTML=renderText(ev.target.value)
  })
  // textarea height auto to rext
  var d_span = document.getElementById(spid)
  var d_area = document.getElementById(taid)
  d_span.innerHTML = d_area.value+' ';
  d_area.addEventListener('input', function(e) {
    d_span.innerHTML = d_area.value+' ';
  })
}
top.$tm.ev_boot=function(){
  load_jctx()
  for (let i in jctx) {
    let ttl = _ttl_of_text(jctx[i]["text"]); ttl2idx[ttl]=i
    let tag = jctx[i]["tag"]
	if (!tag2ttl[tag]) {tag2ttl[tag]=[]};tag2ttl[tag].push(ttl)
	let lnk=jctx[i]["text"].match(/\[\[[^\] ]+\]\]/g)
    if (lnk){
	  for (let v of lnk) {
		let to_lk=v.slice(2, -2)
		if (lnkmap[ttl]===undefined){lnkmap[ttl]=to_lk}
		else {if (-1==lnkmap[ttl].indexOf(to_lk)){lnkmap[ttl]+=`,${to_lk}`} }
		if (lnkmap[to_lk]===undefined){lnkmap[to_lk]=ttl}
		else {if (-1==lnkmap[to_lk].indexOf(ttl)){lnkmap[to_lk]+=`,${ttl}`}}
	  }
    }
  }
  document.getElementById("eTopTag1").innerHTML=createAllTopH(0)
  document.getElementById("eTopTag2").innerHTML=createAllTopH(1)
  document.getElementById("eTopTag3").innerHTML=createAllTopH(2)
  var dt = new Date();
  document.getElementById("eFter").innerHTML=`Generated at $GEN_DATE, 共${jctx.length}篇笔记<br />© 2014 - ${dt.getFullYear()} 由mytid强力驱动`
}
