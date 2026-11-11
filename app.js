'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s).toLowerCase().normalize('NFKC').replace(/[ұү]/g,'у').replace(/қ/g,'к').replace(/ғ/g,'г').replace(/ә/g,'а').replace(/ө/g,'о').replace(/ң/g,'н').replace(/і/g,'и');
let book, pageMap, questionMap, articleMap, scale = 1;
const state = {page:'cover',question:null,tab:'articles',filter:'全部',query:'',mode:'h5',zoom:1};
try {state.page=localStorage.getItem('oku-page')||'cover';state.mode=localStorage.getItem('oku-mode')||(innerWidth<760?'flow':'h5');} catch {}
const measure = document.createElement('canvas').getContext('2d');

function go(page,question=null){
  const hash='#'+new URLSearchParams({p:page,...(question?{q:question}:{})});
  if(location.hash!==hash) history.pushState(null,'',hash);
  readHash();
  closeMenu();
}
function readHash(){
  const params=new URLSearchParams(location.hash.slice(1));
  const requested=params.get('p');
  if(requested && pageMap.has(requested)) state.page=requested;
  if(!pageMap.has(state.page)) state.page='cover';
  state.question=questionMap.has(params.get('q'))?params.get('q'):null;
  if(state.question) state.page=questionMap.get(state.question).pageId;
  try {localStorage.setItem('oku-page',state.page);} catch {}
  renderPage();renderNav();
}
function closeMenu(){$('#sidebar').classList.remove('open');$('#scrim').hidden=true;$('#menu-button').setAttribute('aria-expanded','false');}
function activeArticle(){return articleMap.get(pageMap.get(state.page)?.articleId);}
function card({title,page,question,top='',sub='',tags=[]}){
  const active=question?state.question===question:page===state.page;
  return `<button class="nav-card ${active?'active':''}" data-page="${esc(page)}" ${question?`data-question="${esc(question)}"`:''}><span class="nav-top"><span class="nav-num">${esc(top)}</span><span class="nav-page">${page?.startsWith('p')?esc(page.slice(1))+' 页':''}</span></span><strong>${esc(title)}</strong>${sub?`<small>${esc(sub)}</small>`:''}${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</button>`;
}
function renderNav(){
  if(!book)return;
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-selected',b.dataset.tab===state.tab);});
  const filters=state.tab==='articles'?book.themes:state.tab==='questions'?book.questionTags:[];
  $('#filters').innerHTML=state.query?'':filters.length?['全部',...filters].map(f=>`<button class="filter ${state.filter===f?'active':''}" data-filter="${esc(f)}">${esc(f)}</button>`).join(''):'';
  let html='';
  if(state.query){
    const query=normalize(state.query.trim());
    const num=query.match(/^(?:题目|題目|题|題|q)\s*(\d+)$/);
    const pageNumber=query.match(/^(?:第)?(\d+)\s*(?:页|頁)$/);
    let results=[];
    if(pageNumber&&pageMap.has('p'+Number(pageNumber[1])))results.push(card({title:`跳转到第 ${Number(pageNumber[1])} 页`,page:'p'+Number(pageNumber[1]),top:'书页'}));
    for(const a of book.articles)if(!num&&normalize(a.title+' '+a.theme+' '+a.genre).includes(query))results.push(card({title:a.title,page:'p'+a.start,top:'篇目',tags:[a.theme]}));
    for(const q of book.questions)if(num? q.number===Number(num[1]):normalize(q.text+' '+q.tags.join(' ')+' '+q.articleTitle).includes(query))results.push(card({title:`题目 ${q.number} · ${q.articleTitle}`,page:q.pageId,question:q.id,top:'练习',sub:q.text.slice(0,100),tags:q.tags}));
    if(!num&&!pageNumber)for(const p of book.pages)if(p.lines.some(l=>normalize(l.text).includes(query)))results.push(card({title:p.title,page:p.id,top:'文字匹配',sub:'第 '+p.label+' 页'}));
    html=`<div class="result-count">找到 ${results.length} 个结果</div>`+results.slice(0,100).join('');
    if(!results.length)html+='<p class="empty">没有找到结果<br>试试篇名、哈萨克文关键词，或「题目1」</p>';
  }else if(state.tab==='articles'){
    html=book.articles.filter(a=>state.filter==='全部'||a.theme===state.filter).map((a,i)=>card({title:a.title,page:'p'+a.start,top:String(book.articles.indexOf(a)+1).padStart(2,'0')+' / '+a.genre,sub:a.questionIds.length?`${a.questionIds.length} 道题目`:'阅读导言',tags:[a.theme]})).join('');
  }else if(state.tab==='questions'){
    html=book.questions.filter(q=>state.filter==='全部'||q.tags.includes(state.filter)).map(q=>card({title:`题目 ${q.number}`,page:q.pageId,question:q.id,top:q.articleTitle,sub:q.text.slice(0,95),tags:q.tags})).join('');
  }else{
    html='<div class="page-grid">'+book.pages.map(p=>`<button class="page-cell ${p.id===state.page?'active':''}" data-page="${p.id}">${esc(p.label)}</button>`).join('')+'</div>';
  }
  $('#nav-list').innerHTML=html;
}
function renderContext(){
  const p=pageMap.get(state.page),a=activeArticle();
  if(!a){
    $('#context-panel').innerHTML=`<span class="panel-kicker">一页一页，读懂世界</span><h3>阅读，是一场<br>小小的探索。</h3><p>从一篇文章开始，循着问题思考。需要回看时，原稿就在身边。</p><div class="mini-stats"><div><b>${book.articles.length}</b><span>篇阅读材料</span></div><div><b>${book.questions.length}</b><span>道练习</span></div></div><button class="primary" data-page="p5">开始阅读 →</button><div class="context-divider"></div><span class="panel-kicker">如何使用</span><p>在左侧选择篇目，或切换到「题目」按练习类型筛选。<br><br>「重建版」保留版式，「易读版」适合连续阅读，「原稿」用于核对。</p><a class="scan-link" href="${p.scan}" target="_blank" rel="noopener">查看完整扫描第 ${p.sourcePage} 页 ↗</a>`;
    return;
  }
  const questions=a.questionIds.map(id=>questionMap.get(id));
  const selected=questionMap.get(state.question);
  $('#context-panel').innerHTML=`<span class="panel-kicker">正在阅读 / 第 ${a.start}–${a.end} 页</span><h3>${esc(a.title)}</h3><span class="tag">${esc(a.theme)}</span><span class="tag">${esc(a.genre)}</span><div class="context-divider"></div><span class="panel-kicker">本篇题目 · ${questions.length}</span>${questions.map(q=>`<button class="question-link ${q.id===state.question?'active':''}" data-page="${q.pageId}" data-question="${q.id}"><b>题目 ${q.number}</b><span>${q.pageNumber} 页 ↗</span><small>${esc(q.tags.join(' · '))}</small></button>`).join('')||'<p>本篇为阅读导言。</p>'}${selected?`<div class="selected-question">${esc(selected.text)}</div>`:''}<a class="scan-link" href="${p.scan}" target="_blank" rel="noopener">查看完整扫描第 ${p.sourcePage} 页 ↗</a>`;
}
function makeCover(p,paper){
  paper.classList.add('cover-paper');
  if(p.id==='cover'){
    const art=p.images[0]?.src||'assets/images/page_001_image_01.webp';
    paper.innerHTML=`<div class="cover-header"><div class="cover-title">ОҚУ</div><div class="cover-subtitle">ТЕХНИКАСЫ</div><div class="cover-description">Бастауыш сынып оқушыларының оқу техникасын<br>тексеруге арналған жұмыс дәптері</div></div><img class="cover-illustration" src="${art}" alt="两个孩子一起读书"><div class="cover-lines"></div><div class="cover-grade">4-сынып</div>`;
  }else{
    paper.innerHTML='<img class="back-illustration" src="assets/images/back-illustration.png" alt="孩子读书插图"><div class="back-title">ОҚУ ТЕХНИКАСЫ</div><div class="back-description">Бастауыш сынып оқушыларының оқу техникасын<br>тексеруге арналған жұмыс дәптері</div><img class="back-barcode" src="assets/images/barcode.png" alt="原书条码">';
  }
}
function position(el,b){el.style.left=b[0]+'px';el.style.top=b[1]+'px';el.style.width=(b[2]-b[0])+'px';el.style.height=(b[3]-b[1])+'px';}
function renderPaper(p){
  const stage=$('#stage');stage.replaceChildren();stage.hidden=false;$('#flow').hidden=true;
  const paper=document.createElement('div');paper.className='paper';paper.style.width=p.width+'px';paper.style.height=p.height+'px';stage.append(paper);
  if(state.mode==='scan'){
    const img=document.createElement('img');img.className='scan-image';img.src=p.scan;img.alt=`原书第 ${p.label} 页`;img.style.cssText=`left:${-p.crop[0]}px;top:${-p.crop[1]}px;width:${p.scanWidth}px;height:${p.scanHeight}px`;paper.append(img);
  }else if(p.id==='cover'||p.id==='back') makeCover(p,paper);
  else{
    for(const b of p.rules){const line=document.createElement('div');line.className='paper-rule';position(line,b);paper.append(line);}
    for(const b of p.checkboxes){const box=document.createElement('div');box.className='paper-checkbox';position(box,b);paper.append(box);}
    for(const art of p.images){const img=document.createElement('img');img.className='book-image';img.src=art.src;img.alt='原书插图';position(img,art.bbox);paper.append(img);}
    for(const l of p.lines){
      if(p.images.some(i=>l.bbox[0]>=i.bbox[0]&&l.bbox[2]<=i.bbox[2]&&l.bbox[1]>=i.bbox[1]&&l.bbox[3]<=i.bbox[3]))continue;
      const el=document.createElement('span');el.className='ocr-line';el.textContent=l.text;el.dataset.line=l.id;
      const b=l.bbox,weight=l.bold?650:400;
      // Skewed scan boxes include the slope of a whole line. Fit by text width
      // as well as box height so that long lines cannot grow into their neighbors.
      measure.font=`${weight} 100px Book`;
      const widthFit=(b[2]-b[0])/(measure.measureText(l.text).width||1)*100;
      const font=Math.max(18,Math.min((b[3]-b[1])*.92,widthFit));
      measure.font=`${weight} ${font}px Book`;
      const natural=measure.measureText(l.text).width||1, sx=(b[2]-b[0])/natural;
      const top=b[1]+Math.max(0,(b[3]-b[1]-font)/2);
      el.style.cssText=`left:${b[0]}px;top:${top}px;font-size:${font}px;font-weight:${weight};transform:scaleX(${sx});`;
      paper.append(el);
    }
  }
  const q=questionMap.get(state.question);
  if(q&&q.pageId===p.id){const mark=document.createElement('div');mark.className='question-outline';position(mark,[q.bbox[0]-15,q.bbox[1]-12,q.bbox[2]+15,q.bbox[3]+15]);mark.innerHTML=`<span class="question-marker">题目 ${q.number}</span>`;paper.append(mark);}
  resizePaper();
}
function renderFlow(p){
  $('#stage').hidden=true;const flow=$('#flow');flow.hidden=false;flow.replaceChildren();
  if(p.id==='cover'||p.id==='back'){
    flow.innerHTML=`<p class="eyebrow">4 年级 · 哈萨克语阅读</p><h2>ОҚУ ТЕХНИКАСЫ</h2><img src="${p.id==='cover'?'assets/images/page_001_image_01.webp':'assets/images/back-illustration.png'}" alt="孩子一起读书"><p>Бастауыш сынып оқушыларының оқу техникасын тексеруге арналған жұмыс дәптері</p><button class="primary" data-page="p5">开始阅读 →</button>`;return;
  }
  const questions=p.questions.map(id=>questionMap.get(id)),qLines=new Set(questions.flatMap(q=>q.lineIds)),items=[];
  for(const q of questions)items.push({y:q.bbox[1],type:'question',q});
  for(const art of p.images)items.push({y:art.bbox[1],type:'image',art});
  let paragraph=null,last=null;
  for(const l of p.lines){
    if(qLines.has(l.id)||p.images.some(i=>l.bbox[0]>=i.bbox[0]&&l.bbox[2]<=i.bbox[2]&&l.bbox[1]>=i.bbox[1]&&l.bbox[3]<=i.bbox[3])){paragraph=null;last=null;continue;}
    if(l.role==='number'&&l.bbox[1]>p.height*.9)continue;
    const gap=last?l.bbox[1]-last.bbox[3]:100;
    if(!paragraph||l.bold||last?.bold||gap>(l.bbox[3]-l.bbox[1])*.7){paragraph={y:l.bbox[1],type:l.bold?'heading':'text',text:l.text};items.push(paragraph);}else{
      // Numeric ranges retain the printed hyphen when two scan lines join.
      if(paragraph.text.endsWith('-'))paragraph.text=/\d-$/.test(paragraph.text)&&/^\d/.test(l.text)?paragraph.text+l.text:paragraph.text.slice(0,-1)+l.text;
      else paragraph.text+=' '+l.text;
    }
    last=l;
  }
  items.sort((a,b)=>a.y-b.y);
  flow.innerHTML=items.map(item=>item.type==='question'?`<section id="flow-${item.q.id}" class="flow-question ${state.question===item.q.id?'active':''}"><label>题目 ${item.q.number} · ${esc(item.q.tags.join(' / '))}</label>${esc(item.q.text)}</section>`:item.type==='image'?`<img src="${item.art.src}" alt="原书插图">`:item.type==='heading'?`<h3>${esc(item.text)}</h3>`:`<p>${esc(item.text)}</p>`).join('')+`<p class="flow-page-number">— ${p.label} —</p>`;
}
function resizePaper(){
  const p=pageMap?.get(state.page),paper=$('#stage .paper');if(!p||!paper||state.mode==='flow')return;
  const available=Math.min(740,$('#paper-scroll').clientWidth-(innerWidth<760?26:60));
  scale=Math.max(200,available)/p.width*state.zoom;
  paper.style.transform=`scale(${scale})`;$('#stage').style.width=p.width*scale+'px';$('#stage').style.height=p.height*scale+'px';
  $('#zoom-reset').textContent=state.zoom===1?'适宽':Math.round(state.zoom*100)+'%';
}
function renderPage(){
  const p=pageMap.get(state.page),a=activeArticle();$('#loading').hidden=true;
  $('#page-title').textContent=p.id==='cover'?'Оқу техникасы':p.title;
  $('#breadcrumb').textContent=a?`${a.theme} / ${a.genre}`:p.id==='cover'?'READ • THINK • EXPLORE':'阅读技能训练册';
  $('#page-jump').value=p.label;$('#source-label').textContent=`扫描 ${p.sourcePage}/50 · ${p.side==='left'?'左页':'右页'}`;
  const index=book.pages.indexOf(p);$('#prev').disabled=index===0;$('#next').disabled=index===book.pages.length-1;
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode);});
  $('.zoom-controls').style.visibility=state.mode==='flow'?'hidden':'visible';
  if(state.mode==='flow')renderFlow(p);else renderPaper(p);
  renderContext();$('#paper-scroll').scrollTop=0;
  document.title=(p.id==='cover'?'Оқу':p.title+' · '+p.label+' 页')+' | 阅读技能训练册';
  requestAnimationFrame(()=>{
    if(!state.question)return;
    if(state.mode==='flow')$('#flow-'+state.question)?.scrollIntoView({block:'center',behavior:'smooth'});
    else{const q=questionMap.get(state.question);$('#paper-scroll').scrollTo({top:Math.max(0,q.bbox[1]*scale-90),behavior:'smooth'});}
  });
}
function turn(delta){const index=book.pages.findIndex(p=>p.id===state.page),p=book.pages[index+delta];if(p)go(p.id);}
function listen(){
  addEventListener('hashchange',readHash);new ResizeObserver(resizePaper).observe($('#paper-scroll'));
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-page]');if(target){go(target.dataset.page,target.dataset.question||null);return;}
    const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;state.filter='全部';state.query='';$('#search').value='';renderNav();return;}
    const filter=e.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;renderNav();return;}
    const mode=e.target.closest('[data-mode]');if(mode){state.mode=mode.dataset.mode;state.zoom=1;try{localStorage.setItem('oku-mode',state.mode);}catch{}renderPage();}
  });
  let timer;$('#search').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.query=e.target.value;renderNav();if(innerWidth<760){$('#sidebar').classList.add('open');$('#scrim').hidden=false;}},130);});
  $('#prev').onclick=()=>turn(-1);$('#next').onclick=()=>turn(1);
  $('#page-jump').addEventListener('change',e=>{const val=e.target.value.trim(),id=val==='封面'?'cover':val==='封底'?'back':'p'+Number(val);if(pageMap.has(id))go(id);else e.target.value=pageMap.get(state.page).label;});
  $('#page-jump').addEventListener('keydown',e=>{if(e.key==='Enter')e.target.blur();});
  $('#zoom-in').onclick=()=>{state.zoom=Math.min(1.8,state.zoom+.2);resizePaper();};$('#zoom-out').onclick=()=>{state.zoom=Math.max(.6,state.zoom-.2);resizePaper();};$('#zoom-reset').onclick=()=>{state.zoom=1;resizePaper();};
  $('#menu-button').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#scrim').hidden=!open;$('#menu-button').setAttribute('aria-expanded',open);};$('#scrim').onclick=closeMenu;
  $('#about-button').onclick=()=>$('#about').showModal();$('.dialog-close').onclick=()=>$('#about').close();$('#about').addEventListener('click',e=>{if(e.target===$('#about'))$('#about').close();});
  addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||$('#about').open)return;if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1);if(e.key==='/'){e.preventDefault();$('#search').focus();}});
}
async function init(){
  try{
    const response=await fetch('data/book.json?v=proofread2-20261111');if(!response.ok)throw new Error('数据加载失败');book=await response.json();
    pageMap=new Map(book.pages.map(p=>[p.id,p]));questionMap=new Map(book.questions.map(q=>[q.id,q]));articleMap=new Map(book.articles.map(a=>[a.id,a]));
    $('#book-stats').textContent=`${book.articles.length} 篇阅读 · ${book.questions.length} 道练习 · 96 页`;
    await document.fonts.load('400 20px Book');await document.fonts.load('650 20px Book');
    listen();readHash();
  }catch(error){$('#loading').innerHTML=`<p>暂时无法打开书页，请刷新重试。</p><small>${esc(error.message)}</small>`;console.error(error);}
}
init();
