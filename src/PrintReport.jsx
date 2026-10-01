import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MM = 96 / 25.4;
const text = (li, ko, en, zh) => li === 1 ? ko : li === 2 ? zh : en;
const styles = `
.gs-report-sheet{box-sizing:border-box;background:white;color:#14243a;padding:12mm;font-family:'Noto Sans KR',system-ui,sans-serif;position:relative;overflow:hidden}
.gs-report-heading{height:8mm;border-bottom:1px solid #ccd3dc;font-size:14pt;font-weight:700;margin:0 0 1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs-report-content{box-sizing:border-box;line-height:1.5;overflow-wrap:anywhere}
.gs-report-content h3{font-size:1em;margin:0 0 2mm;color:#32577b;line-height:1.4}
.gs-report-block{padding-bottom:4mm;white-space:pre-wrap;display:flow-root}
.gs-report-block p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.gs-report-footer{position:absolute;bottom:6mm;left:12mm;right:12mm;font-size:9pt;color:#52657c;display:flex;justify-content:space-between;gap:5mm}
.gs-report-review{display:grid;grid-template-columns:32fr 68fr;gap:6mm;align-items:start}
.gs-report-review-card{border:1px solid #ccd5df;border-radius:4mm;padding:4mm;min-height:35mm}
.gs-report-story .gs-report-block{border:1px solid #ccd5df;border-radius:4mm;padding:4mm;margin-bottom:4mm}
.gs-report-column-title{margin:0 0 3mm!important}
.gs-report-review-card .gs-report-block{margin:0}
.gs-report-review .gs-report-block,.gs-review-measure .gs-report-block{padding-bottom:2.5mm}
.gs-question-columns{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
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
  return <section className="gs-report-block" style={block.fontPt?{fontSize:`${block.fontPt}pt`}:undefined}>{block.head&&<h3>{block.head}</h3>}<p>{block.body}</p></section>;
}
function Sheet({page, index, total, paper, fontPt, title}) {
  return <article className="gs-report-sheet" style={{width:`${paper.w}mm`,height:`${paper.h}mm`,fontSize:`${fontPt}pt`}}>
    <h2 className="gs-report-heading">{page.title}</h2>
    <div className={`gs-report-content${page.kind === 'review' ? ' gs-report-review' : page.kind === 'story' ? ' gs-report-story' : ''}`} style={{height:`${paper.h-41}mm`,fontSize:`${fontPt}pt`,...(page.reviewLandscape?{gridTemplateColumns:"25fr 75fr"}:{})}}>
      {page.svg ? <div style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{__html:page.svg}}/> :
        page.columns ? page.columns.map((blocks,i)=><div key={i}>{page.columnTitles[i]&&<h3 className="gs-report-column-title">{page.columnTitles[i]}</h3>}{blocks.length>0&&<div className="gs-report-review-card">{i===1&&page.questionColumns?<div className="gs-question-columns">{page.questionColumns.map((col,k)=><div key={k}>{col.map((block,j)=><StoryBlock key={j} block={block}/>)}</div>)}</div>:blocks.map((block,j)=><StoryBlock key={j} block={block}/>)}</div>}</div>) :
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
  const width=paper.w-24, height=paper.h-41;
  // The complete genogram, relationships and annotations always share one sheet.
  const scale=Math.min(width/box.w,height/box.h);
  const viewW=width/scale,viewH=height/scale;
  const clone=svg.cloneNode(true);
  clone.removeAttribute('style');clone.removeAttribute('id');clone.removeAttribute('aria-hidden');clone.style.display='block';
  clone.querySelectorAll('[data-print-background]').forEach(el=>{el.setAttribute('x',box.x);el.setAttribute('width',box.w);});
  clone.setAttribute('width','100%');clone.setAttribute('height','100%');
  clone.setAttribute('viewBox',`${box.x-(viewW-box.w)/2} ${box.y-6/scale} ${viewW} ${viewH}`);
  const pages=[{kind:'diagram',title:heading,svg:new XMLSerializer().serializeToString(clone)}];
  return {pages,box,smallestPt:smallest*scale*72/25.4};
}

// Split long paragraphs at measured page boundaries, retaining every character.
function paginate(blocks, measure, height, width) {
  measure.style.width=`${width}mm`;
  const pages=[];let current=[], used=0;
  const size=block=>{
    measure.replaceChildren();
    const section=document.createElement('section');section.className='gs-report-block';
    if(block.fontPt)section.style.fontSize=`${block.fontPt}pt`;
    const h=document.createElement('h3');h.textContent=block.head;
    const p=document.createElement('p');p.textContent=block.body;
    if(block.head)section.append(h);section.append(p);measure.append(section);
    return section.getBoundingClientRect().height+(parseFloat(getComputedStyle(section).marginBottom)||0);
  };
  for(const block of blocks){
    let body=Array.from(block.body), head=block.head;
    do{
      const full={...block,head,body:body.join('')};
      let n=body.length, h=size(full);
      if(h>height-used){
        if(current.length){pages.push(current);current=[];used=0;continue;}
        let lo=0,hi=body.length;
        while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(size({...block,head,body:body.slice(0,mid).join('')})<=height)lo=mid;else hi=mid-1;}
        n=Math.max(1,lo);h=size({...block,head,body:body.slice(0,n).join('')});
      }
      current.push({...block,head,body:body.slice(0,n).join('')});used+=h;
      body=body.slice(n);
      if(body.length){pages.push(current);current=[];used=0;}
    }while(body.length);
  }
  if(current.length)pages.push(current);
  return pages;
}

export default function PrintReport({svgRef, paper, fontPt, doc, li, storyBlocks, ctxBlocks, reviewBlocks, includeReview=true, mode, onReady}) {
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
        const participant=doc.people?.find(p=>p.proband && p.name?.trim())?.name.trim() || doc.people?.find(p=>p.name?.trim())?.name.trim();
        const heading=participant ? `${participant} ${text(li,'가계도','Genogram','家系圖')}` : text(li,'가계도','Genogram','家系圖');
        const result=diagramPages(svgRef.current,paper,fontPt,heading);
        const height=(paper.h-41)*MM-2;
        const storyTitle=text(li,'가족 전체 이야기','Family story','全家敘事');
        const blocks=[...storyBlocks,...ctxBlocks];
        if(!blocks.length)blocks.push({head:storyTitle,body:text(li,'입력된 가족 이야기가 없습니다.','No family story has been entered.','尚未輸入家庭敘事。')});
        measureRef.current.className='gs-report-content gs-report-story';
        const narrative=paginate(blocks,measureRef.current,height,paper.w-24).map(blocks=>({kind:'story',title:storyTitle,blocks}));
        measureRef.current.className='gs-report-content gs-review-measure';
        const landscape=paper.w>paper.h, columnCount=landscape?2:1;
        const questionWidth=landscape?((paper.w-30)*.75-14)/2:(paper.w-30)*.68-8;
        const review=includeReview ? paginate(reviewBlocks.slice(1),measureRef.current,height-20*MM,questionWidth) : [];
        const last=[];
        for(let i=0;i<review.length;i+=columnCount){
          const columns=review.slice(i,i+columnCount);
          last.push({kind:'review',title:text(li,'작성 점검 · 질문','Checklist · Questions','檢核 · 提問'),reviewLandscape:landscape,
            columns:[i===0?[{...reviewBlocks[0],head:''}]:[],columns.flat()],questionColumns:landscape?columns:null,
            columnTitles:[i===0?text(li,'작성 점검','Checklist','繪製檢核'):'',i===0?text(li,'함께 읽을 질문','Questions for review','共同閱讀的提問'):text(li,'질문 (계속)','Questions (continued)','提問（續）')]});
        }
        setPages([...result.pages,...narrative,...last]);
        onReady({box:result.box,diagramPages:result.pages.length,totalPages:result.pages.length+narrative.length+last.length,smallestPt:result.smallestPt,includeReview});
      }catch(e){setError(e.message);setPages([]);}
    })();return()=>{cancelled=true;};
  },[doc,li,paper,fontPt,mode,includeReview]);
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
