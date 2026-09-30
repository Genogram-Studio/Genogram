import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MM = 96 / 25.4;
const text = (li, ko, en, zh) => li === 1 ? ko : li === 2 ? zh : en;
const styles = `
.gs-report-sheet{box-sizing:border-box;background:white;color:#14243a;padding:12mm;font-family:'Noto Sans KR',system-ui,sans-serif;position:relative;overflow:hidden}
.gs-report-heading{height:12mm;border-bottom:1px solid #ccd3dc;font-size:14pt;font-weight:700;margin:0 0 3mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-report-content{box-sizing:border-box;line-height:1.5;overflow-wrap:anywhere}
.gs-report-content h3{font-size:1em;margin:0 0 2mm;color:#32577b;line-height:1.4}
.gs-report-block{padding-bottom:4mm;white-space:pre-wrap;display:flow-root}
.gs-report-block p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.gs-report-footer{position:absolute;bottom:6mm;left:12mm;right:12mm;font-size:9pt;color:#52657c;display:flex;justify-content:space-between;gap:5mm}
.gs-report-review{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.gs-report-review .gs-report-block{padding-bottom:2.5mm}
.gs-report-print{display:none}
.gs-report-preview{margin:18px 0}
.gs-report-preview-frame{position:relative;margin:0 auto 20px;box-shadow:0 2px 8px #14243a26;background:white}
@media print{
 html,body{margin:0!important;padding:0!important;height:auto!important;overflow:visible!important;background:white!important}
 body:has(>.gs-report-print)>:not(.gs-report-print){display:none!important}
 .gs-report-print{display:block!important}
 .gs-report-sheet{margin:0!important;border:0!important;box-shadow:none!important;break-after:page;page-break-after:always;print-color-adjust:exact;-webkit-print-color-adjust:exact}
 .gs-report-sheet:last-child{break-after:auto;page-break-after:auto}
}
`;

function StoryBlock({block}) {
  return <section className="gs-report-block"><h3>{block.head}</h3><p>{block.body}</p></section>;
}
function Sheet({page, index, total, paper, fontPt, title}) {
  return <article className="gs-report-sheet" style={{width:`${paper.w}mm`,height:`${paper.h}mm`,fontSize:`${fontPt}pt`}}>
    <h2 className="gs-report-heading">{page.title}</h2>
    <div className={`gs-report-content${page.kind === 'review' ? ' gs-report-review' : ''}`} style={{height:`${paper.h-47}mm`,fontSize:`${fontPt}pt`}}>
      {page.svg ? <div style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{__html:page.svg}}/> :
        page.columns ? page.columns.map((blocks,i)=><div key={i}>{blocks.map((block,j)=><StoryBlock key={j} block={block}/>)}</div>) :
        page.blocks.map((block,i)=><StoryBlock key={i} block={block}/>)}
    </div>
    <footer className="gs-report-footer"><span>{title}</span><span>{index+1} / {total}</span></footer>
  </article>;
}

// Measure the actual SVG text and geometry, including notes/ink beyond the estimated bounds.
function diagramPages(svg, paper, fontPt, heading) {
  const root=svg.querySelector('#exportRoot');
  const backgrounds=[...root.querySelectorAll("[data-print-background]")];
  backgrounds.forEach(el=>el.style.display="none");
  const b=root.getBBox();
  backgrounds.forEach(el=>el.style.removeProperty("display"));
  const box={x:b.x-12,y:b.y-12,w:Math.max(1,b.width+24),h:Math.max(1,b.height+24)};
  let smallest=Infinity;
  svg.querySelectorAll('text').forEach(el=>{
    if(!el.textContent.trim())return;
    const matrix=el.getCTM(), base=svg.getCTM();
    const factor=matrix && base ? Math.hypot(matrix.a,matrix.b)/Math.hypot(base.a,base.b) : 1;
    const size=parseFloat(getComputedStyle(el).fontSize)*factor;
    if(size>0)smallest=Math.min(smallest,size);
  });
  if(!Number.isFinite(smallest))smallest=10;
  const width=paper.w-24, height=paper.h-47;
  // Never shrink below the selected physical font size. Extra sheets overlap at the seams.
  const scale=Math.max(fontPt*25.4/72/smallest, Math.min(width/box.w,height/box.h));
  const tileW=width/scale, tileH=height/scale;
  const overlap=Math.min(20/scale,tileW/4,tileH/4);
  const nx=Math.max(1,Math.ceil((box.w-overlap)/(tileW-overlap)));
  const ny=Math.max(1,Math.ceil((box.h-overlap)/(tileH-overlap)));
  if(nx*ny>200)throw new Error('가계도가 너무 큽니다. 더 큰 용지를 선택하거나 가계도의 배치를 좁혀 주세요.');
  const pages=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const clone=svg.cloneNode(true);
    clone.removeAttribute('style');clone.removeAttribute('id');clone.removeAttribute('aria-hidden');clone.style.display='block';
    clone.querySelectorAll('[data-print-background]').forEach(el=>{el.setAttribute('x',box.x);el.setAttribute('width',box.w);});
    clone.setAttribute('width','100%');clone.setAttribute('height','100%');
    const sx=nx===1 ? box.x-(tileW-box.w)/2 : box.x+x*(box.w-tileW)/(nx-1);
    const sy=ny===1 ? box.y-(tileH-box.h)/2 : box.y+y*(box.h-tileH)/(ny-1);
    clone.setAttribute('viewBox',`${sx} ${sy} ${tileW} ${tileH}`);
    pages.push({kind:'diagram',title:heading+(nx*ny>1?` (${y+1}, ${x+1})`:''),svg:new XMLSerializer().serializeToString(clone)});
  }
  return {pages,box,smallestPt:smallest*scale*72/25.4};
}

// Split long paragraphs at measured page boundaries, retaining every character.
function paginate(blocks, measure, height, width) {
  measure.style.width=`${width}mm`;
  const pages=[];let current=[], used=0;
  const size=block=>{
    measure.replaceChildren();
    const section=document.createElement('section');section.className='gs-report-block';
    const h=document.createElement('h3');h.textContent=block.head;
    const p=document.createElement('p');p.textContent=block.body;
    section.append(h,p);measure.append(section);
    return section.getBoundingClientRect().height;
  };
  for(const block of blocks){
    let body=Array.from(block.body), head=block.head;
    do{
      const full={head,body:body.join('')};
      let n=body.length, h=size(full);
      if(h>height-used){
        if(current.length){pages.push(current);current=[];used=0;continue;}
        let lo=0,hi=body.length;
        while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(size({head,body:body.slice(0,mid).join('')})<=height)lo=mid;else hi=mid-1;}
        n=Math.max(1,lo);h=size({head,body:body.slice(0,n).join('')});
      }
      current.push({head,body:body.slice(0,n).join('')});used+=h;
      body=body.slice(n);
      if(body.length){pages.push(current);current=[];used=0;}
    }while(body.length);
  }
  if(current.length)pages.push(current);
  return pages;
}

export default function PrintReport({svgRef, paper, fontPt, doc, li, storyBlocks, ctxBlocks, reviewBlocks, mode, onReady}) {
  const [pages,setPages]=useState([]),[error,setError]=useState(''),[zoom,setZoom]=useState(.6);
  const measureRef=useRef(null),previewRef=useRef(null);
  const title=doc.title || text(li,'제목 없는 가계도','Untitled genogram','未命名家系圖');
  useEffect(()=>{
    const node=previewRef.current;if(!node)return;
    const ro=new ResizeObserver(()=>setZoom(Math.min(1,node.clientWidth/(paper.w*MM))));ro.observe(node);return()=>ro.disconnect();
  },[paper.w]);
  useEffect(()=>{
    let cancelled=false;
    onReady(null);setError('');
    (async()=>{
      if(document.fonts?.ready)await document.fonts.ready;
      if(cancelled || !svgRef.current || !measureRef.current)return;
      try{
        const result=diagramPages(svgRef.current,paper,fontPt,text(li,'가계도','Genogram','家系圖'));
        const height=(paper.h-47)*MM-2;
        const storyTitle=text(li,'가족 전체 이야기','Family story','全家敘事');
        const blocks=[...storyBlocks,...ctxBlocks];
        if(!blocks.length)blocks.push({head:storyTitle,body:text(li,'입력된 가족 이야기가 없습니다.','No family story has been entered.','尚未輸入家庭敘事。')});
        const narrative=paginate(blocks,measureRef.current,height,paper.w-24).map(blocks=>({kind:'story',title:storyTitle,blocks}));
        const review=paginate(reviewBlocks,measureRef.current,height,(paper.w-30)/2);
        const last=[];for(let i=0;i<review.length;i+=2)last.push({kind:'review',title:text(li,'작성 점검 · 함께 읽을 질문','Checklist · Questions for review','繪製檢核 · 共同閱讀的提問'),columns:review.slice(i,i+2)});
        setPages([...result.pages,...narrative,...last]);
        onReady({box:result.box,diagramPages:result.pages.length,totalPages:result.pages.length+narrative.length+last.length,smallestPt:result.smallestPt});
      }catch(e){setError(e.message);setPages([]);}
    })();return()=>{cancelled=true;};
  },[doc,li,paper,fontPt,mode]);
  const content=pages.map((page,i)=><Sheet key={i} page={page} index={i} total={pages.length} paper={paper} fontPt={fontPt} title={title}/>);
  return <>
    <style>{styles}</style>
    <div ref={measureRef} className="gs-report-content" aria-hidden="true" style={{position:'fixed',left:-100000,top:0,visibility:'hidden',fontFamily:"'Noto Sans KR',system-ui,sans-serif",fontSize:`${fontPt}pt`}}/>
    {error && <p role="alert">{error}</p>}
    <div className="gs-report-preview" ref={previewRef}>
      {pages.map((page,i)=><div key={i} className="gs-report-preview-frame" style={{width:paper.w*MM*zoom,height:paper.h*MM*zoom}}>
        <div style={{transform:`scale(${zoom})`,transformOrigin:'top left'}}><Sheet page={page} index={i} total={pages.length} paper={paper} fontPt={fontPt} title={title}/></div>
      </div>)}
    </div>
    {createPortal(<div className="gs-report-print"><style>{`@media print{@page{size:${paper.w}mm ${paper.h}mm;margin:0}}`}</style>{content}</div>,document.body)}
  </>;
}
