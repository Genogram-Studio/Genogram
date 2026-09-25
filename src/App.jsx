import React, { useState, useRef, useMemo, useEffect, useCallback, createContext, useContext } from "react";
import { HAS_AI, EDITION, BUILD, FULL_URL } from "./edition.js";
import { LANGS, BASE_LANG_COUNT, packText, langIndexOf } from "./locales.js";   // 화면 언어 목록과 언어팩(locales/xx.json)
import { GLOSSARY } from "../glossary/glossary.js";       // 기본 용어집(번역 띠 ⚙에서 볼 수 있다). 서버는 같은 원본의 사본(_glossary.js)을 쓴다.

/* ══════════════════════════════════════════════════════════════════
   GENOGRAM STUDIO — a clinical genogram workbench
   v2 layered chronology: family / parents / children / other + transition clusters
   Symbol set: McGoldrick, Gerson & Petry (Genograms, 4th ed.) / Bowen
   Time-Line view: Friedman, Rohrbaugh & Krakauer (1988)
   Context frame: Carter & McGoldrick (Expanded Family Life Cycle)
   ══════════════════════════════════════════════════════════════════ */

/* ── design tokens ─────────────────────────────────────────────── */
/* 화면 색은 뜻을 지지 않는다.

   가계도에서 초록은 '연결', 붉은색은 '갈등', 보라는 '집중·통제'라는
   뜻을 이미 지고 있다. 그런데 화면 크롬까지 초록이면 그 신호가 묻힌다.
   그래서 크롬을 남색으로 옮기고 초록은 관계선에게 돌려주었다. 첫 화면의
   남색·금색과도 한 팔레트가 된다. 금색은 강조 하나로만 남긴다. */
const T = {
  ink: "#14243A", ink2: "#2D435D", mute: "#3D5064", faint: "#A6B4C2",
  paper: "#EDF1F5", panel: "#FFFFFF", canvas: "#FBFCFD",
  grid: "#E2E9EF", band: "#F4F7FA", rule: "#DCE4EB",
  pine: "#1B3350", pine2: "#2C4A6E", sage: "#5C7A96", sageSoft: "#E6EEF5",
  gold: "#A67C34", goldSoft: "#F6EFE0",
  red: "#A8412C", amber: "#B5842F", line: "#1B3350", violet: "#6A5A93",
  arrowRed: "#D1493A", arrowRedDk: "#A02318",
};

const FONTS = `*,*::before,*::after{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit}button{touch-action:manipulation}button:not(:disabled):hover{filter:brightness(.97)}.gs-gbtn:not(:disabled):hover{background:#EEF3FA!important;color:#17293F!important;filter:none}.gs-group:has(.gs-gbtn:not(:disabled):hover){border-color:#B9CADC;box-shadow:0 2px 10px rgba(22,32,42,.13)}.gs-flagrow{transition:background .1s ease}.gs-flagrow:hover{background:#F4F7FA}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid #4d79d0;outline-offset:3px}button:disabled{cursor:not-allowed}input,textarea{max-width:100%}.flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.flex-1{flex:1}.grid{display:grid}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.gap-2{gap:8px}.gs-app{display:flex;flex-direction:column;min-height:100dvh;height:100dvh;overflow:hidden}.gs-app-header{background:#132b49!important;min-height:50px;height:auto!important;padding:8px 18px!important;flex-wrap:wrap;gap:8px!important}.gs-app-header button,.gs-app-header select{border-radius:8px!important;font-size:13px!important;font-weight:600;min-height:31px;letter-spacing:-.005em}.gs-app-header input{border-radius:8px!important;min-height:31px;font-size:13px!important}.gs-app-header input::placeholder{color:#d5deeb}.gs-editor-toolbar{background:#fff!important;box-shadow:none!important;padding:7px 14px!important;flex-wrap:wrap;gap:6px!important}.gs-editor-toolbar button{font-size:13px!important;font-weight:600;border-radius:8px!important;min-height:32px;letter-spacing:-.005em}.gs-editor-toolbar>div{box-shadow:none!important;border-radius:8px!important}.gs-workspace{background:#e8edf4;gap:0}.gs-canvas{min-height:300px}.gs-inspector{flex-shrink:0;width:350px!important;background:#fff!important}.gs-inspector input,.gs-inspector textarea,.gs-inspector select{padding:9px 11px!important;border-radius:7px!important;font-size:14px!important;min-height:38px}.gs-inspector button{font-size:14px!important;min-height:34px}.gs-inspector [style*="font-size: 11"],.gs-inspector [style*="font-size: 12"]{font-size:13px!important}.gs-note-panel{display:flex;flex-direction:column;gap:16px}.gs-help{font-size:13px!important;line-height:1.7;color:#52657c;margin:0 0 4px}.gs-note-connection{background:#f4f7fb;border:1px solid #e0e7f0;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px}.gs-zoom{position:absolute;bottom:20px;right:20px;z-index:6;box-shadow:0 4px 16px #142c4914;border-radius:10px}.gs-zoom button{min-width:36px;min-height:38px}.gs-canvas-status{position:absolute;left:18px;bottom:20px;padding:8px 12px;background:#ffffffed;border:1px solid #dce4ef;border-radius:7px;font-size:13px;color:#52657c;pointer-events:none}.gs-connect-hint{position:absolute;left:50%;top:20px;transform:translateX(-50%);z-index:9;background:#183d68;color:white;border-radius:10px;padding:12px 18px;max-width:calc(100% - 28px);font-size:14px;display:flex;align-items:center;gap:18px;box-shadow:0 8px 24px #142c4922}.gs-connect-hint button{color:#fff;background:transparent;border:1px solid #ffffff66;border-radius:5px;padding:5px 10px}.gs-home{flex:1;overflow:auto;background:#f1f4f9;color:#172d49}.gs-home-header{background:#fff;border-bottom:1px solid #dce4ef;padding:20px max(24px,calc((100% - 1180px)/2));display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.gs-brand{display:flex;align-items:center;gap:12px;font-size:19px;letter-spacing:-.4px}.gs-languages{display:flex;gap:4px;flex-wrap:wrap}.gs-languages button{background:transparent;border:0;border-radius:6px;padding:9px 12px;color:#52657c;font-size:14px}.gs-languages button[aria-pressed=true]{background:#e9eff9;color:#163e78;font-weight:650}.gs-home-main{max-width:1180px;margin:auto;padding:48px 24px 24px}.gs-start-heading{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:32px}.gs-eyebrow{font-size:12px;letter-spacing:1.5px;font-weight:650;color:#527099;margin:0 0 10px}.gs-start-heading h1{font-size:34px;letter-spacing:-1px;margin:0 0 12px;font-weight:700}.gs-start-heading p:not(.gs-eyebrow){font-size:16px;color:#53677f;margin:0;line-height:1.7}.gs-home-actions{display:flex;gap:10px;flex-wrap:wrap;flex-shrink:0}.gs-primary,.gs-secondary{cursor:pointer;border-radius:7px;font-weight:600;font-size:15px;padding:13px 18px;min-height:46px;border:1px solid #173f79}.gs-primary{background:#173f79;color:white}.gs-secondary{background:white;color:#173f79}.gs-text-button{border:0;background:transparent;color:#52657c;cursor:pointer}.gs-home-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px}.gs-recent,.gs-workflow{background:white;border:1px solid #dce4ef;border-radius:12px;padding:24px}.gs-section-heading{display:flex;align-items:center;justify-content:space-between}.gs-home h2{font-family:Georgia,'Noto Serif KR','Nanum Myeongjo','Noto Serif TC','PMingLiU',serif;font-size:18px;margin:0 0 16px}.gs-section-heading>span{font-size:13px;color:#617690;padding:4px 9px;background:#eef3f9;border-radius:5px}.gs-empty{min-height:270px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.gs-empty p{font-size:16px;color:#304b6d;margin:22px 0 8px}.gs-empty>span{color:#657991;font-size:14px;line-height:1.7}.gs-case{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:none;border:0;border-top:1px solid #e5ebf2;padding:18px 0;cursor:pointer;color:#1a3559}.gs-case-symbol{width:36px;height:42px;background:#edf2fa;display:grid;place-items:center;border-radius:5px}.gs-case>span:nth-child(2){flex:1}.gs-case strong{font-size:15px;font-weight:600}.gs-case small{display:block;margin-top:6px;font-size:13px;color:#6c8098}.gs-workflow-row{display:flex;gap:16px;padding:16px 0;border-top:1px solid #edf1f7}.gs-workflow-row>span{font-size:13px;font-weight:600;color:#7285a0;padding-top:3px}.gs-workflow h3{font-size:15px;margin:0 0 7px;font-weight:600}.gs-workflow p{font-size:14px;margin:0;color:#61758e;line-height:1.6}.gs-home-shortcuts{display:flex;gap:12px;margin-top:12px}.gs-home-shortcuts button{background:white;border:1px solid #dce4ef;border-radius:8px;flex:1;padding:16px;display:flex;justify-content:space-between;text-align:left;font-size:14px;color:#294c7b;cursor:pointer}.gs-resume{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px;background:#e7eef9;border:1px solid #cbd9ed;border-left:4px solid #315d99;border-radius:8px;padding:22px 24px}.gs-resume h2{margin:8px 0}.gs-resume>div>span:not(.gs-eyebrow){font-size:13px;color:#526c8c}.gs-home-footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid #dce4ef;margin-top:36px;padding-top:20px;font-size:12px;color:#657b96}.gs-empty-canvas{position:absolute;inset:100px 20px 100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none}.gs-empty-canvas h2{font-size:22px;color:#264564;margin:12px 0}.gs-empty-canvas p{font-size:15px;color:#61758e;line-height:1.6;max-width:360px;text-align:center;margin:0}.gs-empty-canvas button{pointer-events:auto;margin-top:2px}.gs-context-add{margin:0 0 18px}.gs-context-add button{width:100%;text-align:left;border:1px solid #cbd8e9;background:#f1f5fc;color:#234d82;border-radius:8px;padding:12px 14px;font-size:14px;font-weight:600;cursor:pointer}@media(max-width:919px){.gs-tool-collapse-btn{display:flex!important}.gs-inspector{width:100%!important;max-height:40dvh}.gs-canvas{min-height:44dvh}.gs-editor-toolbar{flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch;min-height:40px!important;padding:5px 8px!important;gap:5px!important}.gs-editor-toolbar button{padding:6px 8px!important;font-size:12px!important;min-height:30px!important}.gs-editor-toolbar svg{width:12px!important;height:12px!important}.gs-start-heading{align-items:flex-start;flex-direction:column}.gs-home-grid{grid-template-columns:1fr}.gs-home-main{padding-top:28px}.gs-canvas-status{display:none}.gs-app-header{flex-wrap:nowrap!important;overflow-x:auto!important;min-height:46px!important;padding:6px 10px!important;gap:6px!important}.gs-app-header input{width:120px!important;padding:5px 9px!important;font-size:12.5px!important}.gs-app-header select{padding:5px 8px!important;font-size:11.5px!important}.gs-app-header>div:first-of-type{display:none}.gs-app-header>button:first-child span{display:none}.gs-app-header .gs-topchip,.gs-app-header button{padding:5px 9px!important;font-size:11.5px!important;flex-shrink:0}}@media(max-width:520px){.gs-home-header{padding:16px}.gs-home-main{padding:26px 16px}.gs-start-heading h1{font-size:28px}.gs-home-actions{width:100%}.gs-home-actions button{flex:1}.gs-recent,.gs-workflow{padding:20px}.gs-resume{align-items:flex-start;flex-direction:column}.gs-zoom{bottom:12px;right:12px}.gs-home-grid{gap:16px}.gs-brand{font-size:17px}}@media(max-width:919px){.gs-inspector{font-size:12px!important;line-height:1.15!important}.gs-inspector .gs-panel-content{padding:8px 10px!important}.gs-inspector .gs-panel-content>div{font-size:12px!important}.gs-inspector p,.gs-inspector span,.gs-inspector div,.gs-inspector label{line-height:1.15!important}.gs-inspector input:not([type=checkbox]):not([type=radio]):not([type=range]),.gs-inspector textarea,.gs-inspector select{font-size:12px!important;min-height:28px!important;padding:5px 8px!important;border-radius:6px!important}.gs-inspector button{font-size:11.5px!important;min-height:27px!important;padding:5px 8px!important}.gs-inspector .gs-check{min-height:19px!important;padding:0!important;line-height:1.1!important;font-size:12px!important}.gs-inspector .gs-section-title h3{font-size:12.5px!important}.gs-inspector .gs-section-title{margin-bottom:2px!important}.gs-inspector .gs-help{font-size:11px!important;line-height:1.2!important;margin:0 0 2px!important}.gs-inspector [style*="font-size: 11"],.gs-inspector [style*="font-size: 12"],.gs-inspector [style*="font-size: 13"]{font-size:11px!important}.gs-inspector .flex-col:not(label),.gs-inspector .gs-note-panel{gap:3px!important}.gs-inspector .gs-note-connection{padding:7px!important;gap:3px!important}.gs-inspector .gs-person-flags.flex-col{gap:0!important;padding:5px 8px!important}.gs-inspector .gs-context-add button{padding:7px 9px!important;font-size:12px!important}.gs-tool-menu{gap:4px!important;padding:6px 8px!important;line-height:1.15!important}.gs-tool-menu button{font-size:11.5px!important;min-height:27px!important;padding:5px 7px!important}.gs-editor-toolbar .gs-bond-kind,.gs-editor-toolbar .gs-bond-option,.gs-tool-menu .gs-bond-kind,.gs-tool-menu .gs-bond-option{font-size:11px!important;min-height:26px!important;padding:4px 6px!important}.gs-connect-hint{font-size:12px!important;padding:8px 12px!important;gap:10px!important}.gs-zoom button{min-width:32px!important;min-height:32px!important;font-size:12px!important}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* Compact editor controls. Checkbox dimensions must not inherit text-input height. */
.gs-editor-toolbar button{font-weight:600!important}
.gs-inspector{color:#263c56}
.gs-inspector input:not([type=checkbox]):not([type=radio]):not([type=range]),.gs-inspector textarea,.gs-inspector select{padding:6px 9px!important;min-height:32px!important}
.gs-inspector input[type=checkbox],.gs-inspector input[type=radio]{width:15px!important;height:15px!important;min-height:0!important;padding:0!important;margin:0;flex-shrink:0}
.gs-inspector input[type=range]{min-height:24px!important;padding:0!important}
.gs-inspector .gs-check{min-height:26px;padding:3px 0!important;line-height:1.4;font-size:14px!important}
.gs-inspector .flex-col:not(label),.gs-inspector .gs-note-panel{gap:7px!important}
.gs-inspector h3{margin:0;line-height:1.4}
.gs-inspector .gs-section-title{margin-bottom:4px!important}
.gs-inspector .gs-panel-content{padding:10px 12px!important}
.gs-inspector .gs-field-label,.gs-inspector [style*="color: rgb(122, 140, 160)"],.gs-inspector [style*="color:#7A8CA0"]{color:#43566c!important}
.gs-inspector .gs-help{color:#43566c;line-height:1.5!important}
.gs-inspector .gs-note-connection{padding:10px;gap:8px}
.gs-inspector .gs-context-add{margin-bottom:8px}
.gs-inspector .gs-context-add button{padding:8px 10px}
.gs-inspector .gs-person-flags.flex-col{gap:2px!important;padding:8px 10px!important}
.gs-tool-menu{color:#263c56}
.gs-tool-menu button{font-size:13px!important;font-weight:600;min-height:32px;letter-spacing:-.005em}
.gs-ink-palette button{min-height:32px;min-width:28px}
.gs-ink-sample{background:#fff;border:1px solid #dce4eb;border-radius:6px;overflow:hidden}
.gs-inspector{width:340px!important;font-size:12.5px!important}
.gs-inspector input:not([type=checkbox]):not([type=radio]):not([type=range]),.gs-inspector textarea,.gs-inspector select{font-size:12.5px!important;min-height:31px!important;padding:6px 9px!important;border-radius:6px!important}
.gs-inspector button{font-size:12px!important;min-height:30px!important}
.gs-inspector [style*="font-size: 11"],.gs-inspector [style*="font-size: 12"]{font-size:12px!important}
.gs-inspector .gs-check{min-height:24px;padding:2px 0!important;line-height:1.35;font-size:12.5px!important}
.gs-inspector .gs-section-title h3{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:13.5px!important;font-weight:650!important;letter-spacing:-.015em;color:#1f344d}
.gs-inspector .gs-panel-content>div{font-size:12.5px}
.gs-inspector .gs-panel-content p,.gs-inspector .gs-panel-content span{letter-spacing:-.005em}
.gs-inspector .gs-note-panel{gap:8px!important}
.gs-cover{background:#EEF3F9;color:#14243A;position:relative}.gs-cover>*{position:relative;z-index:1}.gs-cover .gs-home-main{max-width:1160px;padding:20px 28px 28px}
.gs-cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:start}
.gs-cover-left{padding-top:6px}
.gs-cover .gs-eyebrow{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:3px;color:#A67C34;margin:0 0 14px}
.gs-cover .gs-eyebrow i{display:inline-block;width:70px;height:1px;background:#cbd8e9;position:relative}
.gs-cover .gs-eyebrow i::after{content:'';position:absolute;right:-4px;top:-2.5px;width:5px;height:5px;border-radius:50%;background:#A67C34}
.gs-cover .gs-start-heading h1,.gs-cover-left h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(38px,4.4vw,58px);font-weight:400;letter-spacing:-2px;line-height:1.05;margin:0 0 28px;color:#14243A}
.gs-cover-left h1 span{display:block;font-family:'Georgia',sans-serif;font-weight:700;letter-spacing:-1px;margin-top:2px}
.gs-cover-art{width:190px}
.gs-cover-right{display:flex;flex-direction:column;gap:16px}
.gs-cover-cta{display:flex;align-items:center;justify-content:center;gap:10px;background:#132b49;color:#fff;border:0;border-radius:12px;padding:20px 24px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(19,43,73,.22)}
.gs-cover-cta span{font-size:18px}
.gs-cover-cta:hover{background:#173f79}
.gs-cover-onboard{background:#fff;border-radius:14px;padding:8px 24px;box-shadow:0 2px 10px rgba(19,43,73,.06)}
.gs-cover-ob-row{padding:16px 0;border-top:1px solid #EDEAE2;text-align:center}
.gs-cover-ob-row:first-child{border-top:0}
.gs-cover-ob-num{display:block;font-family:'Courier New',monospace;font-size:11px;color:#A67C34;letter-spacing:1px;margin-bottom:4px}
.gs-cover-ob-row h3{font-family:Georgia,'Noto Serif KR','Nanum Myeongjo',serif;font-size:15px;font-weight:600;margin:0 0 6px;color:#14243A}
.gs-cover-ob-row p{font-size:12.5px;color:#52657c;line-height:1.5;margin:0 auto;max-width:440px}
.gs-cover-tiles{display:flex;gap:12px}
.gs-cover-tiles button{flex:1;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #cbd8e9;border-radius:12px;padding:14px 16px;font-size:13.5px;font-weight:600;color:#14243A;cursor:pointer}
.gs-cover-tiles button:hover{background:#EEF3F9}
.gs-cover-tile-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#EEF3F9;border-radius:8px;font-size:14px;color:#173f79}
.gs-cover .gs-resume{background:#fff;border:1px solid #E4C87A;border-left:4px solid #A67C34;border-radius:10px;padding:16px 20px;margin:0}
.gs-cover .gs-resume h2{font-size:14px;margin:6px 0}
.gs-cover-recent-head{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#8899ab;letter-spacing:.02em;margin-top:2px}
.gs-cover-recent-row{display:flex;gap:10px;flex-wrap:wrap}
.gs-cover-add-tile{border:1px dashed #cbd8e9;background:transparent;color:#173f79;font-size:12.5px;font-weight:600;border-radius:9px;padding:11px 16px;cursor:pointer}
.gs-cover-recent-row .gs-case{flex:1;min-width:160px;border:1px solid #E5EAF1;border-radius:9px;padding:10px 12px;background:#fff}
.gs-cover-recent-row .gs-case-symbol{width:26px;height:26px;font-size:12px}
@media(max-width:860px){.gs-cover-grid{grid-template-columns:1fr}.gs-cover-left{text-align:left}}

.gs-cover .gs-home-header{background:transparent;border-bottom:0;padding:24px 5vw}
.gs-cover .gs-brand{font-size:14px;letter-spacing:0;font-weight:500}
.gs-cover .gs-languages button{font-size:12px;padding:8px 10px;color:#52657c}
.gs-cover .gs-languages button[aria-pressed=true]{background:#E4ECF7;color:#14243A}
.gs-cover .gs-home-main{max-width:960px;padding:16px 28px 24px}
.gs-cover .gs-start-heading{display:flex;flex-direction:column;align-items:center;text-align:center;gap:26px;margin:0;padding:20px 0 42px}
.gs-cover-art{width:280px;max-width:80%;padding-right:12px}
.gs-cover-art svg{display:block;width:100%}
.gs-cover .gs-eyebrow{font-size:10px;font-weight:500;letter-spacing:2.6px;color:#A67C34;margin:0 0 18px}
.gs-cover .gs-start-heading h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(46px,7vw,76px);font-weight:400;letter-spacing:-3px;line-height:1.1;margin:0 0 20px}
.gs-cover .gs-start-heading h1 span{margin-left:.22em;font-style:italic;color:#5C7A96}
.gs-cover .gs-start-heading p:not(.gs-eyebrow){font-size:15px;color:#52657c;letter-spacing:.04em;line-height:1.7}
.gs-cover .gs-home-actions{justify-content:center;gap:10px}
.gs-cover .gs-primary,.gs-cover .gs-secondary{font-size:13px;min-height:46px;border-radius:5px;padding:12px 23px;border-color:#173f79}
.gs-cover .gs-primary{background:#173f79;color:white}
.gs-cover .gs-secondary{background:transparent;color:#173f79;border-color:#cbd8e9}
.gs-cover-cases{max-width:620px;margin:0 auto;border-top:1px solid #dce4ef;border-bottom:1px solid #dce4ef}
.gs-cover-cases summary{padding:16px 4px;font-size:12px;color:#52657c;cursor:pointer}
.gs-cover-cases summary span{float:right;font-variant-numeric:tabular-nums}
.gs-cover .gs-home-grid{display:block}
.gs-cover .gs-recent{border:0;background:transparent;padding:4px 0 16px}
.gs-cover .gs-section-heading{display:none}
.gs-cover .gs-empty{min-height:120px}.gs-cover .gs-empty>svg,.gs-cover .gs-empty>span{display:none}.gs-cover .gs-empty p{font-size:13px}
.gs-cover-links{display:flex;justify-content:center;gap:10px;margin:22px 0 8px;flex-wrap:wrap}
.gs-cover-links button{border:1px solid #cbd8e9;background:#fff;font-size:12.5px;font-weight:600;color:#173f79;padding:9px 16px;border-radius:7px;cursor:pointer}
.gs-cover-links button:hover{background:#EEF3F9}
.gs-cover .gs-resume{background:#e7eef9;border:1px solid #cbd9ed;border-radius:6px;padding:16px 20px;max-width:620px;margin:0 auto 20px}
.gs-cover .gs-resume h2{font-size:15px}.gs-cover .gs-home-footer{margin-top:24px;font-size:10px;color:#657b96;border-color:#dce4ef}
@media(max-width:520px){.gs-cover .gs-home-header{padding:18px 16px;gap:12px}.gs-cover .gs-brand{font-size:12px}.gs-cover .gs-languages button{padding:7px}.gs-cover .gs-home-main{padding:8px 20px 20px}.gs-cover .gs-start-heading{padding-top:10px;gap:24px}.gs-cover-art{width:220px}.gs-cover .gs-start-heading h1{letter-spacing:-2px}.gs-cover .gs-home-actions{width:auto}.gs-cover .gs-home-actions button{flex:initial}.gs-cover .gs-home-footer{justify-content:center;text-align:center}}
.gs-inspector .gs-note-connection{padding:9px!important;gap:6px!important;border-radius:7px}
.gs-editor-toolbar .gs-bond-kind{min-height:32px!important;padding:5px 8px!important;border:0!important;border-radius:3px!important;background:transparent!important;box-shadow:none!important;font-size:12px!important}
.gs-editor-toolbar .gs-bond-kind:hover,.gs-editor-toolbar .gs-bond-option:hover{background:#f3f6f9!important}
.gs-editor-toolbar .gs-bond-option{min-height:32px!important;padding:5px 8px!important;border:0!important;border-radius:3px!important;background:transparent!important;box-shadow:none!important;font-size:12px!important}

html[data-ui="th"] body :not(svg *){line-height:1.6!important}
html[data-ui="km"] body :not(svg *){line-height:1.75!important}`; /* no external @import — the artifact sandbox only allows cdnjs.cloudflare.com,
   and fonts.googleapis.com is blocked there, which was breaking the whole preview.
   System font stacks below give a close, dependable equivalent on every platform. */
const FD = "Georgia, 'Noto Serif KR', 'Nanum Myeongjo', 'Noto Serif TC', 'PMingLiU', serif";
const FB = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans TC', 'PingFang TC', system-ui, sans-serif";
const FS = "Georgia, 'Noto Serif KR', 'Nanum Myeongjo', 'Noto Serif TC', serif";
const FM = "ui-monospace, 'SFMono-Regular', 'Cascadia Mono', Consolas, monospace";
const FT = "'Trebuchet MS', 'Apple SD Gothic Neo', 'Noto Sans TC', sans-serif";

/* ── i18n ──────────────────────────────────────────────────────── */
/* 화면 언어 번호 li: 0 영어 · 1 한국어 · 2 중국어는 문구 배열의 같은 번호 칸을 읽고,
   3번부터(프랑스어·태국어·크메르어…)는 언어팩에서 영어 문구로 찾는다. 없으면 영어로 나온다. */
const LangCtx = createContext(1);
const useLi = () => useContext(LangCtx);
const tr = (v, li) => (Array.isArray(v) ? (li < BASE_LANG_COUNT ? v[li] ?? v[0] : packText(v, li) ?? v[0]) : v);

const S = {
  app: ["Genogram Studio", "가계도 스튜디오", "家系圖工作室"],
  tagline: ["", "", ""],
  intro: [
    "A genogram is not a family tree. A tree records lineage — names, dates, marriages, deaths. A genogram maps the emotional life that runs underneath: how members interact, where they are close and where they are cut off, which conflicts repeat, and which behaviours are inherited. Drawn across at least three generations, it makes visible the unspoken rules a family has passed down, the roles its members took without choosing them — the mediator, the scapegoat, the golden child — and the reason a pattern that began long ago is still shaping today's arguments.\n\nIts foundation is Bowen's family systems theory: the family is one emotional unit, not a set of separate individuals. Three ideas guide the reading — intergenerational transmission, triangulation, and differentiation of self. Because a genogram also records war, migration, poverty and the cultural expectations placed on gender and hierarchy, a family's difficulties can be read as adaptations to larger forces rather than personal failures. That shift, from blaming a person to seeing a system, is what turns the drawing into a working instrument: it names inherited scripts, opens unresolved wounds to repair, and lets a family write a different ending.",
    "가계도는 족보가 아닙니다. 족보는 혈통을 기록합니다 — 이름과 날짜, 혼인과 죽음. 가계도는 그 아래 흐르는 정서적 삶을 그립니다. 구성원들이 어떻게 주고받는지, 어디서 가깝고 어디서 끊어졌는지, 어떤 갈등이 되풀이되는지, 어떤 행동이 대물림되는지를 봅니다. 최소 3세대에 걸쳐 그리면, 가족이 말없이 물려 온 규칙과 아무도 고르지 않았으나 떠맡게 된 역할 — 중재자, 희생양, 착한 아이 — 그리고 오래전에 시작된 패턴이 왜 아직도 오늘의 다툼을 빚어내는지가 드러납니다.\n\n토대는 보웬의 가족체계이론입니다. 가족은 따로 떨어진 개인들의 모임이 아니라 하나의 정서 단위입니다. 읽기를 이끄는 세 개념은 세대 간 전이, 삼각관계, 그리고 자아분화입니다. 가계도는 전쟁과 이주, 가난, 성별과 위계에 대한 문화적 기대까지 함께 기록하므로, 가족의 어려움을 개인의 실패가 아니라 더 큰 힘에 대한 적응으로 읽게 합니다. 사람을 탓하던 자리에서 체계를 보는 자리로 옮겨 가는 이 전환이 그림을 도구로 만듭니다. 물려받은 각본에 이름을 붙이고, 아물지 않은 상처를 손댈 수 있게 하며, 가족이 다른 결말을 쓰도록 돕습니다.",
    "家系圖不是族譜。族譜記錄血緣——姓名、日期、婚姻與死亡；家系圖描繪其下流動的情感生活：成員如何互動、何處親近何處斷絕、哪些衝突反覆出現、哪些行為代代相傳。橫跨至少三代來繪製，家庭默默承襲的規則、無人選擇卻被指派的角色——調停者、代罪羔羊、乖孩子——以及一個久遠模式為何仍在形塑今日的爭執，都會顯現出來。\n\n其理論基礎為 Bowen 的家庭系統理論：家庭是一個情緒單位，而非彼此分離的個體集合。三個概念引導閱讀——世代間傳遞、三角關係、自我分化。由於家系圖同時記錄戰爭、遷徙、貧困，以及文化對性別與位階的期待，家庭的困境便能被理解為對更大力量的調適，而非個人的失敗。從責備個人轉向看見系統，正是這份圖成為工作工具的關鍵：它為承襲的腳本命名，讓未癒的創傷得以修復，也讓家庭得以寫下不同的結局。",
  ],
  chooseLang: ["Language", "언어", "語言"],
  home: ["Home", "처음으로", "首頁"],
  begin: ["Open", "열기", "開啟"],

  m1: ["What is a genogram?", "가계도는 무엇인가", "什麼是家系圖？"],
  m1s: ["Purpose, history and what it can show", "목적과 역사, 그리고 무엇이 보이는가", "目的、源流，以及它能顯示什麼"],
  m2: ["Draw a genogram", "가계도 그리기", "繪製家系圖"],
  m2s: ["Build the map during the session", "상담 중에 지도를 그립니다", "在會談中建立這張地圖"],
  m3: ["Analysis", "분석", "分析"],
  m3s: ["", "", ""],
  m4: ["Reference", "자료", "資料"],
  m4s: ["Symbol set and further reading", "기호 모음과 참고 도서", "符號總覽與延伸閱讀"],

  /* editor chrome */
  caseName: ["Case name (use a pseudonym)", "가계도 이름 (가명)", "個案名稱（請用化名）"],
  save: ["Save", "저장", "儲存"],
  exitSave: ["Exit & save", "종료 및 저장", "結束並儲存"],
  cancel: ["Cancel", "취소", "取消"],
  eventAdderTitle: ["Add an event", "사건 추가", "新增事件"],
  saveDlgTitle: ["Save this case", "가계도 저장", "儲存個案"],
  saveNameLabel: ["Case name", "가계도 이름", "個案名稱"],
  saveNamePh: ["e.g. Kim family — 2026", "예: 김OO 가족 — 2026", "例：金家 — 2026"],
  saveWhere: ["Where to save", "저장할 곳", "儲存位置"],
  saveOnDevice: ["This device", "이 기기에", "此裝置"],
  saveOnDeviceNote: ["Quick to reopen from the home screen. Stays only in this browser.", "홈 화면에서 바로 다시 열 수 있습니다. 이 브라우저에만 남습니다.", "可從首頁快速重新開啟。僅保留在此瀏覽器中。"],
  saveAsFile: ["As a file", "파일로", "另存為檔案"],
  saveAsFileNote: ["Choose a folder yourself — a USB drive, a specific case folder, anywhere.", "폴더를 직접 고르실 수 있습니다 — USB, 특정 가계도 폴더, 어디든지요.", "可自行選擇資料夾 — USB、特定個案資料夾，或任何位置。"],
  saveConfirm: ["Save", "저장", "儲存"],
  saveCancel: ["Cancel", "취소", "取消"],
  saveNameRequired: ["Please give this case a name.", "가계도 이름을 입력해 주세요.", "請為此個案命名。"],
  saved: ["Saved", "저장했습니다", "已儲存"],
  open: ["Open", "불러오기", "開啟"],
  undo: ["Undo", "되돌리기", "復原"],
  redo: ["Redo", "다시 실행", "重做"],
  restoreDraft: ["Resume unsaved work", "저장 안 한 작업 이어서 열기", "繼續未儲存的工作"],
  restored: ["Resumed", "이어서 불러왔습니다", "已繼續"],
  discardDraft: ["Discard", "지우기", "捨棄"],
  autoSaveNote: ["Kept automatically on this device", "이 기기에 자동으로 보관됩니다", "自動保存在此裝置"],
  storageSettings: ["Storage & privacy", "저장소와 개인정보", "儲存與隱私"],
  storageExplain: [
    "Saved cases and the auto-kept draft live only in this browser, on this device — nothing is sent to a server. Clearing browser data, using a different browser, or using a different computer means this information will not be there.",
    "저장한 가계도와 자동 임시저장 자료는 이 브라우저, 이 기기 안에만 있습니다 — 서버로 전송되지 않습니다. 브라우저 데이터를 지우거나, 다른 브라우저나 다른 컴퓨터를 쓰면 이 정보는 그곳에 없습니다.",
    "已儲存的個案與自動保留的草稿僅存在於此瀏覽器、此裝置中 — 不會傳送至伺服器。清除瀏覽器資料、更換瀏覽器或更換電腦，這些資訊將不在該處。"],
  sharedComputerWarn: [
    "On a shared or public computer, anyone using it afterward can open what is saved here. Turn off autosave below, or clear this device when you finish.",
    "공용 컴퓨터나 다른 사람도 쓰는 컴퓨터에서는, 다음 사용자가 여기 저장된 것을 열어 볼 수 있습니다. 아래에서 자동 임시저장을 끄거나, 마치신 뒤 이 기기의 자료를 지우십시오.",
    "在共用或公共電腦上，之後使用者可能開啟此處儲存的內容。請於下方關閉自動儲存，或於使用完畢後清除此裝置的資料。"],
  autosaveToggle: ["Auto-keep drafts on this device", "이 기기에 임시저장 자동 보관", "在此裝置自動保留草稿"],
  autosaveOnNote: ["On — closing the tab mid-session won't lose your work.", "켜짐 — 작업 중 탭을 닫아도 잃지 않습니다.", "已開啟 — 中途關閉分頁也不會遺失內容。"],
  autosaveOffNote: ["Off — nothing is kept unless you save a case yourself.", "꺼짐 — 직접 저장하지 않으면 아무것도 남지 않습니다.", "已關閉 — 除非您親自儲存個案，否則不會保留任何內容。"],
  clearDeviceTitle: ["Clear this device", "이 기기의 자료 전체 삭제", "清除此裝置的所有資料"],
  clearDeviceBtn: ["Delete all cases on this device", "이 기기의 모든 가계도 삭제", "刪除此裝置上的所有個案"],
  clearDeviceConfirm: ["This cannot be undone.", "되돌릴 수 없습니다.", "此操作無法復原。"],
  clearDeviceYes: ["Delete everything", "모두 삭제", "全部刪除"],
  clearDeviceNo: ["Cancel", "취소", "取消"],
  clearedDevice: ["This device has been cleared", "이 기기의 자료를 모두 지웠습니다", "已清除此裝置的資料"],
  keysTitle: ["Keyboard shortcuts", "단축키", "快捷鍵"],
  menuAdd: ["Structure", "구조", "結構"],
  menuInk: ["Pen & notes", "필기", "手寫"],
  menuView: ["Time-line settings", "타임라인 설정", "時間軸設定"],
  menuLayer: ["Show/Hide", "보기·가리기", "顯示/隱藏"],
  menuBond: ["Relationship lines", "관계선", "關係線"],
  menuMore: ["More", "더보기", "更多"],
  tidyRow: ["Tidy this sibling row", "형제 줄 정리", "整理手足列"],
  tidyHint: ["Releases the hand-set positions in this sibling row, widens the parents to fit, and spaces everyone evenly.",
    "이 형제 줄의 손으로 정한 자리를 풀고, 부모 간격을 맞춘 뒤, 고르게 다시 펼칩니다.",
    "解除此手足列的手動位置，調整父母間距，並重新平均排列。"],
  tidyDone: ["Sibling row tidied", "형제 줄을 정리했습니다", "已整理手足列"],
  tightSpan: ["The parents are too close together for their children — widen them.",
    "부모 간격이 자녀 수에 비해 좁습니다. 부모를 더 벌려 주세요.",
    "父母間距對子女數而言過窄，請再拉開一些。"],
  bondPickHint: ["Choose a line, then click the two people it runs between.",
    "선을 고른 뒤, 이을 두 사람을 차례로 누르세요.",
    "先選線條，再依序點選要連結的兩人。"],
  bondFromSel: ["Starting from", "시작 인물", "起始人物"],
  layAttr: ["Differentiation & scales", "분화·척도", "分化・量尺"],
  attrTitle: ["Differentiation & scales", "분화·척도", "分化・量尺"],
  diffF: ["Differentiation of self — counsellor's estimate", "자아분화 — 상담자의 임상적 추정", "自我分化 — 諮商者的臨床推估"],
  diffBands: [["Fused, reactive", "융합·반응적", "融合・反應"], ["Mostly reactive", "대체로 반응적", "多為反應"],
    ["Some separation", "어느 정도 분리", "略有分化"], ["Well differentiated", "분화가 잘 됨", "分化良好"]],
  customLay: ["Custom scales", "현장 맞춤 척도", "自訂量尺"],
  diffShort: ["Differentiation", "자아분화", "自我分化"],
  customUnnamed: ["A scale appears in the app only once it has a name. Blank slots stay hidden from the genogram and the person details.",
    "이름을 적은 척도만 앱에 나타납니다. 이름이 비어 있는 칸은 가계도와 인물 정보에 표시되지 않습니다.",
    "填上名稱的量尺才會出現在系統中。名稱空白的欄位不會顯示在家系圖與人物資料裡。"],
  customScaleEx: [["Field scale 1", "Field scale 2", "Field scale 3"], ["현장 척도 1", "현장 척도 2", "현장 척도 3"], ["現場量尺 1", "現場量尺 2", "現場量尺 3"]],
  customPickPerson: ["Select a person to set their value", "인물을 고르면 여기서 값을 매깁니다", "選取人物即可在此設定數值"],
  layName: ["Scale name", "척도 이름", "量尺名稱"],
  notSet: ["Not recorded", "기록 안 함", "未記錄"],
  bondHint0: ["Tap two people, then a line type — or pick a line type first, then tap two people.",
    "두 사람을 차례로 누른 뒤 선을 고르거나, 선을 먼저 고른 뒤 두 사람을 누르세요.",
    "依序點選兩人再選線條，或先選線條再點兩人。"],
  bondHint1: ["{a} ↔ tap the other person — or pick a line type first.",
    "{a} ↔ 상대 인물을 누르세요. 선 종류를 먼저 골라도 됩니다.",
    "{a} ↔ 請點選對方；也可以先選線條類型。"],
  bondHint2: ["{a} ↔ {b}: now pick a line type.", "{a} ↔ {b}: 이제 선 종류를 고르세요.", "{a} ↔ {b}：請選擇線條類型。"],
  bondChangeAdd: ["They already have a line, so the new one is added as a change in the relationship.",
    "이미 관계선이 있어, 새 선은 '관계 변화'로 이어 붙습니다.",
    "兩人已有關係線，新線會接在其後，記為「關係變化」。"],
  bondSame: ["That is already the current line for these two.", "이미 이 두 사람의 현재 관계선입니다.", "這已是兩人目前的關係線。"],
  chgTitle: ["Relationship changed", "관계가 바뀌었습니다", "關係已變化"],
  chgYear: ["Year (optional)", "연도(선택)", "年份（選填）"],
  chgReason: ["Why it changed (optional)", "바뀐 이유(선택)", "變化原因（選填）"],
  chgDone: ["Done", "완료", "完成"],
  chgMore: ["More detail (years, notes, direction) → relationship history", "더 자세히(기간·메모·방향) → 관계 변화 이력", "更多細節（期間、備註、方向）→ 關係變化歷程"],
  segFlipDir: ["Reverse this line", "이 선 방향 바꾸기", "反轉此線方向"],
  hhModeHint: ["Tap people to add or remove them. To enter another person's details, tap Finish household (or ⌂ Household above) — the household stays.",
    "인물을 누르면 가구에 넣고 뺍니다. 다른 인물의 정보를 넣으려면 '가구 완료'(또는 위의 ⌂ 가구)를 눌러 끄세요. 가구는 그대로 남습니다.",
    "點選人物即加入或移出家戶。要輸入其他人物的資料，請按「完成家戶」（或上方 ⌂ 家戶）關閉，家戶會保留。"],
  mergeAll: ["Merge lines between the same two people ({n})", "같은 두 사람의 관계선 합치기 ({n}쌍)", "合併同兩人的關係線（{n} 組）"],
  mergeThis: ["Merge the {n} lines between these two into one relationship history", "이 두 사람 사이의 관계선 {n}개를 하나의 관계 변화로 합치기", "將兩人之間的 {n} 條關係線合併為一段關係變化"],
  mergeNote: ["Lines merge in the order they were drawn. To reorder, add years in the relationship history.",
    "그은 순서대로 이어 붙입니다. 순서를 바꾸려면 관계 변화 이력에 연도를 적으세요.",
    "依繪製順序接合。要調整順序，請在關係變化歷程填入年份。"],
  mergedDone: ["Merged {n} pair(s)", "{n}쌍의 관계선을 합쳤습니다", "已合併 {n} 組關係線"],
  mergedSame: ["{m} identical line(s) were kept as one", "완전히 같은 선 {m}개는 하나로 남겼습니다", "完全相同的 {m} 條線只保留一條"],
  pregSexHint: ["If the sex is known, set it above and it appears beside the symbol. A name can be recorded too.",
    "성별을 아는 경우 위에서 고르면 기호 옆에 표시됩니다. 이름도 적을 수 있습니다.",
    "若已知性別，於上方選擇後會顯示在符號旁；也可記錄名字。"],
  layHH: ["Households", "가구", "家戶"],
  layTri: ["Triangles", "삼각관계", "三角關係"],
  layBond: ["Relationship lines", "정서 관계선", "情緒關係線"],
  layLabel: ["Relationship-type labels", "관계 유형 글자", "關係類型文字"],
  segEmphasize: ["Highlight this label", "이 이름표 강조해 두기", "特別標示此標籤"],
  layInk: ["Pen strokes", "필기", "筆跡"],
  layNote: ["Description boxes", "설명 박스", "說明框"],
  layBand: ["Generation bands", "세대 띠", "世代帶"],
  bandColorLbl: ["Band color", "띠 색", "帶狀顏色"],
  layHint: ["Switching a layer off only hides it. Nothing is deleted.",
    "레이어를 끄면 화면에서만 감춰집니다. 자료는 지워지지 않습니다.",
    "關閉圖層僅隱藏顯示，資料不會刪除。"],
  pinned: ["Position fixed by hand", "위치를 손으로 고정함", "位置已手動固定"],
  unpin: ["Return to automatic placement", "자동 배치로 되돌리기", "恢復自動排列"],
  unpinAll: ["Unlock every fixed position", "고정한 위치 모두 풀기", "解除所有固定位置"],
  mselTitle: ["Selected together", "함께 고른 인물", "一併選取"],
  mselHint: ["Shift-click a person to add them. Drag any one to move them all.",
    "Shift를 누른 채 인물을 누르면 묶입니다. 하나를 끌면 함께 움직입니다.",
    "按住 Shift 點選人物即可加入。拖曳其中一人，全體一起移動。"],
  mselClear: ["Clear selection", "묶음 풀기", "取消選取"],
  penTog: ["Pen", "펜", "筆"],
  textTog: ["Text", "글자", "文字"],
  noteAdd: ["Type a note", "메모를 적으세요", "輸入註記"],
  penHi: ["Highlighter", "형광펜", "螢光筆"],
  penSolid: ["Solid", "일반펜", "一般筆"],
  penErase: ["Eraser", "지우개", "橡皮擦"],
  penClear: ["Clear all", "모두 지우기", "全部清除"],
  zoomIn: ["Zoom in", "확대", "放大"],
  zoomOut: ["Zoom out", "축소", "縮小"],
  keyUndo: ["Undo / Redo", "되돌리기 / 다시 실행", "復原 / 重做"],
  keySave: ["Save case", "가계도 저장", "儲存個案"],
  keyDel: ["Delete selected", "선택 항목 삭제", "刪除所選"],
  keyEsc: ["Cancel / deselect", "취소 · 선택 해제", "取消 · 取消選取"],
  stdInsetTog: ["With structure", "표준 가계도 함께", "併看標準家系圖"],
  insetTitle: ["Standard genogram · structure", "표준 가계도 · 구조", "標準家系圖・結構"],
  readHint: [
    "↓ down a life-line: one person's sequence    ↔ across: the whole family that year",
    "↓ 세로로 읽기: 한 사람의 생애 순서    ↔ 가로로 읽기: 같은 해 가족 전체",
    "↓ 直讀：個人生命歷程　　↔ 橫讀：同年家族全貌",
  ],
  estNote: [
    "Dotted life-lines and ≈ years are estimates used for layout — enter confirmed years before reading clinically.",
    "점선 생애선과 ≈ 연도는 화면 배치를 위한 추정값입니다. 임상적으로 해석하기 전에 확인된 연도를 입력하세요.",
    "虛線生命線與 ≈ 年份為排版估計值。臨床解讀前請先輸入已確認的年份。",
  ],
  file: ["File", "파일", "檔案"],
  newPerson: ["Add", "새 인물", "新增"],
  male: ["Male", "남성", "男性"],
  female: ["Female", "여성", "女性"],
  unknownG: ["Unknown", "미상", "不明"],
  object: ["Object", "대상", "對象"],
  template: ["Basic genogram", "기본 가계도", "基本家系圖"],
  addChild: ["Add a child", "자녀 추가", "新增子女"],
  addObject: ["Add an object", "대상 추가", "新增對象"],
  fromY: ["from", "시작", "起"],
  toY: ["to", "끝", "迄"],
  onLifeLine: ["shows on the life-line", "생애선에 표시됩니다", "顯示於生命線"],
  tlgReset: ["Reset positions", "타임라인 위치 초기화", "重設時間軸位置"],
  lifeNote: ["Life-line notes", "생애선 메모", "生命線註記"],
  lifeNoteHint: [
    "A note placed at its year on the life-line reads as something the person lived through, not as a lifelong trait.",
    "생애선의 그 해 자리에 놓인 메모는 그 사람의 평생 속성이 아니라 그가 그때 겪은 일로 읽힙니다.",
    "置於生命線該年位置的註記，讀來是那人當時的經歷，而非終身特質。"],
  objRingHint: ["Pick what the third vertex is", "삼각관계의 세 번째 꼭짓점이 무엇인지 고르십시오", "選擇三角關係的第三頂點為何"],
  objRingEdit: ["Change what this object is", "이 대상이 무엇인지 바꿉니다", "更改此對象為何"],
  fit: ["Fit to screen", "화면 맞춤", "符合畫面"],
  household: ["Household", "가구", "同住家戶"],
  hhDone: ["Finish household", "가구 완료", "完成家戶"],
  triangle: ["Triangle", "삼각관계", "三角關係"],
  detailOn: ["Details shown", "정보 자세히", "顯示詳細"],
  detailOff: ["Details hidden", "정보 간단히", "隱藏詳細"],
  storyCard: ["Story card", "이야기 카드", "敘事卡"],
  timelineTog: ["Show family history", "가족의 역사 보기", "顯示家族歷史"],
  chronView: ["Family history", "가족의 역사", "家族歷史"],
  viewStd: ["Standard", "표준 가계도", "標準家系圖"],
  viewStdShort: ["Standard", "표준", "標準"],
  viewTLG: ["Time-line", "타임라인", "時間軸"],
  yearGap: ["Years", "년 간격", "年距"],
  from: ["From", "시작", "起"],
  to: ["To", "끝", "迄"],
  wholeSpan: ["Whole span", "전체 기간", "全部期間"],

  tabDetail: ["Detail", "세부", "細節"],
  tabInterview: ["Interview", "면담 질문", "訪談問題"],
  ivTitle: ["Interview guide", "면담 질문 가이드", "訪談問題指南"],
  closePanel: ["Close", "닫기", "關閉"],
  ivHint: [
    "Keep this open beside the chart. Categories stay collapsed until you open the one you need.",
    "가계도를 그리며 옆에 두고 참고하십시오. 필요한 범주만 펼쳐 보시면 됩니다.",
    "繪製家系圖時可置於一旁參考。僅需展開您需要的類別。"],
  tabStory: ["Story", "이야기", "敘事"],
  tabContext: ["Context", "맥락", "脈絡"],
  tabTime: ["Family history entry", "가족의 역사 입력", "家族歷史輸入"],
  tabMore: ["Other", "기타", "其他"],
  tabSaved: ["Saved", "저장한 가계도", "已儲存個案"],
  tabList: ["Index", "목록", "清單"],

  nothingSel: ["Nothing selected", "선택된 항목 없음", "未選取項目"],
  nothingSelBody: [
    "Tap a person, a line, a household or a triangle to record it here.",
    "인물·관계선·가구·삼각관계를 누르면 여기서 기록합니다.",
    "點選人物、關係線、家戶或三角關係即可在此記錄。",
  ],
  privacyNote: [
    "Clinical records are sensitive. Use pseudonyms and tell the client how the drawing will be kept.",
    "상담 자료는 민감정보입니다. 가명을 쓰고 보관 방식을 내담자에게 설명하세요.",
    "諮商紀錄屬敏感資訊。請使用化名，並向來訪者說明保存方式。",
  ],
  savedCases: ["Saved cases", "저장한 가계도", "已儲存的個案"],
  noSaved: ["None yet.", "아직 없습니다.", "尚無紀錄。"],
  del: ["Delete", "삭제", "刪除"],
  delSure: ["Tap again to delete", "한 번 더 누르면 삭제", "再按一次即刪除"],
  autoKept: ["(auto-saved) ", "(자동 보관) ", "（自動保存）"],
  untitledCase: ["Untitled case", "제목 없는 가계도", "未命名個案"],
  autoKeptMsg: ["Your unsaved work was kept in Saved cases", "저장하지 않은 작업을 '저장한 가계도'에 자동 보관했습니다", "已將未儲存的作業自動保存到「已儲存個案」"],

  personRec: ["Person", "인물 기록", "人物記錄"],
  nameF: ["Name (pseudonym)", "이름 (가명)", "姓名（化名）"],
  birthF: ["Born", "출생연도", "出生年"],
  ageF: ["Age", "나이", "年齡"],
  ageHint: ["If you don't know the birth year, enter age instead", "출생연도를 모르면 나이만 입력하세요", "若不知出生年，可只輸入年齡"],
  deathF: ["Died", "사망연도", "歿年"],
  roleF: ["Role · occupation · faith", "역할·직업·종교", "角色・職業・信仰"],
  roleHint: ["shown in green under the symbol", "기호 아래 초록색으로 표시", "顯示於符號下方（綠色）"],
  noteF: ["Personal note", "개인 메모", "個人備註"],
  noteHint: ["shown as a card under the symbol", "기호 아래 카드로 표시", "以卡片顯示於符號下方"],
  proband: ["Index person — double line", "본인(내담자) — 이중선", "本人（案主）— 雙線"],
  deceased: ["Deceased — X", "사망 — X 표시", "已歿 — X"],
  physF: ["Physical illness — left half", "신체 질환 — 왼쪽 반", "身體疾病 — 左半"],
  mentF: ["Mental health — right half", "정신건강 — 오른쪽 반", "心理健康 — 右半"],
  addiF: ["Addiction — lower half", "중독 — 아래쪽 반", "成癮 — 下半"],
  objKindF: ["Object type — third vertex of a triangle", "대상 종류 — 삼각관계의 세 번째 꼭짓점", "對象種類 — 三角關係的第三頂點"],
  linkF: ["Link to parents", "부모와의 관계", "與父母的關係"],
  pregF: ["Pregnancy loss", "임신 상실", "妊娠失落"],
  twinF: ["Child line — twin", "자녀 관계선 — 쌍둥이", "子女關係線 — 雙胞胎"],
  twinUnlink: ["Unpair twins", "쌍둥이 연결 해제", "解除雙胞胎連結"],
  analyser: ["Family systems analysis", "가족 시스템 분석", "家庭系統分析"],
  analyserHint: [
    "This analysis draws only on the reference books and the accumulated clinical experience behind this app — no AI is used to generate it. The genogram is read through {D} domains and {R} rules. The report keeps three things apart: what can be seen in the chart, what may be worth considering for now, and what still needs asking the family. When you answer a question, the family's answer is shown separately so it never mixes with what was read from the chart. This information is provisional and needs discussion with a counsellor.",
    "이 분석은 참고 도서와 그동안 쌓아 온 임상 경험만을 근거로 합니다 — AI를 써서 만든 내용이 아닙니다. 가계도를 {D}개 영역과 {R}개 규칙에 따라 살펴봅니다. 보고서에는 가계도에서 확인한 내용, 지금 생각해 볼 수 있는 가설, 가족에게 더 물어볼 질문이 따로 나옵니다. 질문에 답하면 가족의 답변도 관찰 내용과 섞이지 않도록 구분해 보여 줍니다. 이 자료는 잠정적인 것으로, 상담가와의 상의가 필요합니다.",
    "此分析僅依據參考書籍與長年累積的臨床經驗製作 — 並非使用 AI 生成。依 {D} 個領域與 {R} 條規則閱讀家系圖。報告分開呈現三件事：圖中可見的內容、目前可以思考的假設，以及仍需向家庭詢問的問題。作答後，家庭的回答會另外標示，不與圖中讀到的內容混在一起。此資料為暫定內容，仍需與諮商師討論。"],
  analReport: ["Analysis report", "분석 보고서", "分析報告"],
  analBack: ["Back to the analyser", "분석기로 돌아가기", "返回分析器"],
  analPrint: ["Print the report", "보고서 인쇄", "列印報告"],
  analAlt: ["It could also be read differently", "다르게 볼 수도 있습니다", "也可以有不同的看法"],
  analAsk: ["Questions to ask the family", "가족에게 물어볼 질문", "可向家庭詢問的問題"],
  analAnsPh: ["The family's answer", "가족의 답변", "家庭的回答"],
  analSaid: ["The family's answer", "가족의 답변", "家庭的回答"],
  analSources: ["Knowledge base", "지식체계 근거", "知識體系依據"],
  printConfidential: [
    "This report contains sensitive clinical information. Store and share it under the same confidentiality standard as any other clinical record.",
    "이 보고서는 민감한 임상 정보를 담고 있습니다. 다른 상담 기록과 같은 기준으로 보관·공유하십시오.",
    "本報告包含敏感臨床資訊。請依照其他臨床紀錄相同的保密標準保存與分享。"],
  analDisclaim: [
    "What follows is not a judgement about this family. It is a set of readings for a counsellor and the family to check together. Read every line as something still to be asked about, and read \u201cIt could also be read differently\u201d before the readings themselves.",
    "아래 내용은 가족을 판정한 결과가 아닙니다. 전문가와 가족이 함께 확인해 볼 내용입니다. 모든 줄을 아직 물어봐야 할 것으로 읽으시고, 각 항목보다 \u201c다르게 볼 수도 있습니다\u201d를 먼저 읽어 주세요.",
    "以下並非對這個家庭的判定，而是供諮商師與家庭共同確認的內容。請將每一行視為仍待詢問之事，並先閱讀「也可以有不同的看法」再讀各項內容。"],
  panelHide: ["Hide panel", "패널 가리기", "隱藏面板"],
  panelShow: ["Show panel", "패널 보기", "顯示面板"],
  toolbarHide: ["Hide toolbar", "가리기", "隱藏"],
  toolbarShow: ["Show toolbar", "펼쳐보기", "顯示"],
  orientF: ["Sexual orientation", "성적 지향", "性傾向"],
  ssmSpouse: ["Same-sex partner", "동성 배우자", "同性配偶"],
  fraternal: ["Fraternal", "이란성", "異卵"],
  identical: ["Identical", "일란성", "同卵"],
  quickAdd: ["Add relatives", "가족 빠르게 추가", "快速新增家人"],
  childLine: ["Child line", "자녀 관계선", "子女關係線"],
  spouse: ["Spouse", "배우자", "配偶"],
  parents: ["Parents", "부모", "父母"],
  son: ["Son", "아들", "兒子"],
  daughter: ["Daughter", "딸", "女兒"],
  brother: ["Brother", "남자 형제", "兄弟"],
  sister: ["Sister", "여자 형제", "姊妹"],
  delPerson: ["Delete this person", "이 인물 지우기", "刪除此人物"],

  couple: ["Couple", "부부 관계", "伴侶關係"],
  coupleState: ["Status — tap a line", "관계 상태 — 선을 눌러 바꾸기", "關係狀態 — 點選線條"],
  mYearF: ["Married", "결혼연도", "結婚年"],
  eYearF: ["Ended", "종료연도", "結束年"],
  addSon: ["Add son", "아들 추가", "新增兒子"],
  addDau: ["Add daughter", "딸 추가", "新增女兒"],
  delUnion: ["Delete this couple line", "이 관계 지우기", "刪除此關係"],

  relType: ["Relationship type", "관계 유형", "關係類型"],
  bondNote: ["Note under the line", "선 아래 메모", "線下備註"],
  bondFrom: ["Began (time-line)", "시작 연도", "起始年"],
  bondTo: ["Ended", "끝난 연도", "結束年"],
  relHistory: ["Relationship over time", "관계 변화 이력", "關係隨時間的變化"],
  relHistoryHint: ["Add a period whenever the type changed. Each period gets its own line, drawn in order on the time-line view; an arrow and your note mark the transition.", "유형이 바뀔 때마다 구간을 추가하세요. 각 구간은 타임라인 보기에서 시간 순서대로 놓이고, 화살표와 메모로 전환 지점을 표시합니다.", "類型改變時新增一個時段。每個時段各自成線，於時間軸檢視中依序排列；箭頭與備註標示轉折點。"],
  addSegment: ["Add a period", "구간 추가", "新增時段"],
  segReason: ["What changed, and why", "무엇이, 왜 바뀌었는지", "發生了什麼變化，為什麼"],
  segType: ["Type", "유형", "類型"],
  flip: ["Reverse the arrow", "화살표 방향 바꾸기", "反轉箭頭方向"],
  delBond: ["Delete this line", "이 관계선 지우기", "刪除此關係線"],

  hhTitle: ["Household — who lives together", "가구 — 함께 사는 사람", "家戶 — 同住成員"],
  hhName: ["Household name", "가구 이름", "家戶名稱"],
  hhYear: ["Period", "시기", "期間"],
  hhColor: ["Colour", "색", "顏色"],
  hhMembers: ["Members — tap to add or remove", "구성원 넣기·빼기", "成員 — 點選加入或移除"],
  hhHint: [
    "A single dashed loop hugs only the members, so distant relatives can be grouped without covering everyone between them.",
    "구성원만 감싸는 점선 고리가 그려져, 멀리 떨어진 사람을 묶어도 사이의 인물을 덮지 않습니다.",
    "以一條虛線環圈僅圈住成員，即使相隔甚遠也不會覆蓋中間的人物。",
  ],
  delHH: ["Delete this household", "이 가구 지우기", "刪除此家戶"],

  triTitle: ["Triangle", "삼각관계", "三角關係"],
  triConflict: ["In conflict", "갈등", "衝突"],
  triFlow: ["Anxiety flows to", "불안이 흘러가는 쪽", "焦慮流向"],
  triRotate: ["Rotate roles", "역할 돌리기", "輪換角色"],
  triSrc: ["Anxiety starts from", "불안을 흘려보내는 쪽", "焦慮的起點"],
  triDistant: ["Show the distance line", "거리(점선) 표시", "顯示距離虛線"],
  triKind: ["Pattern", "삼각관계 유형", "三角關係型態"],
  triCause: ["Cause of the conflict · path of the anxiety", "갈등의 원인 · 불안의 경로", "衝突成因・焦慮路徑"],
  triHint: [
    "Draw triangles when you interpret, not while you collect. If a pet, an affair, work or alcohol is the third point, create it first with the Object button.",
    "삼각관계는 정보를 모을 때가 아니라 해석할 때 그립니다. 반려동물·외도·일·술이 세 번째 꼭짓점이면 ‘대상’ 버튼으로 먼저 만드세요.",
    "三角關係應於詮釋階段繪製，而非蒐集資料時。若第三點是寵物、外遇、工作或酒精，請先以「對象」按鈕建立。",
  ],
  delTri: ["Delete this triangle", "이 삼각관계 지우기", "刪除此三角關係"],

  storyTitle: ["The family's story", "가족 전체 이야기", "家庭的整體敘事"],
  storyHint: [
    "Shown as a card beside the genogram. Individual facts belong in each person's note.",
    "가계도 옆 카드로 표시됩니다. 개인별 내용은 각 인물 메모에 적으세요.",
    "以卡片顯示於家系圖旁；個別事實請寫在各人物的備註中。",
  ],
  stProblem: ["Presenting problem", "현재 문제", "主訴問題"],
  stHistory: ["Family history · critical events", "가족사·주요 사건", "家族史・重大事件"],
  stStrength: ["Strengths and resources", "강점·자원", "優勢與資源"],
  stNote: ["Other notes", "기타 메모", "其他備註"],

  ctxTitle: ["Context for assessing the problem", "문제를 보는 맥락", "評估問題的脈絡"],
  ctxHint: [
    "Carter & McGoldrick's frame. The vertical axis carries what came down the generations; the horizontal axis carries what presses on the family now. Symptoms erupt where the two cross.",
    "Carter·McGoldrick의 틀입니다. 세로축은 세대를 타고 내려온 압력, 가로축은 지금 가족을 누르는 압력입니다. 두 축이 만나는 자리에서 증상이 터집니다.",
    "Carter 與 McGoldrick 的架構。縱軸承載世代傳遞而下的壓力，橫軸則是此刻壓在家庭身上的壓力；症狀爆發於兩軸交會之處。",
  ],
  ctxVert: ["Vertical stressors — passed down", "수직 스트레스 — 세대 전수", "縱向壓力 — 世代傳遞"],
  ctxHoriz: ["Horizontal stressors — present time", "수평 스트레스 — 현재 시간축", "橫向壓力 — 當下時間軸"],
  ctxRing: ["Where the anxiety sits", "불안이 걸린 층위", "焦慮所在的層次"],
  ctxRead: ["Reading — where the two axes cross", "해석 — 두 축이 만나는 지점", "詮釋 — 兩軸交會之處"],

  tlTitle: ["Family history", "가족의 역사", "家族歷史"],
  transitionWhy: [
    "A transition is a period in which an outward change in the family or a person meets an inward response to it. What belongs here is not the event alone, but the emotional stir it left and what it did to family relationships. Marked this way, a single event or change can be traced forward — how long, and in what form, its influence kept shaping the family and the person afterward.",
    "전환기는 가족이나 개인이 격은 외부적 변화와, 그에 대한 내면의 반응이 함께 나타나는 시기를 말합니다. 그래서 여기에는 사건 자체만이 아니라, 그 사건이 남긴 감정적 동요와 가족 관계에 미친 영향까지 함께 기록합니다. 이렇게 표시해 두면 특정 사건이나 변화가 그 순간으로 끝나지 않고 이후 가족과 개인에게 얼마나 오래, 어떻게 영향을 미쳤는지를 짚어낼 수 있습니다.",
    "轉換期是指家庭或個人經歷的外在變化，與對此的內在反應共同出現的時期。因此此處要記錄的不只是事件本身，而是該事件所留下的情緒波動以及對家庭關係的影響。如此標註後，可以追蹤特定事件或變化如何不在發生的那一刻就結束，而是持續以何種形式、多長時間影響着家庭與個人。",
  ],
  tlHint: [
    "Births, deaths, marriages and divorces are taken from the years you entered. Add migrations, illnesses and job losses to see what happened in the same year.",
    "출생·사망·결혼·이혼은 입력한 연도에서 자동으로 만들어집니다. 이주·질병·실직을 더하면 같은 해에 무슨 일이 겹쳤는지 보입니다.",
    "出生、死亡、結婚與離婚會依所填年份自動產生。加入遷徙、疾病與失業，便能看見同一年發生了什麼。",
  ],
  tlgHint: [
    "The Time-line view redraws the same data with time on the vertical axis (Friedman, Rohrbaugh & Krakauer, 1988). Read down a life-line for one person's sequence; read across for what the family was doing that year.",
    "타임라인 보기는 같은 자료를 세로축이 시간인 형식으로 다시 그립니다 (Friedman·Rohrbaugh·Krakauer, 1988). 세로로 읽으면 한 사람의 순서가, 가로로 읽으면 그 해 가족 전체가 보입니다.",
    "時間軸檢視以縱軸為時間重繪同一份資料（Friedman、Rohrbaugh 與 Krakauer, 1988）。縱向閱讀可見個人生命序列，橫向閱讀則見該年全家的處境。",
  ],
  evYear: ["Year", "연도", "年"],
  evEnd: ["to", "~끝", "至"],
  evTitle: ["Event", "사건", "事件"],
  evDetail: ["Details — optional", "구체적인 내용 — 선택", "具體內容 — 選填"],
  evWhole: ["Whole family", "가족 전체 사건", "全家事件"],
  evScope: ["History layer", "역사 층위", "歷史層級"],
  evFamily: ["Whole family", "가족 전체", "全家"],
  evParents: ["Parents · couple", "부모·부부", "父母・伴侶"],
  evPerson: ["Linked person", "인물 연결", "連結人物"],
  evOther: ["Other", "기타", "其他"],
  childLayer: ["Child", "자녀", "子女"],
  otherLayer: ["Other people · context", "기타 인물·맥락", "其他人物・脈絡"],
  transitionTitle: ["Family transitions", "가족 전환기", "家庭轉換期"],
  transitionName: ["Transition name", "전환기 이름", "轉換期名稱"],
  transitionFrom: ["From", "시작", "起"],
  transitionTo: ["To", "끝", "迄"],
  transitionLink: ["Transition group", "전환기 묶음", "轉換期群組"],
  noTransition: ["No group", "묶지 않음", "不分組"],
  add: ["Add", "추가", "新增"],
  evHint: [
    "Choose a person and an end year to draw a duration bar beside their life-line.",
    "인물과 끝 연도를 함께 적으면 그 사람의 생애선 옆에 기간 막대가 그려집니다.",
    "選定人物並填入結束年，即可在其生命線旁畫出期間長條。",
  ],

  people: ["People", "인물", "人物"],
  lines: ["Relationship lines", "관계선", "關係線"],
  households: ["Households", "가구", "家戶"],
  triangles: ["Triangles", "삼각관계", "三角關係"],

  /* export screen */
  exTitle: ["Analysis", "분석", "分析"],
  exBody: [
    "Export the finished map, then read it with a clinician. The checklist below follows the standard construction rules; the questions come from Bowen-family-systems interpretation.",
    "완성한 지도를 내보낸 뒤 상담자와 함께 읽으세요. 아래 점검표는 표준 작성 규칙을, 질문은 보웬 가족체계 해석의 순서를 따릅니다.",
    "輸出完成的圖後，與諮商師一同閱讀。下列檢核表依循標準繪製規則，提問則依循 Bowen 家庭系統的詮釋順序。",
  ],
  exPNG: ["Export PNG", "PNG로 내보내기", "輸出 PNG"],
  exPDF: ["Export PDF", "PDF로 내보내기", "輸出 PDF"],
  exSVG: ["Export SVG", "SVG로 내보내기", "輸出 SVG"],
  exData: ["Save data file", "자료 파일 저장", "儲存資料檔"],
  exDataHint: [
    "The data file is JSON (.genogram.json) — every person, line, household, triangle and note. Open it later to keep working; PNG and PDF are pictures only. In Chrome or Edge on a computer, saving will ask where to put the file; other browsers save to your default downloads folder.",
    "자료 파일은 JSON(.genogram.json)입니다 — 인물·관계선·가구·삼각관계·메모가 모두 담깁니다. 다음에 열어 이어서 수정하세요. PNG·PDF는 그림일 뿐 편집되지 않습니다. 컴퓨터의 크롬·엣지에서는 저장 위치를 직접 고르는 창이 뜨고, 다른 브라우저는 기본 다운로드 폴더에 저장됩니다.",
    "資料檔為 JSON（.genogram.json），涵蓋所有人物、關係線、家戶、三角關係與備註；日後開啟即可續編。PNG 與 PDF 僅為圖片，無法再編輯。在電腦版 Chrome 或 Edge 中儲存時會詢問存放位置；其他瀏覽器則存到預設下載資料夾。",
  ],
  checklist: ["Construction checklist", "작성 점검", "繪製檢核"],
  questions: ["Questions for the review", "함께 읽을 질문", "共同閱讀的提問"],

  /* reference screen */
  refSymbols: ["Symbol set", "기호 모음", "符號總覽"],
  refBooks: ["Further reading", "참고 도서", "延伸閱讀"],
  refIndiv: ["Individuals", "인물", "人物"],
  refStruct: ["Structural lines", "구조선", "結構線"],
  refNote: [
    "An arrow marks direction: the person the arrow points at is the one receiving the abuse, neglect or control.",
    "화살표는 방향을 뜻합니다 — 화살표를 받는 쪽이 학대·무관심·조종을 당하는 사람입니다.",
    "箭頭代表方向：被箭頭指向者，即為承受虐待、忽視或操縱的一方。",
  ],
};

/* ── logo ──────────────────────────────────────────────────────── */
function Logo({ size = 56, mono = false }) {
  const a = mono ? "#fff" : T.pine;
  const b = mono ? "rgba(255,255,255,.72)" : T.gold;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Genogram Studio">
      <rect x={1.5} y={1.5} width={61} height={61} rx={16} fill={mono ? "rgba(255,255,255,.10)" : "#fff"} stroke={a} strokeWidth={2.4} />
      <rect x={13} y={13} width={14} height={14} fill="none" stroke={a} strokeWidth={2.6} />
      <circle cx={44} cy={20} r={7} fill="none" stroke={a} strokeWidth={2.6} />
      <path d="M 20 27 V 34 H 44 V 27" fill="none" stroke={a} strokeWidth={2.2} />
      <path d="M 32 34 V 41" fill="none" stroke={a} strokeWidth={2.2} />
      <circle cx={32} cy={48} r={7} fill="none" stroke={b} strokeWidth={2.8} />
      <circle cx={32} cy={48} r={3} fill={b} />
    </svg>
  );
}

function FamilyArt({ w = 360 }) {
  const h = w * 0.68;
  return (
    <svg width={w} height={h} viewBox="0 0 360 245" aria-hidden="true">
      <defs>
        <linearGradient id="faSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3F1E6" /><stop offset="1" stopColor="#E8EEE4" />
        </linearGradient>
      </defs>
      {/* arch window */}
      <path d="M 40 245 L 40 120 A 140 140 0 0 1 320 120 L 320 245 Z" fill="url(#faSky)" stroke="#DCE2D6" strokeWidth={1.5} />
      <ellipse cx={180} cy={228} rx={128} ry={17} fill="#DFE8DC" />
      {/* sun */}
      <circle cx={272} cy={78} r={17} fill="#EBCB7C" opacity={0.85} />
      {/* grandparents, behind */}
      <g opacity={0.95}>
        <circle cx={96} cy={106} r={13} fill="#8FA996" />
        <path d="M 78 158 Q 96 122 114 158 Z" fill="#8FA996" />
        <circle cx={130} cy={102} r={12} fill="#C9B482" />
        <path d="M 113 154 Q 130 122 147 154 Z" fill="#C9B482" />
      </g>
      <path d="M 118 148 C 136 176 158 180 176 184" fill="none" stroke="#AEBFAA" strokeWidth={2.2} strokeDasharray="1 6.5" strokeLinecap="round" />
      {/* parents */}
      <circle cx={170} cy={128} r={19} fill="#2F5D4E" />
      <path d="M 140 228 Q 170 150 200 228 Z" fill="#2F5D4E" />
      <circle cx={236} cy={124} r={18} fill="#D9A441" />
      <path d="M 208 228 Q 236 148 264 228 Z" fill="#D9A441" />
      {/* two children */}
      <circle cx={202} cy={172} r={11} fill="#EFE7D2" />
      <path d="M 186 228 Q 202 182 218 228 Z" fill="#EFE7D2" />
      <circle cx={146} cy={182} r={9} fill="#C97F5E" />
      <path d="M 133 228 Q 146 190 159 228 Z" fill="#C97F5E" />
      {/* joined arc + heart */}
      <path d="M 182 176 Q 203 158 224 172" fill="none" stroke="#F7F4EA" strokeWidth={4.5} strokeLinecap="round" />
      <path d="M 203 142 c -2.6 -5.2 -10.4 -4.3 -10.4 1.7 c 0 5.2 6.9 8.7 10.4 11.3 c 3.5 -2.6 10.4 -6.1 10.4 -11.3 c 0 -6 -7.8 -6.9 -10.4 -1.7 Z" fill="#C96A4E" />
    </svg>
  );
}

/* ══ constants ══════════════════════════════════════════════════ */
const GEN_H = 240, COL_W = 138, TLG_COL = 124;
const YEAR = new Date().getFullYear();
const uid = () => Math.random().toString(36).slice(2, 9);

/* Groups rapid edits into one undo step: dragging one node, or typing
   continuously into one field, collapses to a single history entry. */
/* 기본틀로 만든 사람은 이름 대신 tkey를 갖는다. 이름을 아직 적지 않았다면
   화면 언어에 맞는 호칭이 보이고, 이름을 적는 순간 그 이름이 우선한다. */
const TEMPLATE_NAMES = {
  gf: ["Grandfather", "할아버지", "祖父"],
  gm: ["Grandmother", "할머니", "祖母"],
  fa: ["Father", "아버지", "父親"],
  mo: ["Mother", "어머니", "母親"],
  me: ["Index person", "본인", "本人"],
};
/* 번역 캐시. 같은 이름을 반복 번역하지 않는다. */
const _nameCache = new Map();
const personName = (p, li) => (p?.name || (p?.tkey ? tr(TEMPLATE_NAMES[p.tkey], li) : "") || "—");

/* 번역된 이름 — 언어가 다를 때 캐시에서 꺼내거나 API를 부른다.
   동기로 쓸 수 있도록 캐시에 없으면 원본을 바로 돌려준다.
   번역이 완료되면 React 상태 갱신으로 다시 그린다. */
function useTranslatedName(name, srcLi, dstLi, setCache) {
  if (srcLi === dstLi || !name || !name.trim()) return name;
  const key = `${srcLi}:${dstLi}:${name}`;
  if (_nameCache.has(key)) return _nameCache.get(key);
  /* 아직 번역 안 됐으면 비동기 번역 시작 */
  tr1(name, dstLi).then((result) => {
    if (result && result !== name) { _nameCache.set(key, result); setCache({}); }
  });
  return name;   // 번역 완료 전에는 원본 표시
}

const editTag = (id, patch) => {
  const ks = Object.keys(patch || {});
  if (!ks.length) return null;
  if (ks.every((k) => k === "x" || k === "y")) return `mv:${id}`;
  return ks.length === 1 ? `ed:${id}:${ks[0]}` : null;
};

/* localStorage fallback so the app works both inside Claude and as a
   standalone deployed site (window.storage only exists in the Claude sandbox) */
const storage = (typeof window !== "undefined" && window.storage) ? window.storage : (
  typeof window !== "undefined" && window.localStorage
    ? {
        get: async (key) => { const v = window.localStorage.getItem(key); return v == null ? null : { key, value: v }; },
        set: async (key, value) => { window.localStorage.setItem(key, value); return { key, value }; },
        delete: async (key) => { window.localStorage.removeItem(key); return { key, deleted: true }; },
        list: async (prefix = "") => {
          const keys = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(prefix)) keys.push(k);
          }
          return { keys, prefix };
        },
      }
    : null
);

const UNION_TYPES = {
  married: { label: ["Marriage", "결혼", "結婚"], marks: 0 },
  ssm: { label: ["Same-sex marriage", "동성 결혼", "同性結婚"], marks: 0, ssm: true },
  cohabit: { label: ["Living together", "동거", "同居"], dash: "7 5", marks: 0 },
  engaged: { label: ["Engagement", "약혼", "訂婚"], dash: "2 4", marks: 0 },
  engagedEnd: { label: ["Broken engagement", "약혼 후 파혼", "解除婚約"], dash: "2 4", marks: 2 },
  dating: { label: ["Dating", "데이팅", "交往"], dash: "1 6", marks: 0 },
  affair: { label: ["Affair", "외도", "外遇"], dash: "7 3 1.5 3", marks: 0, affair: true },
  /* 짧게 스치고 지나간 관계에서 아이가 생기는 일은 드물지 않다.
     결혼·동거·이혼밖에 없으면 그런 가족은 그릴 자리가 없어진다.
     관계의 성격을 판단하는 말 대신 기간과 형태만 적는다 —
     내담자가 화면을 함께 보는 자리이기 때문이다. */
  brief: { label: ["Brief relationship", "단기 관계", "短期關係"], dash: "2 5", marks: 0, pill: ["brief", "단기", "短期"] },
  onceOff: { label: ["One-time encounter", "일회적 관계", "一次性關係"], dash: "1 5", marks: 0, pill: ["once", "1회", "一次"] },
  unknownRel: { label: ["Relationship not known", "관계 불명", "關係不明"], dash: "3 5", marks: 0, pill: ["?", "?", "?"] },
  coerced: { label: ["Coerced, non-consensual", "강압적 관계", "非自願關係"], dash: "2 4", marks: 0, pill: ["coerced", "강압", "脅迫"] },
  donor: { label: ["Donor or surrogate", "제공·대리 출산", "捐贈・代孕"], dash: "1 7", marks: 0, pill: ["donor", "제공", "捐贈"] },
  sepFact: { label: ["Separation in fact", "사실상 별거", "事實分居"], marks: 1 },
  sepLegal: { label: ["Legal separation", "법적 별거", "法律分居"], marks: 1, lean: -1 },
  divorced: { label: ["Divorce", "이혼", "離婚"], marks: 2 },
  reunion: { label: ["Reunion", "재결합", "復合"], marks: 3 },
};
/* 자녀 관계선 — 선 모양으로 구별한다: 친자는 실선, 입양은 긴 파선,
   수양은 짧은 파선, 위탁은 점선, 의붓자녀는 파선-점 혼합. */
const LINK_TYPES = {
  bio: ["Biological child", "친자", "親生子女"],
  adopt: ["Adopted child", "입양자녀", "領養子女"],
  ward: ["Ward", "수양자녀", "義養子女"],
  foster: ["Foster child", "위탁자녀", "寄養子女"],
};
/* 옛 사례 파일의 의붓자녀는 그대로 그려지되 고르는 목록에는 두지 않는다 */
const LEGACY_LINKS = { step: ["Stepchild", "의붓자녀", "繼子女"] };
const LINK_DASH = { bio: null, adopt: "8 5", ward: "4 4", foster: "1.5 4", step: "8 4 1.5 4" };

/* 성별과는 별개 항목 — 사람 기호 안쪽 역삼각형 표지로 나타낸다. */
const ORIENTATIONS = {
  none: ["Not recorded", "기록 안 함", "未記錄"],
  hetero: ["Heterosexual", "이성애", "異性戀"],
  gay: ["Gay", "게이", "男同志"],
  lesbian: ["Lesbian", "레즈비언", "女同志"],
  bi: ["Bisexual", "양성애", "雙性戀"],
  ace: ["Asexual", "무성애", "無性戀"],
  pan: ["Pansexual", "범성애", "泛性戀"],
  queer: ["Queer or questioning", "퀴어·탐색 중", "酷兒・探索中"],
};
const PREG = {
  pregnancy: ["Pregnancy", "임신", "懷孕"],
  miscarriage: ["Miscarriage", "유산", "流產"],
  stillbirth: ["Stillbirth", "사산", "死產"],
  abortion: ["Induced abortion", "임신중절", "人工流產"],
};
const OBJ_KINDS = {
  affair: ["Affair partner", "외도 상대", "外遇對象"],
  pet: ["Pet", "반려동물", "寵物"],
  alcohol: ["Alcohol · drugs", "술·약물", "酒精・藥物"],
  work: ["Work", "일", "工作"],
  media: ["Screens · social media", "SNS·게임·TV", "社群・遊戲・電視"],
  religion: ["Religion", "종교", "宗教"],
  money: ["Money", "돈", "金錢"],
  other: ["Other", "기타", "其他"],
};

/* 다섯 갈래의 색.

   앞서 쓰던 색은 갈등(#C0392B)과 폭력(#87291A)이 둘 다 붉어서,
   선이 여럿 겹치면 어느 쪽인지 분간되지 않았다. 가장 무겁게 읽혀야
   할 갈래가 가장 헷갈리는 자리에 있었던 셈이다.

   이번에는 색상환에서 서로 떨어뜨리는 대신 밝기로 나눴다. 갈등은
   따뜻한 벽돌빛, 폭력은 거의 검은 적갈색이다. 흑백으로 인쇄해도
   두 선의 짙기가 다르므로 구별된다 — 강의 자료로 복사되는 일이
   많다는 것을 생각한 것. 전체적으로 채도를 낮춰 종이에 잉크로
   그은 선에 가깝게 했다. */
const BOND_CATS = {
  connect: { label: ["Connection", "연결", "連結"], color: "#2B7A62" },
  distance: { label: ["Distance · cut-off", "거리·단절", "疏離・斷絕"], color: "#7B8A99" },
  conflict: { label: ["Conflict", "갈등", "衝突"], color: "#B4553A" },
  abuse: { label: ["Violence · abuse", "폭력·학대", "暴力・虐待"], color: "#6B1F1B" },
  control: { label: ["Focus · control", "집중·통제", "專注・控制"], color: "#5F5189" },
};
/* 갈래 탭 줄은 다섯 개가 한 줄에 나란히 서야 하는 좁은 자리다. 영어는
   "Distance · cut-off", "Focus · control"처럼 길어서 상자 밖으로
   넘쳤다. 여기서만 짧은 이름을 쓴다 — 설명이 필요한 자리(범례, 안내
   문장)는 여전히 BOND_CATS.label의 온전한 이름을 쓴다. */
const BOND_CAT_TAB = {
  connect: ["Connect", "연결", "連結"],
  distance: ["Distance", "거리·단절", "疏離・斷絕"],
  conflict: ["Conflict", "갈등", "衝突"],
  abuse: ["Abuse", "폭력·학대", "暴力・虐待"],
  control: ["Control", "집중·통제", "專注・控制"],
};
const BOND_TYPES = {
  harmony: { label: ["Harmony", "무난한 관계", "平順關係"], cat: "connect", lines: 1 },
  close: { label: ["Close", "친근한 관계", "親近關係"], cat: "connect", lines: 2 },
  fused: { label: ["Fused", "융합 관계", "融合關係"], cat: "connect", lines: 3 },
  alliance: { label: ["Alliance", "동맹", "結盟"], cat: "connect", lines: 2, tie: true, tag: true },

  indifferent: { label: ["Indifferent", "빈약한 관계", "淡漠關係"], cat: "distance", lines: 1, dash: "1.5 4" },
  distant: { label: ["Distant", "소원한 관계", "疏遠關係"], cat: "distance", lines: 1, dash: "7 5" },
  cutoff: { label: ["Cut off", "단절", "斷絕"], cat: "distance", lines: 1, cut: true },
  neglect: { label: ["Neglect", "무관심", "忽視"], cat: "distance", wave: true, arrow: true, tag: true, dashZig: "4 3" },

  conflict: { label: ["Conflict", "갈등 관계", "衝突關係"], cat: "conflict", zig: true, amp: 7, seg: 9 },
  /* '애증 관계' — 가깝지만(융합) 상하는(갈등) 관계.
     예전에는 직선 세 가답 위에 서로 다른 마디로 돌아가는
     지그재그 하나를 겉쳤다. 두 지그재그가 따로 놀면서 서로
     엇갈려 직물을 짜듯 보였다 — 본래 뜻과 달리 직관적이지
     않았다. 이제는 두 줌이 같은 번개 경로를 나란히 함꾼 따라가게
     한다 — 한 쌍이 함께 지그재그지는 리본으로, 가깜운 두 사람
     사이의 관계가 함께 요동친다는 뜻이 한눈에 읽힌다. */
  fusedConflict: { label: ["Love–hate", "애증 관계", "愛恨關係"], cat: "conflict", zigLines: 2, amp: 5.5, seg: 12, tag: true },

  focus: { label: ["Intense focus", "집중된 관계", "專注關係"], cat: "control", wave: true, arrow: true, tag: true, legacy: true },
  obsession: { label: ["Obsession", "집착", "執迷"], cat: "control", wave: true, arrow: true, tag: true, w: 2.6, legacy: true },
  admirer: { label: ["Admirer", "흠모", "仰慕"], cat: "control", wave: true, arrow: true, tag: true, dashZig: "5 3", legacy: true },
  fanatic: { label: ["Fanatic attachment", "광적 애착", "狂熱依附"], cat: "control", wave: true, arrow: true, tag: true, twin: true, legacy: true },
  controlling: { label: ["Controlling", "통제", "控制"], cat: "control", wave: true, arrow: true, tag: true, amp: 3.5, legacy: true },
  manipulative: { label: ["Manipulative", "조종", "操縱"], cat: "control", wave: true, arrow: true, tag: true, amp: 3.5, seg: 12, legacy: true },
  /* 폭력·학대와 같은 이유로 여섯 가지를 한 줄기로 합친다 — 물결의
     진폭과 마디 차이로는 집착과 통제와 조종이 화면에서 구별되지
     않았다. 선은 하나, 그 위의 꼬리표가 무엇인지 말한다. */
  control: { label: ["Focus · control", "집중·통제", "專注・控制"], cat: "control", wave: true, arrow: true, kindField: "control" },

  physical: { label: ["Physical violence", "신체 폭력", "身體暴力"], cat: "abuse", wave: true, arrow: true, tag: true, w: 2.6, legacy: true },
  verbal: { label: ["Verbal violence", "언어 폭력", "言語暴力"], cat: "abuse", wave: true, arrow: true, tag: true, legacy: true },
  sexualAbuse: { label: ["Sexual violence", "성 폭력", "性暴力"], cat: "abuse", wave: true, arrow: true, tag: true, twin: true, legacy: true },
  abuseGen: { label: ["Abuse · blame", "학대 · 비난", "虐待・責難"], cat: "abuse", wave: true, arrow: true, tag: true, amp: 6, legacy: true },
  emotionalAbuse: { label: ["Emotional abuse", "정서적 학대", "情緒虐待"], cat: "abuse", wave: true, arrow: true, tag: true, dashZig: "5 3", legacy: true },
  otherViolence: { label: ["Other violence", "기타 폭력", "其他暴力"], cat: "abuse", wave: true, arrow: true, tag: true, amp: 3.5, legacy: true },
  /* 마다 다른 물결 모양으로 여섯 가지를 나누었던 것을 하나로 합친다.
     폭력과 집중·통제가 직접 비교되기 전에는 서로 구별하려는 시도였지만,
     물결의 진폭 차이는 화면에서 거의 읽히지 않았다. 선 모양으로 구별하는
     대신, 한 줄기로 통일하고 그 위에 폭력의 종류를 따로 붙인다 — 단기
     관계의 형태를 꼬리표로 붙였던 것과 같은 방식이다. 종류를 적으면 따로
     설명하지 않아도 무엇이 있었는지가 이미 쓰여 있다. */
  abuse: { label: ["Violence · abuse", "폭력·학대", "暴力・虐待"], cat: "abuse", wave: true, arrow: true, kindField: "abuse" },
};

/* '폭력·학대' 한 줄 위에 얹는 종류 꼬리표. 옛 여섯 유형의 이름을 그대로
   가져와, 전에 쓰던 말이 여기서도 똑같이 읽히게 한다. */
const VIOLENCE_KINDS = {
  physical: ["Physical", "신체", "身體"],
  verbal: ["Verbal", "언어", "言語"],
  sexual: ["Sexual", "성", "性"],
  blame: ["Blame", "비난", "責難"],
  emotional: ["Emotional", "정서", "情緒"],
  other: ["Other", "기타", "其他"],
};
/* 집중·통제 쪽 꼬리표 */
const CONTROL_KINDS = {
  focus: ["Focus", "집중", "專注"],
  obsession: ["Obsession", "집착", "執迷"],
  admirer: ["Admirer", "흠모", "仰慕"],
  fanatic: ["Fanatic", "광적 애착", "狂熱"],
  controlling: ["Controlling", "통제", "控制"],
  manipulative: ["Manipulative", "조종", "操縱"],
};
/* 유형이 어떤 꼬리표 목록을 쓰는지 */
const KIND_SETS = { abuse: VIOLENCE_KINDS, control: CONTROL_KINDS };
const kindsOf = (meta) => (meta && meta.kindField ? KIND_SETS[meta.kindField] : null);
const bondColor = (t) => (BOND_TYPES[t] || BOND_TYPES.harmony).col || BOND_CATS[(BOND_TYPES[t] || BOND_TYPES.harmony).cat].color;

/* ── 관계의 시기별 변화 (segments) ─────────────────────────────
   기존 문서(단일 type/from/to/note)와 호환하면서, 관계 유형이
   시간에 따라 바뀐 경우 여러 구간으로 나눠 기록할 수 있게 한다. */
function bondSegments(bond) {
  if (bond.segments && bond.segments.length) return bond.segments;
  return [{ id: "s0", type: bond.type || "harmony", from: bond.from || "", to: bond.to || "", note: bond.note || "" }];
}
function sortedSegments(bond) {
  /* 연도를 적은 구간끼리만 연도순으로 세우고, 연도 없는 구간은 적어 넣은
     자리를 지킨다. 예전에는 연도 없는 구간을 무조건 맨 앞으로 보냈다.
     그러면 연도가 적힌 선 뒤에 새로 붙인 선(아직 연도를 모르는)이 '가장
     오래된 선'으로 뒤바뀌어 버린다. */
  const list = bondSegments(bond).slice();
  const slots = [];
  list.forEach((sg, i) => { if (Number(sg.from)) slots.push(i); });
  const ordered = slots.map((i) => list[i]).sort((a, b) => Number(a.from) - Number(b.from));
  slots.forEach((i, k) => { list[i] = ordered[k]; });
  return list;
}
function currentSegment(bond) {
  const segs = sortedSegments(bond);
  return segs[segs.length - 1];
}
/* ── 같은 두 사람 사이에 따로 그어진 관계선 합치기 ─────────────────────
   예전에는 같은 두 사람에게 선을 또 그으면 독립된 관계선이 하나 더 생겨 겹쳐 보였다.
   지금은 새로 그으면 '관계 변화'로 이어 붙지만, 그 전에 저장한 사례에는 겹친 선이 남아
   있다. 이것을 한 관계선의 여러 구간으로 합친다.
   - 남는 관계선은 그중 먼저 만든 것. 구간은 만든 순서로 잇고, 연도가 있으면 그 순서로 선다.
   - 방향이 반대로 그어진 화살표 선은 그 구간만 rev로 뒤집어 방향을 지킨다.
   - 완전히 같은 구간(유형·종류·기간·메모가 같음)은 하나만 남긴다.
   - 관계선에 붙여 둔 메모 연결과 타임라인에서 옮겨 둔 이름표 자리도 새 관계선으로 옮긴다. */
function duplicateBondGroups(doc) {
  const by = new Map();
  (doc.bonds || []).forEach((b) => {
    const k = [b.a, b.b].sort().join("|");
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(b);
  });
  return [...by.values()].filter((g) => g.length > 1);
}
function mergeDuplicateBonds(doc, onlyBondId = null) {
  const groups = duplicateBondGroups(doc).filter((g) => !onlyBondId || g.some((b) => b.id === onlyBondId));
  if (!groups.length) return { doc, pairs: 0, dropped: 0, removed: new Map() };
  const removed = new Map();     // 없어지는 관계선 id → 남는 관계선 id
  const merged = new Map();      // 남는 관계선 id → 합친 관계선
  const segMap = new Map();      // `${옛 관계선 id}:${옛 구간 id}` → 새 구간 id
  let dropped = 0;
  groups.forEach((g) => {
    const prim = g[0], used = new Set(), out = [];
    g.forEach((b) => {
      const flip = b.a !== prim.a;
      bondSegments(b).forEach((sg) => {
        const meta = BOND_TYPES[sg.type] || BOND_TYPES.harmony;
        const rev = !!meta.arrow && (flip !== !!sg.rev);
        const sig = [sg.type, sg.kind || "", sg.from || "", sg.to || "", sg.note || "", rev].join("\u0001");
        const same = out.find((o) => o.sig === sig);
        if (same) { dropped++; segMap.set(`${b.id}:${sg.id}`, same.seg.id); return; }
        /* 예전 형식의 구간은 모두 id가 's0'이라 겹친다 — 겹치면 새 id를 준다 */
        const id = !sg.id || used.has(sg.id) ? uid() : sg.id;
        used.add(id);
        const seg = { ...sg, id };
        if (rev) seg.rev = true; else delete seg.rev;
        out.push({ sig, seg });
        if (id !== sg.id || b.id !== prim.id) segMap.set(`${b.id}:${sg.id}`, id);
      });
      if (b.id !== prim.id) removed.set(b.id, prim.id);
    });
    merged.set(prim.id, { ...prim, segments: out.map((o) => o.seg) });
  });
  const fixAnchor = (a) => {
    if (!a || a.kind !== "bond" || !(removed.has(a.id) || merged.has(a.id))) return a;
    const seg = segMap.get(`${a.id}:${a.seg}`) || a.seg;
    return { ...a, id: removed.get(a.id) || a.id, seg };
  };
  const notes = (doc.notes || []).map((n) => ({
    ...n,
    ...(n.anchor ? { anchor: fixAnchor(n.anchor) } : {}),
    ...(n.anchors ? { anchors: n.anchors.map(fixAnchor) } : {}),
  }));
  const tlgPos = {};
  Object.entries(doc.tlgPos || {}).forEach(([k, v]) => {
    const bid = [...removed.keys(), ...merged.keys()].find((x) => k.startsWith(`t:${x}:`));
    if (!bid) { tlgPos[k] = v; return; }
    const sid = k.slice(`t:${bid}:`.length);
    const nk = `t:${removed.get(bid) || bid}:${segMap.get(`${bid}:${sid}`) || sid}`;
    if (!(nk in tlgPos)) tlgPos[nk] = v;
  });
  const bonds = doc.bonds.filter((b) => !removed.has(b.id)).map((b) => merged.get(b.id) || b);
  return { doc: { ...doc, bonds, notes, tlgPos }, pairs: groups.length, dropped, removed };
}
/* 한 관계선(구간)의 기호를 그리는 공통 그리기 함수 — 표준 보기와
   타임라인 보기 양쪽에서 재사용한다. */
function bondGlyphParts(meta, p1, p2, col, keyPrefix = "", bow = 0, pillText = "") {
  const parts = [];
  // The wavy body ends at the neck; a straight stem meets the open tip exactly.
  const arrow = arrowGeometry(p1, p2, bow);
  const aEnd = meta.arrow ? arrow.neck : p2;
  if (meta.lines) {
    const offs = meta.lines === 1 ? [0] : meta.lines === 2 ? [-2.7, 2.7] : [-4.8, 0, 4.8];
    offs.forEach((o, i) => parts.push(<path key={keyPrefix + "l" + i} d={offsetPath(p1, p2, o, bow)} stroke={col} strokeWidth={1.6}
      strokeDasharray={meta.dash || undefined} fill="none" strokeLinecap="round" />));
  }
  if (meta.wave) {
    // Keep the wavy body separate from the straight arrow stem.
    const wdx = aEnd.x - p1.x, wdy = aEnd.y - p1.y, wL = Math.hypot(wdx, wdy) || 1;
    const wnx = -wdy / wL, wny = wdx / wL;
    (meta.twin ? [-3, 3] : [0]).forEach((o, i) => parts.push(
      <path key={keyPrefix + "w" + i}
        d={wavePath({ x: p1.x + wnx * o, y: p1.y + wny * o }, { x: aEnd.x + wnx * o, y: aEnd.y + wny * o }, meta.amp || 5, meta.seg || 17, bow)}
        stroke={col} strokeWidth={meta.w || 2} strokeDasharray={meta.dashZig || undefined} fill="none" strokeLinecap="round" />));
    if(meta.arrow&&meta.twin)parts.push(<path key={keyPrefix+"join"} d={`M ${aEnd.x-wnx*3} ${aEnd.y-wny*3} L ${aEnd.x} ${aEnd.y} L ${aEnd.x+wnx*3} ${aEnd.y+wny*3}`} fill="none" stroke={col} strokeWidth={meta.w||2} strokeLinecap="round"/>);
    /* 출발점에는 작은 점 하나 — 이 선이 어디서 시작되는지를 분명히
       한다. 도착점에는 화살촉이 있으니, 시작점에도 그에 대응하는
       표시가 있어야 손그림 규칙과 맞는다. */
    if (meta.arrow) parts.push(<circle key={keyPrefix + "sd"} cx={p1.x} cy={p1.y} r={2.6} fill={col} />);
  }
  if (meta.zig) parts.push(<path key={keyPrefix + "z"} d={zigzagPath(p1, aEnd, meta.amp || 6, meta.seg || 10, 0, bow)} stroke={col}
    strokeWidth={meta.w || 1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />);
  if (meta.zigLines) {
    /* 지그재그 여러 줄이 같은 위상으로 나란히 달린다 — zigzagPath의
       off 파라미터로 전체를 향으로 밀어 같이 움직이게
       한다. 각자 따로 지그재그지면 서로 엇갈려 직물을
       직는 그물이 되는데, 같이 움직이면 한 쌍이 함께 요동치는
       리본으로 읽힌다. */
    const gap = 3.6, n2 = meta.zigLines;
    const offs = Array.from({ length: n2 }, (_, k) => (k - (n2 - 1) / 2) * gap);
    offs.forEach((o, i) => parts.push(
      <path key={keyPrefix + "zl" + i} d={zigzagPath(p1, aEnd, meta.amp || 6, meta.seg || 10, o, bow)} stroke={col}
        strokeWidth={meta.w || 1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />));
  }
  if (meta.tie) {
    const bm = bowMid(p1, p2, bow); const mx = bm.x, my = bm.y;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    parts.push(<line key={keyPrefix + "t"} x1={mx + nx * 8} y1={my + ny * 8} x2={mx - nx * 8} y2={my - ny * 8} stroke={col} strokeWidth={2.4} strokeLinecap="round" />);
    parts.push(<circle key={keyPrefix + "td"} cx={mx} cy={my} r={3.4} fill="#fff" stroke={col} strokeWidth={2} />);
  }
  if (meta.cut) {
    const bm = bowMid(p1, p2, bow); const mx = bm.x, my = bm.y;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    [-3.5, 3.5].forEach((o, i) => parts.push(<line key={keyPrefix + "c" + i} x1={mx + ux * o + nx * 6.5} y1={my + uy * o + ny * 6.5}
      x2={mx + ux * o - nx * 6.5} y2={my + uy * o - ny * 6.5} stroke={col} strokeWidth={2.2} strokeLinecap="round" />));
  }
  if (meta.arrow) {
    parts.push(<path key={keyPrefix + "stem"} d={`M ${aEnd.x} ${aEnd.y} L ${p2.x} ${p2.y}`}
      stroke={col} strokeWidth={meta.w || 2} fill="none" strokeLinecap="round" />);
    parts.push(<path key={keyPrefix + "a"} d={arrow.head}
      fill="none" stroke={col} strokeWidth={meta.w || 2} strokeLinecap="round" strokeLinejoin="round" />);
  }
  if (pillText) {
    /* 한 줄로 통일한 폭력·학대 선 위에, 그 폭력이 어떤 종류였는지
       작은 흰 꼬리표로 붙인다 — 결혼선의 SSM 표시와 같은 자리, 같은
       모양이다. */
    const mid = bowMid(p1, p2, bow);
    const pw = Math.max(24, pillText.length * 6.4 + 12);
    parts.push(<g key={keyPrefix + "pill"} transform={`translate(${mid.x},${mid.y})`}>
      <rect x={-pw / 2} y={-8.5} width={pw} height={14} rx={7} fill="#fff" stroke={col} strokeWidth={1} />
      <text y={3} textAnchor="middle" fontSize={9} fontFamily={FB} fontWeight={700} fill={col}>{pillText}</text>
    </g>);
  }
  return parts;
}


const HH_COLORS = ["#3A6E93", "#A8412C", "#63836F", "#9C7228", "#6A5A93", "#0F766E"];
const TRI_COLOR = "#6A5A93";
/* 척도 칩 색 — 자아분화부터 순서대로 */
const CHIP_COLORS = ["#2E6B9C","#2B7A5C","#9C6A1A","#6A5A93","#A8412C","#0F766E"];
/* 현장 척도는 이름이 있어야 앱에 나타난다. 공백만 적은 것도 빈 칸으로 본다. */
const scaleName = (L) => (L && L.name ? String(L.name).trim() : "");
/* 분화·척도 안내 상자 */
const HINT_NOTE = { fontSize: 10.5, lineHeight: 1.55, color: T.mute, fontFamily: FB, padding: "7px 10px",
  background: "rgba(22,32,42,.035)", borderRadius: 8 };
const TRI_COLORS = ["#6A5A93","#2B7A5C","#A8412C","#2E6B9C","#9C6A1A","#55647A"];
const TRI_TYPES = [
  ["Child drawn into the couple's conflict", "부부 갈등에 자녀가 끼어듦", "子女被捲入夫妻衝突"],
  ["Cross-generational coalition", "세대 간 연합", "跨世代聯盟"],
  ["Scapegoat", "희생양", "代罪羔羊"],
  ["Emotional surrogate", "감정적 대리인", "情緒代理人"],
  ["In-law triangle", "시어머니–며느리", "婆媳三角"],
  ["Affair", "외도 삼각관계", "外遇三角"],
  ["Alcohol · addiction", "술·중독과 삼각관계", "酒精・成癮三角"],
  ["Work · social media", "일·SNS와 삼각관계", "工作・社群三角"],
  ["Pet", "반려동물과 삼각관계", "寵物三角"],
  ["Between siblings", "형제 간 삼각관계", "手足三角"],
  ["Other", "기타", "其他"],
];

const CTX_VERT = [
  ["Poverty, politics", "가난·정치적 압력", "貧窮・政治壓力"],
  ["Racism, sexism, classism", "인종·성·계층 차별", "種族・性別・階級歧視"],
  ["Violence, addictions", "폭력·중독", "暴力・成癮"],
  ["Family emotional patterns", "가족 정서 패턴", "家庭情緒模式"],
  ["Myths, triangles, secrets", "신화·삼각관계·비밀", "神話・三角關係・秘密"],
  ["Legacies, abilities and disabilities", "유산·유전적 강점과 취약성", "傳承・遺傳優勢與脆弱"],
  ["Religious beliefs and practices", "종교적 신념과 관습", "宗教信念與實踐"],
];
const CTX_HORIZ = [
  ["Life-cycle transitions", "생애주기 전환", "生命週期轉換"],
  ["Accidents, illness", "사고·질병", "意外・疾病"],
  ["Migration", "이주", "遷徙"],
  ["Natural disasters", "자연재해", "天災"],
  ["Chronic illness", "만성질환", "慢性疾病"],
  ["Economics, unemployment", "경제·실직", "經濟・失業"],
  ["Historical events", "역사적 사건", "歷史事件"],
];
const CTX_RINGS = [
  ["Self · spiritual", "자기·영성", "自我・靈性"],
  ["Mind", "마음", "心智"],
  ["Family", "가족", "家庭"],
  ["Extended family", "확대가족", "延伸家庭"],
  ["Friends · community", "친구·공동체", "朋友・社群"],
  ["Larger society", "사회", "社會"],
  ["Culture", "문화", "文化"],
];
const EVENT_TYPES = {
  birth: { label: ["Birth", "출생", "出生"], color: "#3F7D5A" },
  death: { label: ["Death", "사망", "死亡"], color: "#16202A" },
  marriage: { label: ["Marriage", "결혼", "結婚"], color: "#3A6E93" },
  divorce: { label: ["Divorce · separation", "이혼·별거", "離婚・分居"], color: "#A8412C" },
  move: { label: ["Migration · move", "이주·이사", "遷徙・搬遷"], color: "#9C7228" },
  illness: { label: ["Illness · accident", "질병·사고", "疾病・意外"], color: "#87291A" },
  work: { label: ["Work · money", "직업·경제", "工作・經濟"], color: "#6A5A93" },
  other: { label: ["Other", "기타", "其他"], color: "#6B7A85" },
};
const TRANSITION_COLORS = ["#9C7228", "#6A5A93", "#3A6E93", "#A8412C", "#2E7D5B", "#0F766E"];

/* ══ geometry ═══════════════════════════════════════════════════ */
const rOf = (p) => (p.gender === "object" ? 26 : p.gender === "female" ? 28 : 27);
function edgePt(a, b, pad) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / L) * pad, y: a.y + (dy / L) * pad };
}
/* edgePt는 사람을 반지름 rOf(p)짜리 동그라미로 어림잡는다. 동그라미로
   여자(원)는 맞지만, 남자(정사각형, 반변 26)는 대각선 방향으로 갈수록
   실제 모서리가 그 동그라미보다 훨씬 멀리 있다 — 45도 방향이면 원보다
   10px 넘게 더 나간다. 그 차이만큼 화살촉이 사각형 안쪽으로 파고들어
   기호에 가려 반만 보이는 문제가 생겼다. 방향에 따라 정확한 경계를
   구하는 쪽을 따로 둔다. */
function edgePtShape(a, b, extra = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  let base;
  if (a.gender === "female") base = 27;
  else if (a.gender === "male") base = 26 / Math.max(Math.abs(ux), Math.abs(uy), 1e-4);
  else base = 30 / Math.max(Math.abs(ux) + Math.abs(uy), 1e-4);
  const pad = base + extra;
  return { x: a.x + ux * pad, y: a.y + uy * pad };
}
/* bow — 두 사람 사이를 곧은 선이 아니라 활처럼 휘어 잇게 하는 값.
   가운데에서 법선 방향으로 bow만큼 부풀린 이차곡선으로 본다.
   형제처럼 한 줄에 나란히 앉은 사이를 이을 때, 곧은 선은 사이에 있는
   사람을 그대로 관통한다. 그럴 때 이 값으로 비켜 지나가게 한다. */
function bowMid(p1, p2, bow) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  return { x: (p1.x + p2.x) / 2 + nx * bow, y: (p1.y + p2.y) / 2 + ny * bow };
}
/* 곡선 위 매개변수 s(0~1) 자리의 점. bow가 0이면 곧은 선과 같다. */
function bowPt(p1, p2, bow, s) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const b = bow * 4 * s * (1 - s);
  return { x: p1.x + dx * s + nx * b, y: p1.y + dy * s + ny * b };
}
function offsetPath(p1, p2, off, bow = 0) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const a = { x: p1.x + nx * off, y: p1.y + ny * off };
  const b = { x: p2.x + nx * off, y: p2.y + ny * off };
  if (!bow) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const c = { x: (a.x + b.x) / 2 + nx * bow * 2, y: (a.y + b.y) / 2 + ny * bow * 2 };
  return `M ${a.x} ${a.y} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x} ${b.y}`;
}
function zigzagPath(p1, p2, amp = 6, seg = 13, off = 0, bow = 0) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const n = Math.max(4, Math.round(L / seg));
  const at = (i) => {
    const b = bowPt(p1, p2, bow, i / n);
    const s = (i === 0 || i === n ? 0 : (i % 2 ? amp : -amp)) + off;
    return `${(b.x + nx * s).toFixed(1)} ${(b.y + ny * s).toFixed(1)}`;
  };
  let d = `M ${at(0)}`;
  for (let i = 1; i <= n; i++) d += ` L ${at(i)}`;
  return d;
}
function wavePath(p1, p2, amp = 5, seg = 18, bow = 0) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const n = Math.max(2, Math.round(L / seg));
  let d = `M ${p1.x} ${p1.y}`;
  for (let i = 1; i <= n; i++) {
    const e = bowPt(p1, p2, bow, i / n), m = bowPt(p1, p2, bow, (i - 0.5) / n);
    const sgn = (i % 2 ? 1 : -1) * amp;
    d += ` Q ${(m.x + nx * sgn).toFixed(1)} ${(m.y + ny * sgn).toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }
  return d;
}

function ladderPath(p1, p2, gap = 3.4, step = 6) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  let d = `M ${p1.x + nx * gap} ${p1.y + ny * gap} L ${p2.x + nx * gap} ${p2.y + ny * gap}`;
  d += ` M ${p1.x - nx * gap} ${p1.y - ny * gap} L ${p2.x - nx * gap} ${p2.y - ny * gap}`;
  const n = Math.max(2, Math.floor(L / step));
  for (let i = 1; i < n; i++) {
    const t = (i / n) * L, x = p1.x + ux * t, y = p1.y + uy * t;
    d += ` M ${(x + nx * gap).toFixed(1)} ${(y + ny * gap).toFixed(1)} L ${(x - nx * gap).toFixed(1)} ${(y - ny * gap).toFixed(1)}`;
  }
  return d;
}

/* 태국어·크메르어는 낱말 사이에 띄어쓰기가 없고, 모음·성조 부호가 앞 글자에 붙어 있다.
   글자 수(UTF-16 단위)로 자르면 부호가 글자에서 떨어져 나가므로 '글자 조각(grapheme)' 단위로 세고,
   가능하면 낱말 경계에서 줄을 바꾼다. */
const TK_RE = /[\u0E00-\u0E7F\u1780-\u17FF]/;
let _segs = null;
const segs = () => _segs || (_segs = (() => {
  try { return typeof Intl !== "undefined" && Intl.Segmenter ? { g: new Intl.Segmenter(undefined, { granularity: "grapheme" }), w: new Intl.Segmenter("th", { granularity: "word" }) } : {}; }
  catch { return {}; }
})());
function graphemes(str) {
  const sg = segs();
  if (sg.g) return Array.from(sg.g.segment(str), (x) => x.segment);
  const out = [];                                                    // Intl.Segmenter가 없는 옛 브라우저: 부호를 앞 글자에 붙인다
  for (const ch of String(str)) {
    const prev = out[out.length - 1];
    if (prev && (/^\p{M}$/u.test(ch) || ch === "\u0E33" || prev.endsWith("\u17D2"))) out[out.length - 1] = prev + ch; else out.push(ch);
  }
  return out;
}
function wrapTK(t, n) {
  const sg = segs();
  const words = sg.w ? Array.from(sg.w.segment(t), (x) => x.segment) : t.split(/(\s+)/);
  const out = []; let line = "", len = 0;
  const flush = () => { const x = line.trim(); if (x) out.push(x); line = ""; len = 0; };
  words.forEach((w) => {
    if (!w) return;
    if (/^\s+$/.test(w)) { if (line) { line += " "; len += 1; } return; }          // 줄 머리의 공백은 버린다
    const g = graphemes(w);
    if (/^\p{P}+$/u.test(w)) { line += w; len += g.length; return; }                // 문장부호는 앞 낱말에 붙여 둔다
    if (len + g.length > n && line) flush();
    if (g.length > n) {                                               // 낱말 하나가 한 줄보다 길면 글자 조각 단위로 자른다
      for (let i = 0; i < g.length; i += n) {
        const piece = g.slice(i, i + n).join("");
        if (i + n < g.length) out.push(piece); else { line = piece; len = g.length - i; }
      }
    } else { line += w; len += g.length; }
  });
  flush();
  return out;
}
function wrapText(s, n) {
  if (!s) return [];
  const out = [];
  String(s).replace(/\u200B/g, "").split("\n").forEach((raw) => {          // 덧붙인 번역의 보이지 않는 표지는 길이에 넣지 않는다
    let t = raw.trim(); if (!t) return;
    if (TK_RE.test(t)) { out.push(...wrapTK(t, n)); return; }
    if (/\s/.test(t) && /[A-Za-z]/.test(t)) {
      let line = "";
      t.split(/\s+/).forEach((w) => {
        if ((line + " " + w).trim().length > n) { if (line) out.push(line); line = w; }
        else line = (line ? line + " " : "") + w;
      });
      if (line) out.push(line);
    } else {
      while (t.length > n) { out.push(t.slice(0, n)); t = t.slice(n); }
      if (t) out.push(t);
    }
  });
  return out;
}
function hullPoints(members, pad, samples = 28) {
  const pts = [];
  members.forEach((p) => {
    const r = rOf(p) + pad;
    for (let i = 0; i < samples; i++) {
      const a = (2 * Math.PI * i) / samples;
      pts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
    }
  });
  pts.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const ptsToPath = (h) => "M " + h.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ") + " Z";
function hullPath(members, pad, samples = 28) {
  const h = hullPoints(members, pad, samples);
  return h.length ? ptsToPath(h) : "";
}

/* ── 가구 윤곽 — 가구에 속하지 않은 사람은 비켜 간다 ───────────────────────────
   윤곽은 구성원들을 감싸는 볼록한 둘레(hull)다. 그런데 손자가 할머니와 함께 살았고 그
   사이에 함께 살지 않은 어머니가 있으면, 볼록한 둘레는 어머니까지 삼켜 버린다. 어머니는
   가구 밖이므로 윤곽 밖에 놓여야 한다.
   방법: 둘레 안쪽(또는 가장자리)에 걸린 사람마다, 그 사람에게서 바깥으로 이어지는
   '틈'을 하나 낸다(짧게 나갈 수 있고 구성원·다른 사람을 덜 건드리는 방향으로).
   틈을 뺀 나머지 영역의 경계를 격자로 훑어 따라 그린다(marching squares).
   둘레에 걸린 사람이 없으면 예전 윤곽 그대로 돌려준다. */
function householdPath(members, others, pad) {
  const H = hullPoints(members, pad);
  if (!H.length) return "";
  const plain = ptsToPath(H);
  if (!others || !others.length) return plain;
  const GAP = 5;                                   // 사람 기호와 윤곽 사이 여유
  const segDist = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const inHull = (p) => {
    let c = false;
    for (let i = 0, j = H.length - 1; i < H.length; j = i++) {
      const a = H[i], b = H[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  const edgeDist = (p) => { let m = Infinity; for (let i = 0; i < H.length; i++) m = Math.min(m, segDist(p, H[i], H[(i + 1) % H.length])); return m; };
  const rex = (o) => rOf(o) + GAP;
  const intr = others.filter((o) => inHull(o) || edgeDist(o) < rex(o));
  if (!intr.length) return plain;

  /* 틈: 사람에게서 16방향 중 하나로 윤곽 바깥까지. 짧을수록, 구성원 기호를 자르지 않을수록 좋다.
     같은 점수면 아래 → 위 → 오른쪽 → 왼쪽 순. */
  const DIRS = [90, 270, 0, 180, 45, 135, 225, 315, 67.5, 112.5, 247.5, 292.5, 22.5, 157.5, 202.5, 337.5];
  const channels = intr.map((o) => {
    const R = rex(o);
    let best = null;
    DIRS.forEach((deg, rank) => {
      const ux = Math.cos((deg * Math.PI) / 180), uy = Math.sin((deg * Math.PI) / 180);
      let len = 0;
      for (; len < 700; len += 6) {
        const q = { x: o.x + ux * len, y: o.y + uy * len };
        if (!inHull(q) && edgeDist(q) > R + 2) break;
      }
      const b = { x: o.x + ux * len, y: o.y + uy * len };
      let score = len + rank * 0.5;
      members.forEach((m) => { if (segDist(m, o, b) < rOf(m) + R + 2) score += 1e4; });
      others.forEach((q) => { if (q !== o && segDist(q, o, b) < rOf(q) + R) score += 150; });
      if (!best || score < best.score) best = { a: o, b, R, score };
    });
    return best;
  });
  const sdC = (q) => { let m = Infinity; channels.forEach((c) => { m = Math.min(m, segDist(q, c.a, c.b) - c.R); }); return m; };
  const field = (q) => Math.max(inHull(q) ? -edgeDist(q) : edgeDist(q), -sdC(q));   // 음수 = 윤곽 안

  const S = 5;
  const xs = H.map((q) => q.x), ys = H.map((q) => q.y);
  const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10;
  const nx = Math.ceil((Math.max(...xs) + 10 - x0) / S) + 1, ny = Math.ceil((Math.max(...ys) + 10 - y0) / S) + 1;
  if (nx * ny > 90000) return plain;               // 너무 큰 가구는 예전 윤곽으로(계산 보호)
  const F = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[j * nx + i] = field({ x: x0 + i * S, y: y0 + j * S });
  const V = (i, j) => F[j * nx + i];
  const pt = new Map(), segs = [];
  const edgePt = (kind, i, j) => {           // h: (i,j)-(i+1,j), v: (i,j)-(i,j+1)
    const id = kind + i + "," + j;
    if (!pt.has(id)) {
      const a = V(i, j), b = kind === "h" ? V(i + 1, j) : V(i, j + 1);
      const t = a / (a - b || 1e-9);
      pt.set(id, kind === "h" ? { x: x0 + (i + t) * S, y: y0 + j * S } : { x: x0 + i * S, y: y0 + (j + t) * S });
    }
    return id;
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const tl = V(i, j) < 0, tr = V(i + 1, j) < 0, br = V(i + 1, j + 1) < 0, bl = V(i, j + 1) < 0;
    const code = (tl ? 1 : 0) | (tr ? 2 : 0) | (br ? 4 : 0) | (bl ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const T = () => edgePt("h", i, j), B = () => edgePt("h", i, j + 1), L = () => edgePt("v", i, j), R2 = () => edgePt("v", i + 1, j);
    const add = (a, b) => segs.push([a(), b()]);
    switch (code) {
      case 1: case 14: add(L, T); break;
      case 2: case 13: add(T, R2); break;
      case 3: case 12: add(L, R2); break;
      case 4: case 11: add(R2, B); break;
      case 6: case 9: add(T, B); break;
      case 7: case 8: add(L, B); break;
      case 5: case 10: {
        const inCenter = (V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1)) / 4 < 0;
        const tlbr = code === 5;
        if (tlbr === inCenter) { add(T, R2); add(L, B); } else { add(L, T); add(R2, B); }
        break;
      }
      default: break;
    }
  }
  if (!segs.length) return plain;
  const at = new Map();
  segs.forEach((sg, k) => sg.forEach((e) => { if (!at.has(e)) at.set(e, []); at.get(e).push(k); }));
  const used = new Array(segs.length).fill(false);
  const loops = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = true;
    const loop = [pt.get(segs[k][0])];
    let cur = segs[k][1], guard = 0;
    while (guard++ < segs.length + 2) {
      loop.push(pt.get(cur));
      const nextK = (at.get(cur) || []).find((q) => !used[q]);
      if (nextK === undefined) break;
      used[nextK] = true;
      cur = segs[nextK][0] === cur ? segs[nextK][1] : segs[nextK][0];
    }
    if (loop.length > 6) loops.push(loop);
  }
  return loops.length ? loops.map(ptsToPath).join(" ") : plain;
}

function computeGens(people, unions) {
  const gen = {}; people.forEach((p) => (gen[p.id] = 0));
  const uMap = Object.fromEntries(unions.map((u) => [u.id, u]));
  for (let i = 0; i < 15; i++) {
    let ch = false;
    people.forEach((p) => {
      const u = p.puid ? uMap[p.puid] : null;
      if (u) { const g = Math.max(gen[u.a] ?? 0, gen[u.b] ?? 0) + 1; if (g !== gen[p.id]) { gen[p.id] = g; ch = true; } }
    });
    unions.forEach((u) => {
      const g = Math.max(gen[u.a] ?? 0, gen[u.b] ?? 0);
      if (gen[u.a] !== g) { gen[u.a] = g; ch = true; }
      if (gen[u.b] !== g) { gen[u.b] = g; ch = true; }
    });
    if (!ch) break;
  }
  return gen;
}
function autoArrange(doc) {
  const gen = computeGens(doc.people, doc.unions);
  const byId = Object.fromEntries(doc.people.map((p) => [p.id, p]));
  const uMap = Object.fromEntries(doc.unions.map((u) => [u.id, u]));
  const maxGen = Math.max(0, ...Object.values(gen));
  const pos = {};
  for (let g = 0; g <= maxGen; g++) {
    const members = doc.people.filter((p) => gen[p.id] === g);
    const used = new Set(), blocks = [];
    members.forEach((p) => {
      if (used.has(p.id)) return;
      const partners = doc.unions.filter((u) => u.a === p.id || u.b === p.id)
        .map((u) => byId[u.a === p.id ? u.b : u.a])
        .filter((q) => q && gen[q.id] === g && !used.has(q.id) && q.id !== p.id);
      if (!partners.length) { blocks.push([p]); used.add(p.id); return; }
      const blk = p.gender !== "female" ? [p, ...partners] : [...partners.slice().reverse(), p];
      blk.forEach((x) => used.add(x.id)); blocks.push(blk);
    });
    const key = (blk) => {
      const ks = blk.map((p) => {
        const u = p.puid ? uMap[p.puid] : null;
        if (u && pos[u.a] && pos[u.b]) return (pos[u.a].x + pos[u.b].x) / 2;
        return p.x ?? 0;
      });
      return ks.reduce((s, v) => s + v, 0) / ks.length;
    };
    blocks.sort((m, n) => key(m) - key(n));
    let cur = 0;
    blocks.forEach((blk) => { blk.forEach((p, i) => { pos[p.id] = { x: cur + i * COL_W, y: g * GEN_H }; }); cur += blk.length * COL_W + 60; });
    const width = cur - 60;
    blocks.forEach((blk) => blk.forEach((p) => { pos[p.id].x -= width / 2; }));
  }
  let nd = { ...doc, people: doc.people.map((p) => (pos[p.id] ? { ...p, ...pos[p.id] } : p)) };
  doc.unions.forEach((u) => { nd = centerKids(nd, u.id); });
  return nd;
}
/* 자녀 자리 잡기.

   두 가지를 함께 지켜야 한다. 자녀는 부모 부부선 안쪽에 모여 있어야
   읽기 좋고, 동시에 기호끼리 절대 겹쳐서는 안 된다. 예전에는 최소
   간격이 52px였는데 기호 지름이 54~56px이라 자녀가 셋만 되어도 서로
   포개졌다. 또 자녀에게 배우자가 있으면 자녀만 옮기고 배우자는 그대로
   두어 둘이 겹쳐 버렸다.

   그래서 자녀 한 명이 아니라 '자녀 + 그 배우자'를 한 덩어리로 보고
   덩어리마다 필요한 폭을 따로 계산한다. 부모 span 안에 넣으려 하되,
   넣으면 겹치는 경우에는 span을 넘기더라도 겹치지 않는 쪽을 택한다. */
const KID_W = 72;          // 자녀 한 명이 차지하는 최소 폭 (기호 56 + 여백)
/* 한 줄에서 두 기호의 중심 사이 최소 거리.
   동그라미 반지름 28, 네모 반너비 30이므로 60이면 서로 닿는다.
   닿기 직전이 아니라 눈에 띄게 떨어지도록 여유를 둔다. */
const MIN_PITCH = 78;
const KID_GAP = 16;        // 덩어리 사이 간격
const SPOUSE_DX = 104;     // 자녀와 그 배우자 사이 거리

/* 결혼으로 들어온 배우자들 — 자기 부모 밑에 자리를 가진 사람은 뺀다.
   결혼한 차례대로(등록 순서) 돌려준다. */
function spousesOf(d, k) {
  return d.unions
    .filter((x) => x.a === k.id || x.b === k.id)
    .map((x) => d.people.find((p) => p.id === (x.a === k.id ? x.b : x.a)))
    .filter((sp) => sp && !sp.puid);
}

function centerKids(d, unionId) {
  const u = d.unions.find((x) => x.id === unionId); if (!u) return d;
  const a = d.people.find((p) => p.id === u.a), b = d.people.find((p) => p.id === u.b);
  if (!a || !b) return d;
  const lx = Math.min(a.x, b.x), rx = Math.max(a.x, b.x);
  const mid = (lx + rx) / 2, span = rx - lx;
  const baseY = Math.max(a.y, b.y) + GEN_H;
  const kids = d.people.filter((p) => p.puid === unionId).slice().sort((m, n) => {
    const my = m.birth ? +m.birth : null, ny = n.birth ? +n.birth : null;
    if (my && ny && my !== ny) return my - ny;
    if (my && !ny) return -1;
    if (!my && ny) return 1;
    return m.x - n.x;
  });
  const n = kids.length; if (!n) return d;

  /* 자녀마다 배우자가 몇인지 보고 덩어리 폭을 정한다.

     한 명만 세면 재혼한 자녀의 두 번째·세 번째 배우자가 옆 형제
     위에 얹힌다. 이혼과 재혼이 드물지 않으므로 모두 센다.

     배우자가 자기 부모 밑에 이미 자리를 가진 사람(puid가 있는
     사람)이면 건드리지 않는다. 그런 배우자를 함께 옮기면, 그 사람이
     자기 부모에게서 떨어져 나와 배우자 쪽 집안으로 딸려간다.

     손으로 옮긴 자녀도 셈에는 넣는다. 자리를 비워 두지 않으면 나머지
     자녀들이 그 자리로 밀려 들어가 겹친다. 계산에는 넣되, 실제로
     옮기지는 않는다 — 아래 return의 !p.fixed가 그 일을 한다. */
  const blocks = kids.map((k) => {
    const spouses = spousesOf(d, k);
    return { kid: k, spouses, w: KID_W + SPOUSE_DX * spouses.length };
  });

  const nb = blocks.length;
  const totalW = blocks.reduce((s, bl) => s + bl.w, 0) + KID_GAP * (nb - 1);
  /* 부모 span 안에 여유롭게 들어가면 span에 맞춰 고르게 펼치고,
     그렇지 않으면 겹치지 않을 만큼만 벌린다. */
  /* 양 끝 여백은 SPAN_EDGE 하나로 정한다. 예전에는 이 자리에 10을
     박아 두고 부모 간격을 잡는 쪽에서는 다른 값을 써서, 같은 그림
     안에서도 부부마다 끝 간격이 달라 보였다. */
  const extra = Math.max(0, span - SPAN_EDGE * 2 - totalW);
  const gap = KID_GAP + (nb > 1 ? extra / (nb - 1) : 0);
  const laidW = blocks.reduce((s, bl) => s + bl.w, 0) + gap * (nb - 1);

  const pos = {};
  let cursor = mid - laidW / 2;
  blocks.forEach((bl, i) => {
    const ns = bl.spouses.length;
    if (!ns) {
      pos[bl.kid.id] = { x: Math.round(cursor + bl.w / 2), y: baseY };
    } else {
      /* 관례대로 남성이 왼쪽. 배우자가 여럿이면 결혼한 차례대로
         바깥쪽으로 늘어놓는다 — 첫 배우자가 자녀에 가장 가깝다. */
      const dir = bl.kid.gender === "female" ? -1 : 1;
      /* 손으로 자리를 정한 자녀는 그 자리를 기준으로 삼는다. 계산된
         칸을 쓰면 배우자가 자녀 반대쪽에 떨어져 놓인다 — 남편은
         오른쪽에 있는데 아내가 왼쪽에 가 있던 문제. */
      const kx = bl.kid.fixed
        ? bl.kid.x
        : Math.round(dir > 0 ? cursor + KID_W / 2 : cursor + bl.w - KID_W / 2);
      pos[bl.kid.id] = { x: kx, y: baseY };
      bl.spouses.forEach((sp, si) => {
        if (sp.fixed) return;
        pos[sp.id] = { x: Math.round(kx + dir * SPOUSE_DX * (si + 1)), y: baseY };
      });
    }
    cursor += bl.w + (i < nb - 1 ? gap : 0);
  });
  /* 마지막으로 한 줄 전체를 훑어 기호가 겹치지 않게 벌린다.

     손으로 옮긴 인물은 계산된 칸이 아니라 자기 자리에 남는다. 그래서
     계산만으로는 그 사람과 옆 사람이 겹칠 수 있다. 여기서 최소 간격을
     보장한 뒤, 남는 자리가 있으면 더 벌어지는 것은 그대로 둔다.
     — 겹침은 못 읽지만, 넓은 것은 읽을 수 있다. */
  const laid = d.people
    .filter((p) => p.puid === unionId || blocks.some((bl) => bl.spouses.some((sp) => sp.id === p.id)))
    .map((p) => ({ id: p.id, x: pos[p.id] && !p.fixed ? pos[p.id].x : p.x, fixed: !!p.fixed }))
    .sort((m, n2) => m.x - n2.x);
  for (let i = 1; i < laid.length; i++) {
    const gapNeed = laid[i - 1].x + MIN_PITCH - laid[i].x;
    if (gapNeed <= 0) continue;
    if (!laid[i].fixed) { laid[i].x += gapNeed; continue; }
    /* 오른쪽이 고정이면 왼쪽 사람들을 밀어낸다 */
    let push = gapNeed;
    for (let j = i - 1; j >= 0 && push > 0; j--) {
      if (laid[j].fixed) break;
      laid[j].x -= push;
      const room = j > 0 ? laid[j].x - laid[j - 1].x - MIN_PITCH : Infinity;
      push = room < 0 ? -room : 0;
    }
  }
  const finalX = Object.fromEntries(laid.map((e) => [e.id, e.x]));
  return { ...d, people: d.people.map((p) => {
    if (p.fixed) return p;
    if (finalX[p.id] === undefined) return p;
    const y = pos[p.id] ? pos[p.id].y : p.y;
    return { ...p, x: Math.round(finalX[p.id]), y };
  }) };
}

/* 자녀를 부모 폭 안으로 되돌린다.

   끄는 동안에만 막아서는 부족했다. 부모를 안쪽으로 옮기면 폭이
   좁아지면서, 가만히 있던 자녀가 밖으로 밀려나기 때문이다. 그래서
   부모가 움직인 뒤에도 한 번 더 확인한다. */
/* 자녀가 늘면 부모 사이를 그만큼만 벌린다.

   기준은 부부선 양 끝이다. 맨 왼쪽 자녀와 맨 오른쪽 자녀가 부모의
   바로 안쪽에 오도록 폭을 잡는다. 여백은 아주 좁게 둔다 — 부모가
   자녀들을 감싸 안은 모양이 가계도의 본래 꼴이기 때문이다.

   자녀를 새로 달 때만 부른다. 끄는 동안에는 부르지 않는다. 손으로
   옮길 때마다 부모가 따라 움직이면 그림이 제멋대로가 된다. 손으로
   자리를 고정한 부모도 건드리지 않는다. */
const SPAN_EDGE = 48;
function fitSpanToKids(d, unionId) {
  const u = d.unions.find((x) => x.id === unionId); if (!u) return d;
  const a = d.people.find((p) => p.id === u.a), b = d.people.find((p) => p.id === u.b);
  if (!a || !b) return d;
  const kids = d.people.filter((p) => p.puid === unionId);
  if (kids.length < 2) return d;
  /* centerKids가 쓰는 폭 셈과 같은 방식 — 자녀마다 배우자가 붙으면 더 넓다 */
  const widths = kids.map((k) => KID_W + SPOUSE_DX * spousesOf(d, k).length);
  const need = widths.reduce((t, w) => t + w, 0) + KID_GAP * (kids.length - 1) + SPAN_EDGE * 2;
  const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x), mid = (lo + hi) / 2;
  if (hi - lo >= need) return d;                    // 이미 넉넉하면 그대로 둔다
  const leftId = a.x <= b.x ? a.id : b.id, rightId = a.x <= b.x ? b.id : a.id;
  return { ...d, people: d.people.map((p) =>
    p.id === leftId ? { ...p, x: Math.round(mid - need / 2) }
      : p.id === rightId ? { ...p, x: Math.round(mid + need / 2) } : p) };
}

/* 자녀는 부모를 잇는 가로선보다 아래에 있어야 한다. 손으로 위로
   끌어올려 그 선 높이에 올려놓으면 배우자 자리처럼 읽혀 가계도가
   완전히 다른 뜻이 된다. x뿐 아니라 y에도 바닥을 둔다. */
const CHILD_DROP_MIN = 110;
function clampKids(d, unionId) {
  const u = d.unions.find((x) => x.id === unionId); if (!u) return d;
  const a = d.people.find((p) => p.id === u.a), b = d.people.find((p) => p.id === u.b);
  if (!a || !b) return d;
  const lo = Math.min(a.x, b.x) + SPAN_EDGE, hi = Math.max(a.x, b.x) - SPAN_EDGE;
  const yFloor = Math.max(a.y, b.y) + CHILD_DROP_MIN;
  const spanOK = hi > lo;
  return { ...d, people: d.people.map((p) => {
    if (p.puid !== unionId) return p;
    const nx = spanOK ? Math.round(Math.min(hi, Math.max(lo, p.x))) : p.x;
    const ny = p.y < yFloor ? Math.round(yFloor) : p.y;
    return (nx !== p.x || ny !== p.y) ? { ...p, x: nx, y: ny } : p;
  }) };
}
/* 부모 사이가 자녀를 모두 담기에 좁은지 — 실제로 필요한 폭과 견준다 */
function spanTooTight(d, unionId) {
  const u = d.unions.find((x) => x.id === unionId); if (!u) return false;
  const a = d.people.find((p) => p.id === u.a), b = d.people.find((p) => p.id === u.b);
  if (!a || !b) return false;
  const kids = d.people.filter((p) => p.puid === unionId);
  if (kids.length < 2) return false;
  const widths = kids.map((k) => KID_W + SPOUSE_DX * spousesOf(d, k).length);
  const need = widths.reduce((t, w) => t + w, 0) + KID_GAP * (kids.length - 1);
  return Math.abs(a.x - b.x) < need;
}

/* 형제 줄 안의 겹침은 clampKids/centerKids가 풀어 주지만, 그건 같은
   부모 밑 형제끼리만 본다. 손으로 사람을 끌어다 전혀 다른 집안
   줄기 위에 포개 놓으면 그 두 줄기는 서로를 모른 채 겹친 그대로
   남는다. 여기서는 관계를 따지지 않고, 같은 세대 줄(y가 비슷한)에
   너무 가까이 있는 아무 두 사람이나 찾아 서로 밀어낸다 — 방금 끈
   사람은 자리를 지키고, 부딪힌 쪽이 옆으로 비켜선다. */
function deoverlapPeople(people, movedIds, minGap = MIN_PITCH) {
  const arr = people.map((p) => ({ ...p }));
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        if (a.gender === "object" || b.gender === "object") continue;
        if (Math.abs(a.y - b.y) > 46) continue;
        const dx = b.x - a.x;
        if (Math.abs(dx) >= minGap) continue;
        const need = minGap - Math.abs(dx);
        const dir = dx >= 0 ? 1 : -1;
        const aMoved = movedIds.includes(a.id), bMoved = movedIds.includes(b.id);
        if (aMoved && !bMoved) b.x += need * dir;
        else if (bMoved && !aMoved) a.x -= need * dir;
        else if (!aMoved && !bMoved) { a.x -= need * dir / 2; b.x += need * dir / 2; }
        // 둘 다 방금 옮긴 사람(같은 무리로 함께 끌림)일 때는 서로 건드리지 않는다
        moved = true;
      }
    }
    if (!moved) break;
  }
  return arr;
}

function estimateBirths(doc) {
  const out = {}, est = {};
  const uMap = Object.fromEntries(doc.unions.map((u) => [u.id, u]));
  doc.people.forEach((p) => { if (p.birth) out[p.id] = +p.birth; });
  for (let i = 0; i < 10; i++) {
    doc.people.forEach((p) => {
      if (out[p.id]) return;
      const u = p.puid ? uMap[p.puid] : null;
      if (u) {
        if (u.mYear) { out[p.id] = +u.mYear + 2; est[p.id] = 1; return; }
        const pb = [out[u.a], out[u.b]].filter(Boolean);
        if (pb.length) { out[p.id] = Math.max(...pb) + 28; est[p.id] = 1; return; }
      }
      const su = doc.unions.find((x) => x.a === p.id || x.b === p.id);
      if (su) {
        const o = out[su.a === p.id ? su.b : su.a];
        if (o) { out[p.id] = o + (su.a === p.id ? -2 : 2); est[p.id] = 1; return; }
        if (su.mYear) { out[p.id] = +su.mYear - 26; est[p.id] = 1; return; }
      }
      const kids = doc.people.filter((k) => { const ku = k.puid ? uMap[k.puid] : null; return ku && (ku.a === p.id || ku.b === p.id) && out[k.id]; });
      if (kids.length) { out[p.id] = Math.min(...kids.map((k) => out[k.id])) - 28; est[p.id] = 1; return; }
    });
  }
  return { born: out, est };
}
function tlgLayout(doc, scale, win) {
  const people = doc.people.filter((p) => !p.preg);
  const { born, est } = estimateBirths(doc);
  const ys = [];
  people.forEach((p) => { if (born[p.id]) ys.push(born[p.id]); if (p.death) ys.push(+p.death); });
  doc.unions.forEach((u) => { if (u.mYear) ys.push(+u.mYear); if (u.eYear) ys.push(+u.eYear); });
  doc.bonds.forEach((b) => { if (b.from) ys.push(+b.from); if (b.to) ys.push(+b.to); });
  (doc.events || []).forEach((e) => { if (e.year) ys.push(+e.year); if (e.endYear) ys.push(+e.endYear); });
  let minYear = ys.length ? Math.min(...ys) - 4 : YEAR - 60;
  let maxYear = ys.length ? Math.max(...ys, YEAR) + 3 : YEAR;
  if (win && win.from && win.to && +win.to > +win.from) { minYear = +win.from; maxYear = +win.to; }
  minYear = Math.floor(minYear / 5) * 5; maxYear = Math.ceil(maxYear / 5) * 5;
  const order = people.slice().sort((a, b) => a.x - b.x);
  const cols = {}; order.forEach((p, i) => { cols[p.id] = i * TLG_COL; });
  return { people: order, born, est, cols, yOf: (yr) => (Number(yr) - minYear) * scale,
    minYear, maxYear, scale, width: Math.max(0, (order.length - 1) * TLG_COL), height: (maxYear - minYear) * scale };
}

/* ══ person node ════════════════════════════════════════════════ */
function PersonNode({ p, selected, detail, li, onDown, attrChips, events }) {
  const stroke = selected ? T.gold : T.ink;
  const sw = selected ? 2.6 : 2;
  const clip = p.gender === "female" ? "clipCircle" : p.gender === "male" ? "clipSquare" : "clipDiamond";
  const age = p.birth ? (p.death ? Number(p.death) : YEAR) - Number(p.birth) : null;
  const Shape = ({ inset = 0, fill = "none", ...rest }) => {
    if (p.gender === "male") return <rect x={-26 + inset} y={-26 + inset} width={52 - inset * 2} height={52 - inset * 2} fill={fill} {...rest} />;
    if (p.gender === "female") return <circle cx={0} cy={0} r={27 - inset} fill={fill} {...rest} />;
    return <path d={`M 0 ${-30 + inset} L ${30 - inset} 0 L 0 ${30 - inset} L ${-30 + inset} 0 Z`} fill={fill} {...rest} />;
  };

  if (p.preg) {
    return (
      <g transform={`translate(${p.x},${p.y})`} onPointerDown={onDown} style={{ cursor: "grab" }}>
        <circle r={34} fill="transparent" />
        {p.preg === "pregnancy" && <path d="M 0 -12 L 12 10 L -12 10 Z" fill={T.ink} />}
        {p.preg === "miscarriage" && <circle r={8.5} fill={T.ink} />}
        {p.preg === "stillbirth" && (<><path d="M 0 -12 L 12 10 L -12 10 Z" fill="none" stroke={T.ink} strokeWidth={1.8} />
          <path d="M -9 -5 L 9 7 M 9 -5 L -9 7" stroke={T.ink} strokeWidth={1.6} /></>)}
        {p.preg === "abortion" && <path d="M 0 -16 L 0 14 M -11 -5 L 11 9 M 11 -5 L -11 9" stroke={T.ink} strokeWidth={1.8} fill="none" />}
        {/* 표준 기호에는 성별 자리가 없다. 초음파가 없던 시절에 굳은
            관례이기 때문이다. 지금은 부모가 아는 경우가 많고, 아는
            것을 적을 자리가 없다는 말은 애도를 지우는 일이 된다.
            기호는 표준 그대로 두고, 아는 경우에만 옆에 덧붙인다. */}
        {(p.gender === "male" || p.gender === "female") && (
          <text x={15} y={-5} fontSize={17} fill={T.ink2} fontFamily={FB} fontWeight={700}
            stroke="#fff" strokeWidth={3.4} paintOrder="stroke">{p.gender === "male" ? "♂" : "♀"}</text>
        )}
        <text y={26} textAnchor="middle" fontSize={11} fill={T.ink2} fontFamily={FB}>{tr(PREG[p.preg], li)}{p.birth ? ` '${String(p.birth).slice(2)}` : ""}</text>
        {p.name && (
          <text y={38} textAnchor="middle" fontSize={10.5} fill={T.ink2} fontFamily={FB}
            stroke="#fff" strokeWidth={3} paintOrder="stroke">{p.name}</text>
        )}
      </g>
    );
  }

  if (p.gender === "object") {
    const kind = tr(OBJ_KINDS[p.objKind] || OBJ_KINDS.other, li);
    const oLines = detail ? wrapText(p.note, 15).slice(0, 4) : [];
    return (
      <g transform={`translate(${p.x},${p.y})`} onPointerDown={onDown} style={{ cursor: "grab" }}>
        <rect x={-36} y={-34} width={72} height={68} fill="transparent" />
        {selected && <rect x={-34} y={-26} width={68} height={52} rx={14} fill={T.goldSoft} stroke={T.gold} strokeWidth={1} />}
        <rect x={-26} y={-19} width={52} height={38} rx={10} fill={T.ink2} stroke={selected ? T.gold : T.ink} strokeWidth={selected ? 2.4 : 1.8} />
        <text y={4} textAnchor="middle" fontSize={kind.length > 6 ? 8 : 10} fill="#fff" fontFamily={FB} fontWeight={600}>{kind}</text>
        <text y={36} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={T.ink} fontFamily={FB}>{p.name || kind}</text>
        {oLines.map((l, i) => <text key={i} y={51 + i * 13} textAnchor="middle" fontSize={10} fill={T.ink2} fontFamily={FB}>{l}</text>)}
      </g>
    );
  }

  const flags = [];
  if (p.phys) flags.push([tr(["Physical", "신체질환", "身體"], li), "#6E93A8"]);
  if (p.ment) flags.push([tr(["Mental", "정신건강", "心理"], li), "#7C6EA8"]);
  if (p.addi) flags.push([tr(["Addiction", "중독", "成癮"], li), T.amber]);
  const roleLines = detail ? wrapText(p.role, 14) : [];
  const noteLines = detail ? wrapText(p.note, 16).slice(0, 6) : [];
  let y = 44;

  return (
    <g transform={`translate(${p.x},${p.y})`} onPointerDown={onDown} style={{ cursor: "grab" }}>
      {/* 실제 기호보다 훨씬 넓게 터치 인식 영역을 둔다. 축소된 화면에서는
         손가락이 기호를 정확히 짚기 어려워, 못 짚으면 기호 대신 배경이
         눌려 화면 전체가 끌려갔다. 눈에는 보이지 않지만 훨씬 넉넉한
         반경 안 어디를 눌러도 이 사람이 잡히게 한다. */}
      <circle r={36} fill="transparent" />
      {selected && <Shape inset={-9} stroke={T.gold} strokeWidth={1} fill={T.goldSoft} opacity={0.6} />}
      <Shape fill="#fff" stroke={stroke} strokeWidth={sw} />
      <g clipPath={`url(#${clip})`}>
        {p.phys && <rect x={-30} y={-30} width={30} height={60} fill="#6E93A8" opacity={0.85} />}
        {p.ment && <rect x={0} y={-30} width={30} height={60} fill="#7C6EA8" opacity={0.85} />}
        {p.addi && <rect x={-30} y={-30} width={60} height={30} fill={T.ink} opacity={0.88} />}
      </g>
      <Shape fill="none" stroke={stroke} strokeWidth={sw} />
      {p.proband && <Shape inset={5} fill="none" stroke={stroke} strokeWidth={1.7} />}
      {p.orient && p.orient !== "none" && (
        <g>
          <path d="M -9 -19 L 9 -19 L 0 -6 Z" fill={T.violet} opacity={0.9} />
          <title>{tr(ORIENTATIONS[p.orient] || ORIENTATIONS.none, li)}</title>
        </g>
      )}
      {p.deceased && <path d="M -26 -26 L 26 26 M 26 -26 L -26 26" stroke={T.ink} strokeWidth={2} strokeLinecap="round" />}
      {age !== null && !p.deceased && (
        <text y={5} textAnchor="middle" fontSize={15} fontFamily={FM} fill={p.phys || p.ment || p.addi ? "#fff" : T.ink}>{age}</text>
      )}
      {/* 수준 표지 — 기호 오른쪽에 작은 칩으로 쌓는다. 색으로 뜻을
          나르지 않는다. 관계선 다섯 갈래의 색과 부딪히기 때문이다.
          대신 채워진 길이로 정도를 보인다. */}
      {attrChips && attrChips.length > 0 && (
        <g>
          {/* 기호 옆 척도 칩 — 요청에 따라 크기를 키워 한눈에 읽히게 */}
          {attrChips.map((c, i) => (
            <g key={c.key} transform={`translate(34,${-22 + i * 19})`}>
              <rect x={0} y={-8} width={56} height={16} rx={8} fill="#fff" stroke={c.col||T.ink2} strokeWidth={1.1} opacity={0.97} />
              <rect x={1} y={-7} width={Math.max(3, 54 * c.frac)} height={14} rx={7} fill={c.col||T.ink2} opacity={0.18} />
              <text x={28} y={3} textAnchor="middle" fontSize={9.5} fontFamily={FB} fontWeight={700} fill={c.col||T.ink2}>{c.text}</text>
              <title>{c.title}</title>
            </g>
          ))}
        </g>
      )}
      {p.birth && <text x={-31} y={-27} textAnchor="end" fontSize={10.5} fill={T.ink2} fontFamily={FM}>{`'${String(p.birth).slice(2)}`}</text>}
      {p.death && <text x={31} y={-27} fontSize={10.5} fill={T.ink2} fontFamily={FM}>{`'${String(p.death).slice(2)}`}</text>}
      <text y={y} textAnchor="middle" fontSize={13} fontWeight={600} fill={T.ink} fontFamily={FB}
        stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" paintOrder="stroke">{personName(p, li)}</text>
      {roleLines.map((l, i) => (
        <text key={"r" + i} y={(y += 14)} textAnchor="middle" fontSize={11} fill={T.sage} fontFamily={FB} fontWeight={500}
          stroke="#fff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">{l}</text>
      ))}
      {detail && flags.length > 0 && (
        <g transform={`translate(0,${(y += 15)})`}>
          {flags.map(([label, c], i) => {
            const w = label.length * 6.6 + 12;
            const widths = flags.map((f) => f[0].length * 6.6 + 12);
            const total = widths.reduce((s, v) => s + v + 4, -4);
            let x = -total / 2;
            for (let k = 0; k < i; k++) x += widths[k] + 4;
            return (
              <g key={label} transform={`translate(${x},0)`}>
                <rect x={0} y={-9} width={w} height={13} rx={6.5} fill={c} opacity={0.16} />
                <text x={w / 2} y={1} textAnchor="middle" fontSize={9} fill={c} fontFamily={FB} fontWeight={600}>{label}</text>
              </g>
            );
          })}
        </g>
      )}
      {noteLines.length > 0 && (
        <g transform={`translate(0,${(y += 10)})`}>
          <rect x={-64} y={0} width={128} height={noteLines.length * 13 + 9} rx={4} fill="#FFFCF3" stroke="#E9DFC7" strokeWidth={1} />
          <rect x={-64} y={0} width={2.5} height={noteLines.length * 13 + 9} fill={T.amber} />
          {noteLines.map((l, i) => <text key={i} x={-58} y={13 + i * 13} fontSize={10} fill={T.ink2} fontFamily={FB}>{l}</text>)}
        </g>
      )}
      {events && events.length > 0 && (
        <g>
          {events.map((e, i) => (
            <g key={e.id} transform={`translate(0,${y + 18 + i * 14})`}>
              <rect x={-56} y={-8} width={112} height={13} rx={6} fill="#F4F0FA" stroke="#B8A9D8" strokeWidth={0.8} opacity={0.92} />
              <text x={-48} y={1.5} fontSize={8.5} fontFamily={FM} fill="#6A5A93" fontWeight={700}>{e.year}</text>
              <text x={-28} y={1.5} fontSize={8.5} fontFamily={FB} fill={T.ink2}>{(e.title||"").slice(0,14)}{(e.title||"").length>14?"…":""}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/* ══ couple line + children ═════════════════════════════════════ */
function personClearance(p, detail) {
  let h = 58;                                    // base gap under the symbol
  if (!detail || !p) return h;
  if (p.role) h += 14;
  if (p.phys || p.ment || p.addi) h += 16;
  if (p.note) h += Math.min(6, wrapText(p.note, 16).length) * 13 + 20;
  return h;
}
function UnionEdge({ u, a, b, kids, level = 0, detail, selected, onSelect, li = 1 }) {
  if (!a || !b) return null;
  const meta = UNION_TYPES[u.type] || UNION_TYPES.married;
  /* 한 사람에게 결혼이 여럿이면 선을 층지게 그린다. 24는 선 굵기와
     연도 글자를 감안하면 빠듯해, 첫 선과 둘째 선이 붙어 보였다. */
  const yLine = Math.max(a.y + personClearance(a, detail), b.y + personClearance(b, detail)) + level * 34;
  const left = a.x < b.x ? a : b, right = a.x < b.x ? b : a;
  const lx = left.x, rx = right.x;
  const d = `M ${lx} ${left.y + rOf(left)} V ${yLine} H ${rx} V ${right.y + rOf(right)}`;
  const mid = (lx + rx) / 2;
  const col = selected ? T.gold : T.line;
  const marks = [];
  if (meta.marks === 3) {
    marks.push(<g key="re">
      <line x1={mid - 8} y1={yLine + 9} x2={mid + 8} y2={yLine - 9} stroke={col} strokeWidth={2.2} />
      <line x1={mid - 8} y1={yLine - 9} x2={mid + 8} y2={yLine + 9} stroke={col} strokeWidth={2.2} />
    </g>);
  } else if (meta.marks) {
    /* 사선 방향으로 사실상 별거(우상향)와 법적 별거(좌상향)를 구별한다 */
    const dir = meta.lean === -1 ? -1 : 1;
    (meta.marks === 2 ? [mid - 7, mid + 7] : [mid]).forEach((x, i) =>
      marks.push(<line key={i} x1={x - 6 * dir} y1={yLine + 9} x2={x + 6 * dir} y2={yLine - 9} stroke={col} strokeWidth={2.2} strokeLinecap="round" />));
  }
  /* 선 한가운데의 작은 꼬리표 — 동성 결혼처럼, 선 모양만으로는
     구별되지 않는 유형에 이름을 붙여 준다. */
  const pill = meta.ssm ? ["SSM", "동성", "同性"] : meta.pill;
  if (pill) {
    const txt = tr(pill, li);
    const w = Math.max(20, txt.length * 6.5 + 12);
    marks.push(<g key="pill">
      <rect x={mid - w / 2} y={yLine - 8.5} width={w} height={13} rx={6.5} fill="#fff" stroke={col} strokeWidth={0.9} />
      <text x={mid} y={yLine + 3.5} textAnchor="middle" fontSize={8} fontFamily={FB} fontWeight={700} fill={col}>{txt}</text>
    </g>);
  }
  const paths = [];
  if (kids.length) {
    /* 자녀 연결선은 언제나 곧은 선이다 — 꺾지 않는다.

       자녀가 부모 폭 밖에 놓이면 세로선이 닿을 가로선이 없어 허공에
       뜬다. 그래서 그 자녀까지 닿도록 가로선을 잇는다. 다만 부부선과
       같은 굵기로 그으면 결혼선이 늘어난 것처럼 보이므로, 자녀선의
       굵기와 색으로 긋는다 — 부부선은 부부선, 자녀선은 자녀선. */
    const kxs = kids.map((k) => k.x);
    const barL = Math.min(lx, ...kxs), barR = Math.max(rx, ...kxs);
    if (barL < lx - 0.5) {
      paths.push(<path key="extL" d={`M ${barL} ${yLine} H ${lx}`} stroke={T.line}
        strokeWidth={1.8} fill="none" strokeLinecap="round" />);
    }
    if (barR > rx + 0.5) {
      paths.push(<path key="extR" d={`M ${rx} ${yLine} H ${barR}`} stroke={T.line}
        strokeWidth={1.8} fill="none" strokeLinecap="round" />);
    }
    kids.forEach((k) => {
      const dash = LINK_DASH[k.link] || null;
      const top = k.preg ? k.y - 14 : k.y - rOf(k);
      paths.push(<path key={k.id} d={`M ${k.x} ${yLine} L ${k.x} ${top}`} stroke={T.line} strokeWidth={1.8}
        strokeDasharray={dash || undefined} fill="none" strokeLinecap="round" />);
    });
    const tw = {};
    kids.forEach((k) => { if (k.twin) (tw[k.twin] = tw[k.twin] || []).push(k); });
    Object.entries(tw).forEach(([tid, grp]) => {
      if (grp.length < 2) return;
      const gx = grp.map((g) => g.x);
      paths.push(<path key={"tw" + tid} d={`M ${Math.min(...gx)} ${yLine + 28} H ${Math.max(...gx)}`}
        stroke={T.line} strokeWidth={grp[0].twinType === "identical" ? 2.6 : 1.4} fill="none" />);
    });
  }
  const label = [u.mYear ? `m. ${u.mYear}` : "", u.eYear ? `${u.type === "divorced" ? "d." : "s."} ${u.eYear}` : ""].filter(Boolean).join("   ");
  return (
    <g>
      <path d={d} fill="none" stroke={col} strokeWidth={selected ? 2.6 : 1.9} strokeDasharray={meta.dash || undefined} />

      {marks}
      {label && <text x={mid} y={yLine - 7} textAnchor="middle" fontSize={10.5} fontFamily={FM} fill={T.ink2}>{label}</text>}
      {paths}
      <path d={d} fill="none" stroke="transparent" strokeWidth={16} style={{ cursor: "pointer" }}
        onPointerDown={(e) => { e.stopPropagation(); onSelect(u.id); }} />
    </g>
  );
}

/* ══ relationship line ══════════════════════════════════════════ */
/* 한 구간의 설명 꼬리표: 관계 유형 · 메모 · 기간 */
function segCaption(sg, li, detailed = false) {
  /* 평소에는 유형 이름만 — "빈약한 관계"처럼 짧게. 기간과 메모는
     그 선을 실제로 고를 때만 붙는다. 예전에는 유형·기간·메모 유무에
     따라 글자가 있다 없다 했는데, 이제는 그 갈림이 "지금 이 선을
     고르고 있는가" 하나로 정리됐다. */
  const meta = BOND_TYPES[sg.type] || BOND_TYPES.harmony;
  if (!detailed) return tr(meta.label, li);
  const period = (sg.from || sg.to)
    ? `${sg.from || "?"}–${sg.to || tr(["now", "현재", "現在"], li)}`
    : "";
  return [tr(meta.label, li), period].filter(Boolean).join(" · ");
}

/* 같은 두 사람 사이의 관계선이 둘 이상이면(관계가 바뀐 경우) 인물을 가운데 두고
   위아래로 벌려 놓는다. 두 줄이면 각각 ±22, 세 줄이면 0과 ±44. 선은 두 사람 사이의
   빈 구간에만 그려지므로 사람 기호와 겹치지 않는다. 간격을 더 넓히면 부부의 아래쪽 선이
   결혼선(기호 아래 약 53)과 겹치니 44를 넘기지 않는다.
   가장 오래된 선이 맨 아래, 가장 새 선이 맨 위. 아래 상수 하나로 뒤집을 수 있다. */
const LANE = 44;
const LANE_OLDEST_AT_BOTTOM = true;

/* 곧은 선이 가로지르고 지나가는 사람이 있는지 본다.
   형제들이 한 줄에 나란히 앉은 자리에서 맨 왼쪽과 맨 오른쪽을 곧게
   이으면, 사이에 앉은 형제를 그대로 통과한다. 학생들이 "형제 사이에
   있지도 않은 관계선이 생긴다"고 본 것이 이것이다. 가로막는 사람이
   있으면 그 사람을 비켜 갈 만큼 활처럼 휘어 잇는다. */
function bondBow(a, b, people) {
  if (!people || people.length < 3) return 0;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  let worst = 0, side = 0, blocked = 0;
  people.forEach((p) => {
    if (p.id === a.id || p.id === b.id) return;
    const vx = p.x - a.x, vy = p.y - a.y;
    const along = vx * ux + vy * uy;
    if (along < 18 || along > L - 18) return;          // 두 사람 바깥은 상관없다
    const off = vx * nx + vy * ny;                     // 선에서 떨어진 거리
    const clear = rOf(p) + 20;
    if (Math.abs(off) > clear) return;                 // 넉넉히 비켜 있다
    blocked += 1;
    const need = clear + 16 - Math.abs(off);
    if (need > worst) { worst = need; side = off >= 0 ? -1 : 1; }
  });
  if (!blocked) return 0;
  /* 같은 세대에 나란히 앉은 사이라면 언제나 아래로 돌린다.
     위로 돌리면 부모에게서 내려오는 세로선들을 가로지른다. */
  const sameRow = Math.abs(a.y - b.y) < 24;
  const dir = sameRow ? (ny > 0 ? 1 : -1) : (side || 1);
  const depth = 34 + 22 * (blocked - 1) + worst;
  return dir * Math.min(depth, 150);
}

function arrowGeometry(p1, p2, bow = 0) {
  const dx = p2.x-p1.x, dy = p2.y-p1.y, len = Math.hypot(dx,dy)||1;
  const tx = dx + 4*bow*dy/len, ty = dy - 4*bow*dx/len, tl = Math.hypot(tx,ty)||1;
  const ux=tx/tl, uy=ty/tl, size=Math.min(10,len/4), half=size*.46;
  const neckLength=Math.min(size+4,len*.8);
  const neck={x:p2.x-ux*neckLength,y:p2.y-uy*neckLength};
  const bx=p2.x-ux*size, by=p2.y-uy*size;
  return {neck,head:`M ${bx-uy*half} ${by+ux*half} L ${p2.x} ${p2.y} L ${bx+uy*half} ${by-ux*half}`};
}
function relationPort(person,other,bond,people,bonds) {
  const angle=Math.atan2(other.y-person.y,other.x-person.x),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const near=bonds.filter(b=>b.a===person.id||b.b===person.id).map(b=>{
    const p=people.find(p=>p.id===(b.a===person.id?b.b:b.a));
    return {id:b.id,d:p?wrap(Math.atan2(p.y-person.y,p.x-person.x)-angle):10};
  }).filter(v=>Math.abs(v.d)<.65).sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));
  const i=near.findIndex(v=>v.id===bond.id),offset=i<0?0:(i-(near.length-1)/2)*Math.min(.24,1.1/Math.max(1,near.length-1));
  return edgePtShape(person,{x:person.x+Math.cos(angle+offset)*100,y:person.y+Math.sin(angle+offset)*100},5);
}
function bondSegmentGeometry(bond, a, b, people, index, bonds=[]) {
  const segs=sortedSegments(bond), n=segs.length;
  const base1=relationPort(a,b,bond,people,bonds), base2=relationPort(b,a,bond,people,bonds);
  const dx=base2.x-base1.x,dy=base2.y-base1.y,L=Math.hypot(dx,dy)||1;
  let nx=-dy/L,ny=dx/L;
  /* 법선은 늘 위쪽(세로선이면 오른쪽). 누가 a이든 같은 쪽이 '위'가 된다. */
  if(Math.abs(ny)<1e-3?nx<0:ny>0){nx=-nx;ny=-ny;}
  /* 가운데(인물 높이)를 기준으로 위아래로 고르게 — 한 줄이면 0, 두 줄이면 ±LANE/2.
     rank는 '위에서 몇째'가 아니라 '오래된 순서'라, 새 선일수록 위로 올라간다. */
  const rank=LANE_OLDEST_AT_BOTTOM?index:(n-1-index);
  const off=(rank-(n-1)/2)*LANE, bow=bondBow(a,b,people);
  const g={p1:{x:base1.x+nx*off,y:base1.y+ny*off},p2:{x:base2.x+nx*off,y:base2.y+ny*off},
    bow:bow?bow+Math.sign(bow)*(n-1-rank)*14:0,nx,ny,lblSign:bow?Math.sign(bow):1,rank};
  /* 화살표가 있는 선(무관심·폭력·통제)은 방향이 있다. 뒤에 붙인 선이 반대 방향이면
     그 구간만 뒤집어 그린다(rev). 곡선의 휘어짐도 함께 뒤집어야 같은 곡선이 된다. */
  const sg=segs[index];
  if(sg&&sg.rev)return {...g,p1:g.p2,p2:g.p1,bow:-g.bow};
  return g;
}
function glyphPoint(meta,p1,p2,bow,t) {
  const end=meta.arrow?arrowGeometry(p1,p2,bow).neck:p2;
  const dx=end.x-p1.x,dy=end.y-p1.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  const q=Math.max(0,Math.min(.999999,t));
  if(meta.wave){
    const n=Math.max(2,Math.round(L/(meta.seg||17))),i=Math.floor(q*n),u=q*n-i;
    const a=bowPt(p1,end,bow,i/n),b=bowPt(p1,end,bow,(i+1)/n),m=bowPt(p1,end,bow,(i+.5)/n);
    const amp=(i%2?-1:1)*(meta.amp||5),cx=m.x+nx*amp,cy=m.y+ny*amp;
    return {x:(1-u)**2*a.x+2*(1-u)*u*cx+u*u*b.x,y:(1-u)**2*a.y+2*(1-u)*u*cy+u*u*b.y};
  }
  if(meta.zig||meta.zigLines){
    const n=Math.max(4,Math.round(L/(meta.seg||10))),i=Math.floor(q*n),u=q*n-i;
    const at=k=>{const b=bowPt(p1,end,bow,k/n),o=k===0||k===n?0:(k%2?1:-1)*(meta.amp||6);return {x:b.x+nx*o,y:b.y+ny*o};};
    const a=at(i),b=at(i+1);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
  }
  return bowPt(p1,p2,bow,t);
}

function BondEdge({ bond, a, b, li, selected, selSeg, onSelect, people, bonds=[], showLabels = true }) {
  if (!a || !b) return null;
  /* 같은 두 사람 사이의 관계가 시기에 따라 바뀐 경우, 시기마다 평행선을
     나란히 그린다. 구간이 바뀌는 자리는 까만 점(출발)에서 화살표(도착)로
     — 이른 시기에서 나중 시기로 곧게 잇는다. 예전에는 이 화살표가 선
     중간 어딘가에 따로 떠 있어 무엇과 무엇을 잇는지 읽기 어려웠다.
     이제는 두 선에 각각 점과 촉이 닿아 있어, 어느 선에서 어느 선으로
     바뀌었는지가 손으로 짚은 것처럼 분명하다. 바뀐 이유를 적었다면,
     화살표 위에 작은 글상자가 얹힌다. */
  const segs = sortedSegments(bond);
  const n = segs.length;

  const bow = bondBow(a, b, people);
  const base1 = edgePtShape(a, b, 8), base2 = edgePtShape(b, a, 8);
  const dx = base2.x - base1.x, dy = base2.y - base1.y, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (ny > 0) { nx = -nx; ny = -ny; }            // 법선은 언제나 위쪽

  return (
    <g>
      {segs.map((sg, i) => {
        const meta = BOND_TYPES[sg.type] || BOND_TYPES.harmony;
        const active = selected && (n === 1 || !selSeg || selSeg === sg.id);
        const col = active ? T.gold : bondColor(sg.type);
        const geometry = bondSegmentGeometry(bond,a,b,people,i,bonds);
        const {p1,p2,bow:segBow}=geometry;
        const cap = (showLabels || sg.emphasize) ? segCaption(sg, li, active) : "";
        const apex = bowMid(p1, p2, segBow);
        const mx = apex.x, my = apex.y;
        /* 여러 줄이면 맨 아래 선의 이름표는 아래쪽 바깥에 둔다. 두 선 사이의 빈자리는
           전환 화살표와 '바뀐 이유' 상자를 위해 비워 둔다. */
        const lblDir = geometry.lblSign * ((n > 1 && geometry.rank === 0 && !segBow) ? -1 : 1);
        const kinds = kindsOf(meta);
        /* 신체·언어·성처럼 사용자가 직접 고른 세부 유형은 관계선의
           일부다. 전체 관계 이름표를 꺼도 이 세부 유형은 즉시 남는다. */
        const pillText = kinds && sg.kind && kinds[sg.kind] ? tr(kinds[sg.kind], li) : "";
        /* 종류 꼬리표는 선 한가운데에 놓인다. 유형 이름표까지 그 옆
           13px에 두면 둘이 겹쳐 읽힌다. 꼬리표가 있을 때는 이름표를
           꼬리표 높이만큼 더 밀어내 위아래로 나란히 놓는다. */
        const lblGap = pillText ? 26 : 13;
        const lx = mx + geometry.nx * lblGap * lblDir, ly = my + geometry.ny * lblGap * lblDir;
        return (
          <g key={sg.id || i}>
            {bondGlyphParts(meta, p1, p2, col, `s${i}-`, segBow, pillText)}
            {cap && (
              <g transform={`translate(${lx},${ly})`}>
                <text y={2} textAnchor="middle" fontSize={9.5} fill={col} fontFamily={FB}
                  fontWeight={active ? 700 : 600} letterSpacing="-.01em"
                  stroke="#fff" strokeWidth={3.6} strokeLinejoin="round" paintOrder="stroke">{cap}</text>
              </g>
            )}
            <path d={offsetPath(p1, p2, 0, segBow)} stroke="transparent" strokeWidth={n > 1 ? LANE - 10 : 18}
              style={{ cursor: "pointer" }} fill="none"
              onPointerDown={(e) => { e.stopPropagation(); onSelect(bond.id, sg.id); }} />
          </g>
        );
      })}
      {n > 1 && segs.slice(0, -1).map((sg, i) => {
        /* 두 선의 같은 지점(t)에서 수직으로 이어, 오래된 선의 점(출발)에서 새 선의
           촉(도착)으로 곧게 잇는다. 오래된 선이 아래이므로 화살표는 위로 향한다.
           방향이 뒤집힌 구간(rev)은 t도 뒤집어야 같은 지점에서 만난다. */
        const nxt = segs[i + 1];
        const t = .24 + (i % 4) * .14;
        const ga=bondSegmentGeometry(bond,a,b,people,i,bonds),gb=bondSegmentGeometry(bond,a,b,people,i+1,bonds);
        const from=glyphPoint(BOND_TYPES[sg.type]||BOND_TYPES.harmony,ga.p1,ga.p2,ga.bow,sg.rev?1-t:t);
        const to=glyphPoint(BOND_TYPES[nxt.type]||BOND_TYPES.harmony,gb.p1,gb.p2,gb.bow,nxt.rev?1-t:t);
        const ang = Math.atan2(to.y - from.y, to.x - from.x);
        const ahx = Math.cos(ang), ahy = Math.sin(ang);
        /* 물결·지그재그는 중심선에서 진폭만큼 흔들리므로 점과 촉을 넉넉히 키우고
           흰 테를 둘러, 위상이 어긋나도 늘 선에 닿아 보이게 한다. */
        const headTip = to;
        const headL = { x: to.x - ahx * 6 + ahy * 3.6, y: to.y - ahy * 6 - ahx * 3.6 };
        const headR = { x: to.x - ahx * 6 - ahy * 3.6, y: to.y - ahy * 6 + ahx * 3.6 };
        const headPath = `M ${headL.x} ${headL.y} L ${headTip.x} ${headTip.y} L ${headR.x} ${headR.y}`;
        /* 바뀐 때(연도)와 이유는 화살표 한가운데 작은 상자에 담는다 — 두 선 사이의 빈자리.
           한글은 글자 폭이 영문의 두 배 가까이 되므로 글자별로 폭을 셈하고, 선이 짧으면
           ‘…’로 줄인다. 상자는 선이 놓인 구간 밖으로 나가 사람 기호를 덮지 않게 조인다. */
        const reasonRaw = [String(nxt.from || "").trim(), String(nxt.note || "").trim()].filter(Boolean).join(" · ");
        const chW = (c) => (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u3400-\u9fff]/.test(c) ? 9.4 : 5.2);
        const xs = [ga.p1.x, ga.p2.x, gb.p1.x, gb.p2.x];
        const laneW = Math.max(...xs) - Math.min(...xs);
        const maxW = Math.max(64, Math.min(150, laneW - 6));
        let reason = "", boxW = 0;
        if (reasonRaw) {
          let acc = 14; const chars = [...reasonRaw]; let cut = chars.length;
          for (let k = 0; k < chars.length; k++) { acc += chW(chars[k]); if (acc > maxW - 6) { cut = k; break; } }
          reason = cut < chars.length ? chars.slice(0, Math.max(1, cut - 1)).join("") + "…" : reasonRaw;
          boxW = Math.min(maxW, [...reason].reduce((w, c) => w + chW(c), 14));
        }
        const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;
        const lo = Math.min(...xs) + boxW / 2 + 2, hi = Math.max(...xs) - boxW / 2 - 2;
        const boxX = lo <= hi ? Math.min(hi, Math.max(lo, midX)) : (Math.min(...xs) + Math.max(...xs)) / 2;
        return (
          <g key={`tr${i}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="#fff" strokeWidth={5} strokeLinecap="round" />
            <path d={headPath} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={T.arrowRed} strokeWidth={1.5} strokeLinecap="round" />
            <path d={headPath} fill="none" stroke={T.arrowRedDk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={from.x} cy={from.y} r={2.8} fill={T.arrowRedDk} />
            {reason && (
              <g style={{ cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); onSelect(bond.id, nxt.id); }}>
                <title>{reasonRaw}</title>
                <rect x={boxX - boxW / 2} y={midY - 8.5} width={boxW} height={17} rx={4}
                  fill="#fff" stroke={T.arrowRed} strokeWidth={1} />
                <text x={boxX} y={midY + 3.4} textAnchor="middle" fontSize={9} fill={T.arrowRedDk} fontFamily={FB}>{reason}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/* ══ household ══════════════════════════════════════════════════ */
function HouseholdShape({ hh, members, others = [], idx = 0, selected, onSelect }) {
  const pad = 20 + idx * 9;
  /* 구성원이나 가구 밖 사람의 자리가 바뀔 때만 윤곽을 다시 셈한다 */
  const key = members.map((m) => `${m.id}:${m.x}:${m.y}:${m.gender}`).join("|") + "#" + others.map((m) => `${m.x}:${m.y}:${m.gender}`).join("|") + "#" + pad;
  const d = useMemo(() => (members.length ? householdPath(members, others, pad) : ""), [key]);
  if (!members.length) return null;
  const top = members.reduce((m, p) => (p.y < m.y || (p.y === m.y && p.x < m.x) ? p : m), members[0]);
  const txt = `${hh.name || "—"}${hh.year ? ` · ${hh.year}` : ""}`;
  return (
    <g onPointerDown={(e) => { e.stopPropagation(); onSelect(hh.id); }} style={{ cursor: "pointer" }}>
      <path d={d} fill={hh.color} fillOpacity={selected ? 0.1 : 0.05} stroke={hh.color} fillRule="evenodd"
        strokeWidth={selected ? 2.8 : 2} strokeDasharray="9 7" strokeLinejoin="round" />
      <g transform={`translate(${top.x - 10},${top.y - rOf(top) - pad - 6})`}>
        <rect x={-8} y={-14} width={txt.length * 7.4 + 20} height={19} rx={9.5} fill={hh.color} />
        <text x={2} y={0} fontSize={11} fill="#fff" fontFamily={FB} fontWeight={600}>{txt}</text>
      </g>
    </g>
  );
}/* ══ triangle ═══════════════════════════════════════════════════ */
function TriangleShape({ tri, pts, li, selected, onSelect }) {
  if (pts.length < 3 || pts.some((p) => !p)) return null;
  const triBase = TRI_COLORS[tri.colorIdx ?? 0] || TRI_COLOR;
  const col = selected ? T.gold : triBase;
  const [P0, P1, C] = pts;
  const srcIdx = tri.src === 1 ? 1 : 0;
  const Sp = pts[srcIdx], O = pts[srcIdx === 0 ? 1 : 0];
  const a = edgePt(P0, P1, rOf(P0) + 10), b = edgePt(P1, P0, rOf(P1) + 10);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let nx = mid.x - C.x, ny = mid.y - C.y;
  const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  const tail = { x: mid.x + nx * 52, y: mid.y + ny * 52 }, head = { x: mid.x + nx * 20, y: mid.y + ny * 20 };
  const label = [tri.type ? tr(tri.type, li) : tri.typeCustom, tri.note].filter(Boolean).join(" — ");
  const lines = wrapText(label, 20);
  /* 상자 너비를 글자 수 하나로 어림잡으면 한글에서 어긋난다. 영문자
     한 글자는 6px 안팎이지만 한글·한자는 그 두 배 가까이 차지한다.
     "부부 갈등에 자녀가 끼어듦"처럼 한글이 많은 이름이 상자를 벗어난
     것이 이 때문이었다. 줄마다 실제 너비를 글자 종류별로 계산해서
     그중 가장 넓은 줄에 맞춘다. */
  const lineWidth = (t) => [...t].reduce((w, ch) => w + (/[ -ÿ]/.test(ch) ? 6.2 : 11.2), 0);
  const boxW = Math.min(260, Math.max(96, Math.max(0, ...lines.map(lineWidth)) + 20)), boxH = lines.length * 15 + 22;
  const box = { x: mid.x + nx * (58 + boxH / 2), y: mid.y + ny * (58 + boxH / 2) };
  const f1 = edgePt(Sp, C, rOf(Sp) + 10), f2 = edgePt(C, Sp, rOf(C) + 14);
  const fdx = f2.x - f1.x, fdy = f2.y - f1.y, fl = Math.hypot(fdx, fdy) || 1;
  const fux = fdx / fl, fuy = fdy / fl, fnx = -fuy, fny = fux;
  const d1 = edgePt(O, C, rOf(O) + 10), d2 = edgePt(C, O, rOf(C) + 10);
  return (
    <g onPointerDown={(e) => { e.stopPropagation(); onSelect(tri.id); }} style={{ cursor: "pointer" }}>
      <path d={`M ${P0.x} ${P0.y} L ${P1.x} ${P1.y} L ${C.x} ${C.y} Z`} fill={col} opacity={selected ? 0.07 : 0.035} />
      {tri.showDistant !== false && <path d={`M ${d1.x} ${d1.y} L ${d2.x} ${d2.y}`} stroke={col} strokeWidth={1.6} strokeDasharray="2 6" fill="none" opacity={0.8} />}
      <path d={zigzagPath(a, b, 6, 12)} stroke={col} strokeWidth={selected ? 2.8 : 2.2} fill="none" strokeLinejoin="round" />
      <path d={zigzagPath(f1, f2, 9, 22)} stroke={col} strokeWidth={selected ? 3 : 2.6} fill="none" strokeLinejoin="round" />
      <path d={`M ${f2.x} ${f2.y} L ${f2.x - fux * 14 + fnx * 6.5} ${f2.y - fuy * 14 + fny * 6.5} L ${f2.x - fux * 14 - fnx * 6.5} ${f2.y - fuy * 14 - fny * 6.5} Z`} fill={col} />
      <line x1={tail.x} y1={tail.y} x2={head.x} y2={head.y} stroke={col} strokeWidth={2} />
      <path d={`M ${head.x} ${head.y} L ${head.x + nx * 10 + ny * 5} ${head.y + ny * 10 - nx * 5} L ${head.x + nx * 10 - ny * 5} ${head.y + ny * 10 + nx * 5} Z`} fill={col} />
      {lines.length > 0 && (
        <g transform={`translate(${box.x},${box.y})`}>
          <rect x={-boxW / 2} y={-boxH / 2} width={boxW} height={boxH} rx={7} fill="#fff" opacity={0.96} stroke={col} strokeWidth={1.3} />
          <text y={-boxH / 2 + 13} textAnchor="middle" fontSize={9} fill={col} fontFamily={FB} fontWeight={700} opacity={0.75}>
            {tr(["anxiety", "불안", "焦慮"], li)}
          </text>
          {lines.map((l, i) => <text key={i} y={-boxH / 2 + 28 + i * 15} textAnchor="middle" fontSize={10.5} fill={col} fontFamily={FB} fontWeight={600}>{l}</text>)}
        </g>
      )}
    </g>
  );
}

/* ══ side card ══════════════════════════════════════════════════ */
function SideCard({ x, y, w, title, blocks, accent }) {
  let cy = 30;
  const rows = [];
  /* 한글은 영문보다 훨씬 넓게 찍힌다(한 글자가 거의 정사각형). 그런데
     줄바꿈 계산은 영문 기준 폭(6.4px)으로만 되어 있어서, 한글 문장은
     실제로 상자보다 훨씬 긴 줄로 잘못 끊겨 오른쪽 바깥으로 흘러
     넘쳤다. 한글이 섞여 있으면 글자당 너비를 그에 맞게 넓혀 잡는다. */
  const charsPerLine = (text) => {
    const wKo = /[가-힣\u3400-\u9fff]/.test(text || "") ? 11.5 : 6.4;
    return Math.max(4, Math.floor((w - 28) / wKo));
  };
  blocks.forEach((b, bi) => {
    if (b.head) { cy += bi === 0 ? 0 : 8; rows.push({ t: b.head, y: (cy += 15), head: true }); }
    wrapText(b.body, charsPerLine(b.body)).forEach((l) => rows.push({ t: l, y: (cy += 14) }));
  });
  const h = cy + 16;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={10} fill="#fff" stroke={T.rule} strokeWidth={1.4} />
      <rect x={0} y={0} width={4} height={h} rx={2} fill={accent} />
      <text x={16} y={22} fontSize={13} fontFamily={FD} fontWeight={700} fill={T.ink}>{title}</text>
      {rows.map((r, i) => (
        <text key={i} x={16} y={r.y} fontSize={r.head ? 11.5 : 11} fontFamily={FB} fontWeight={r.head ? 600 : 400}
          fill={r.head ? accent : T.ink2}>{r.t}</text>
      ))}
    </g>
  );
}

/* ══ layered family chronology ══════════════════════════════════ */
function focusFamily(doc) {
  const people = doc.people || [], unions = doc.unions || [];
  const kidsOf = (u) => people.filter((p) => p.puid === u.id && !p.preg && p.gender !== "object");
  const proband = people.find((p) => p.proband);
  let union = proband
    ? unions.find((u) => (u.a === proband.id || u.b === proband.id) && kidsOf(u).length)
    : null;
  if (!union && proband?.puid) union = unions.find((u) => u.id === proband.puid) || null;
  if (!union) union = unions.slice().sort((a, b) => kidsOf(b).length - kidsOf(a).length)[0] || null;
  const children = union ? kidsOf(union).slice().sort((a, b) => {
    const ay = Number(a.birth) || 99999, by = Number(b.birth) || 99999;
    return ay - by || a.x - b.x;
  }) : [];
  return { union, children, parentIds: new Set(union ? [union.a, union.b] : []) };
}
function chronologyRows(doc, li) {
  const { children, parentIds } = focusFamily(doc);
  const childIds = new Set(children.map((p) => p.id));
  const rows = [
    { id: "family", label: tr(S.evFamily, li), tone: T.pine },
    { id: "parents", label: tr(S.evParents, li), tone: T.gold },
    ...children.map((p, i) => ({
      id: `person:${p.id}`,
      label: `${tr(S.childLayer, li)} ${i + 1} · ${personName(p, li)}`,
      tone: EVENT_TYPES.birth.color,
    })),
    { id: "other", label: tr(S.otherLayer, li), tone: T.mute },
  ];
  return { rows, parentIds, childIds };
}
function chronologyRowId(e, parentIds, childIds) {
  if (e.scope === "family") return "family";
  if (e.scope === "parents") return "parents";
  if (e.scope === "other") return "other";
  if (e.personId) {
    if (childIds.has(e.personId)) return `person:${e.personId}`;
    if (parentIds.has(e.personId)) return "parents";
    return "other";
  }
  return "family";
}
function chronologyRowCount(doc) { return chronologyRows(doc, 1).rows.length; }
function LayeredChronology({ doc, events, x0, x1, y, title, li }) {
  if (!events.length) return null;
  const years = events.flatMap((e) => [e.year, e.endYear]).filter((v) => v !== null && v !== undefined && v !== "").map(Number).filter(Number.isFinite);
  (doc.transitions || []).forEach((g) => {
    if (g.fromYear !== null && g.fromYear !== undefined && g.fromYear !== "" && Number.isFinite(Number(g.fromYear))) years.push(Number(g.fromYear));
    if (g.toYear !== null && g.toYear !== undefined && g.toYear !== "" && Number.isFinite(Number(g.toYear))) years.push(Number(g.toYear));
  });
  if (!years.length) return null;
  const minYear = Math.min(...years), maxYear = Math.max(...years);
  const span = Math.max(1, maxYear - minYear);
  const labelW = 162, W = Math.max(760, x1 - x0 + 300), plotX = x0 + labelW, plotW = W - labelW - 18;
  const px = (yr) => plotX + ((Number(yr) - minYear) / span) * plotW;
  const step = span > 80 ? 20 : span > 40 ? 10 : span > 18 ? 5 : span > 8 ? 2 : 1;
  const ticks = [];
  for (let t = Math.ceil(minYear / step) * step; t <= maxYear; t += step) ticks.push(t);
  const { rows, parentIds, childIds } = chronologyRows(doc, li);
  const rowH = 58, top = 34, rowY = (i) => top + i * rowH + rowH / 2;
  const byId = Object.fromEntries((doc.people || []).map((p) => [p.id, p]));
  const assigned = events.map((e, i) => ({ ...e, _i: i, _row: chronologyRowId(e, parentIds, childIds) }));
  const rowIndex = Object.fromEntries(rows.map((r, i) => [r.id, i]));
  const transitions = (doc.transitions || []).map((g, gi) => {
    const evs = assigned.filter((e) => e.transitionId === g.id);
    const gy = evs.flatMap((e) => [e.year, e.endYear]).filter((v) => v !== null && v !== undefined && v !== "").map(Number).filter(Number.isFinite);
    const from = g.fromYear !== null && g.fromYear !== undefined && g.fromYear !== "" ? Number(g.fromYear) : (gy.length ? Math.min(...gy) : minYear);
    const to = g.toYear !== null && g.toYear !== undefined && g.toYear !== "" ? Number(g.toYear) : (gy.length ? Math.max(...gy) : from);
    const ris = evs.map((e) => rowIndex[e._row]).filter(Number.isFinite);
    const r0 = ris.length ? Math.min(...ris) : 0, r1 = ris.length ? Math.max(...ris) : rows.length - 1;
    const left = px(from), right = px(to);
    return { ...g, gi, cx: (left + right) / 2, cy: (rowY(r0) + rowY(r1)) / 2,
      rx: Math.max(45, Math.abs(right - left) / 2 + 22), ry: Math.max(27, (rowY(r1) - rowY(r0)) / 2 + 24) };
  });
  return (
    <g transform={`translate(0,${y})`}>
      <text x={x0} y={-16} fontSize={14} fontFamily={FD} fontWeight={700} fill={T.ink}>{title}</text>
      <text x={x0 + W} y={-16} textAnchor="end" fontSize={10.5} fontFamily={FB} fill={T.mute}>
        {tr(["Linked to people in the genogram", "가계도 인물과 자동 연동", "自動連結家系圖人物"], li)}
      </text>
      <rect x={x0} y={0} width={W} height={top + rows.length * rowH + 18} rx={12} fill="#fff" stroke={T.rule} strokeWidth={1.3} />
      {rows.map((r, i) => (
        <g key={r.id}>
          <rect x={x0 + 1} y={top + i * rowH} width={W - 2} height={rowH} fill={i % 2 ? "#F4F7FA" : "#FBFCFD"} />
          <rect x={x0 + 8} y={rowY(i) - 11} width={4} height={22} rx={2} fill={r.tone} opacity={0.8} />
          <text x={x0 + 20} y={rowY(i) + 4} fontSize={11.5} fontFamily={FB} fontWeight={600} fill={T.ink2}>{r.label}</text>
          <line x1={plotX} y1={rowY(i)} x2={plotX + plotW} y2={rowY(i)} stroke="#DDE3DA" strokeWidth={1.1} />
        </g>
      ))}
      <line x1={plotX} y1={top - 7} x2={plotX + plotW} y2={top - 7} stroke={T.ink2} strokeWidth={1.4} />
      {ticks.map((t) => (
        <g key={t} transform={`translate(${px(t)},0)`}>
          <line y1={top - 13} y2={top + rows.length * rowH} stroke="#E8ECE5" strokeWidth={1} />
          <line y1={top - 12} y2={top - 2} stroke={T.ink2} strokeWidth={1.1} />
          <text y={top - 17} textAnchor="middle" fontSize={9.5} fontFamily={FM} fill={T.mute}>{t}</text>
        </g>
      ))}
      {transitions.map((g) => {
        const c = g.color || TRANSITION_COLORS[g.gi % TRANSITION_COLORS.length];
        return <g key={g.id} pointerEvents="none">
          <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill={c} fillOpacity={0.035} stroke={c} strokeWidth={2.1} strokeDasharray="9 6" />
          <g transform={`translate(${g.cx},${g.cy - g.ry - 2})`}>
            <rect x={-Math.max(40, String(g.label || "").length * 3.4 + 10)} y={-12} width={Math.max(80, String(g.label || "").length * 6.8 + 20)} height={18} rx={9} fill="#fff" stroke={c} strokeWidth={1.1} />
            <text y={1} textAnchor="middle" fontSize={10} fontFamily={FB} fontWeight={700} fill={c}>{g.label || tr(S.transitionTitle, li)}</text>
          </g>
        </g>;
      })}
      {assigned.map((e) => {
        const ri = rowIndex[e._row] ?? rows.length - 1;
        const c = (EVENT_TYPES[e.type] || EVENT_TYPES.other).color;
        const ex = px(e.year), ey = rowY(ri);
        const rowEvents = assigned.filter((x) => x._row === e._row && Number(x.year) === Number(e.year));
        const lane = Math.max(0, rowEvents.findIndex((x) => x.id === e.id));
        const dy = lane % 2 ? 13 : -13;
        const pname = e.personId && e._row === "other" ? `${personName(byId[e.personId], li)} · ` : "";
        const raw = `${pname}${e.title || ""}`;
        const txt = raw.length > 22 ? raw.slice(0, 21) + "…" : raw;
        const anchorEnd = ex > plotX + plotW - 120;
        const tw = Math.max(54, txt.length * 6 + 14);
        return (
          <g key={e.id}>
            {e.endYear && Number(e.endYear) > Number(e.year) && <line x1={ex} y1={ey} x2={px(e.endYear)} y2={ey} stroke={c} strokeWidth={4} opacity={0.35} strokeLinecap="round" />}
            <circle cx={ex} cy={ey} r={4.2} fill={c} stroke="#fff" strokeWidth={1.5} />
            <line x1={ex} y1={ey} x2={ex} y2={ey + dy} stroke={c} strokeWidth={1} />
            <g transform={`translate(${ex + (anchorEnd ? -6 : 6)},${ey + dy})`}>
              <rect x={anchorEnd ? -tw : 0} y={-9} width={tw} height={18} rx={8} fill="#fff" stroke={c} strokeWidth={0.9} />
              <text x={anchorEnd ? -7 : 7} y={3.5} textAnchor={anchorEnd ? "end" : "start"} fontSize={9.5} fontFamily={FB} fill={c} fontWeight={600}>{txt}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

/* ══ time-line genogram (Friedman, Rohrbaugh & Krakauer 1988) ═══ */
/* 타임라인 요소 끌기 — 화면 픽셀을 도면 단위로 되돌려 쓴다.
   옮긴 뒤에도 실제 연도 자리는 점선으로 남겨, 시간이 곧 위치라는
   타임라인의 약속이 깨지지 않게 한다. */
function DragG({ id, pos, k, axis = "both", onMove, children, transform = true }) {
  const st = useRef(null);
  const dx = pos?.dx || 0, dy = pos?.dy || 0;
  const down = (e) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    st.current = { sx: e.clientX, sy: e.clientY, dx, dy };
  };
  const move = (e) => {
    if (!st.current) return;
    e.stopPropagation();
    const nx = st.current.dx + (e.clientX - st.current.sx) / (k || 1);
    const ny = st.current.dy + (e.clientY - st.current.sy) / (k || 1);
    onMove(id, axis === "y" ? st.current.dx : nx, axis === "x" ? st.current.dy : ny);
  };
  const up = (e) => { st.current = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 무시 */ } };
  return (
    <g transform={transform ? `translate(${dx},${dy})` : undefined} style={{ cursor: "move" }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>{children}</g>
  );
}

function TimeLineGenogram({ doc, scale, win, sel, li, onSelectPerson, onSelectBond, onSelectUnion, tlgPos = {}, onMove, viewK = 1 }) {
  const L = tlgLayout(doc, scale, win);
  const { born, est, yOf, minYear, maxYear } = L;
  const move = onMove || (() => {});
  const at = (key) => tlgPos[key] || null;
  /* 생애선을 좌우로 옮기면 거기 매달린 결혼선·관계선·사건이 함께 따라온다 */
  const cols = {};
  Object.entries(L.cols).forEach(([id, x]) => { cols[id] = x + (tlgPos[`p:${id}`]?.dx || 0); });
  const x0 = -90, x1 = L.width + 90, bottom = yOf(maxYear);
  const inR = (yr) => yr >= minYear && yr <= maxYear;
  const ticks = [];
  for (let t = minYear; t <= maxYear; t += 5) {
    const dec = t % 10 === 0;
    ticks.push(
      <g key={t}>
        <line x1={x0} y1={yOf(t)} x2={x1} y2={yOf(t)} stroke={dec ? "#D8DED4" : "#EDF0EA"} strokeWidth={dec ? 1.2 : 1} />
        <text x={x0 - 8} y={yOf(t) + 4} textAnchor="end" fontSize={11} fontFamily={FM} fill={dec ? T.ink2 : T.mute}>{t}</text>
        <text x={x1 + 8} y={yOf(t) + 4} fontSize={11} fontFamily={FM} fill={dec ? T.ink2 : T.mute}>{t}</text>
      </g>
    );
  }
  const unionArt = [];
  doc.unions.forEach((u) => {
    const a = doc.people.find((p) => p.id === u.a), b = doc.people.find((p) => p.id === u.b);
    if (!a || !b || cols[a.id] === undefined || cols[b.id] === undefined) return;
    const kids = doc.people.filter((k) => k.puid === u.id && born[k.id]);
    const my = u.mYear ? +u.mYear : kids.length ? Math.min(...kids.map((k) => born[k.id])) - 1
      : Math.max(born[a.id] || minYear, born[b.id] || minYear) + 26;
    const xa = cols[a.id], xb = cols[b.id];
    const selU = sel?.kind === "union" && sel.id === u.id;
    const col = selU ? T.gold : T.line;
    if (inR(my)) {
      unionArt.push(
        <g key={u.id} onPointerDown={(e) => { e.stopPropagation(); onSelectUnion(u.id); }} style={{ cursor: "pointer" }}>
          <line x1={xa} y1={yOf(my)} x2={xb} y2={yOf(my)} stroke={col} strokeWidth={selU ? 3 : 2}
            strokeDasharray={u.type === "cohabit" || u.type === "engaged" ? "7 5" : undefined} />
          <text x={(xa + xb) / 2} y={yOf(my) - 6} textAnchor="middle" fontSize={10} fontFamily={FM} fill={T.ink2}>
            m.{String(my).slice(2)}{u.mYear ? "" : "≈"}
          </text>
          <line x1={xa} y1={yOf(my)} x2={xb} y2={yOf(my)} stroke="transparent" strokeWidth={14} />
        </g>
      );
    }
    if (u.eYear && inR(+u.eYear)) {
      const ey = yOf(+u.eYear), mx = (xa + xb) / 2;
      unionArt.push(
        <g key={u.id + "e"}>
          <line x1={xa} y1={ey} x2={xb} y2={ey} stroke={T.red} strokeWidth={1.6} strokeDasharray="6 5" />
          <line x1={mx - 9} y1={ey + 7} x2={mx - 1} y2={ey - 7} stroke={T.red} strokeWidth={1.8} />
          {u.type === "divorced" && <line x1={mx + 1} y1={ey + 7} x2={mx + 9} y2={ey - 7} stroke={T.red} strokeWidth={1.8} />}
          <text x={mx} y={ey + 18} textAnchor="middle" fontSize={10} fontFamily={FM} fill={T.red}>
            {u.type === "divorced" ? "d." : "s."}{String(u.eYear).slice(2)}
          </text>
        </g>
      );
    }
    kids.forEach((k) => {
      if (cols[k.id] === undefined || !inR(born[k.id])) return;
      unionArt.push(<path key={u.id + k.id} d={`M ${(xa + xb) / 2} ${yOf(my)} L ${cols[k.id]} ${yOf(born[k.id])}`}
        stroke={T.line} strokeWidth={1.4} fill="none" strokeDasharray={k.link === "adopt" || k.link === "foster" ? "5 4" : undefined} />);
    });
  });
  const bondArt = [];
  doc.bonds.forEach((bd) => {
    const a = doc.people.find((p) => p.id === bd.a), b = doc.people.find((p) => p.id === bd.b);
    if (!a || !b || cols[a.id] === undefined || cols[b.id] === undefined) return;
    const selB = sel?.kind === "bond" && sel.id === bd.id;
    const left = Math.min(cols[a.id], cols[b.id]), right = Math.max(cols[a.id], cols[b.id]);
    const towardB = cols[b.id] > cols[a.id];
    const segs = sortedSegments(bd);
    let prevEndY = null;   // 이전 구간이 끝난 높이 — 다음 구간 시작과 이어 화살표를 그린다
    let prevGlyph = null;
    let prevY = null, prevType = null;   // 끝 연도를 적지 않았어도 전환을 그리기 위한 기준
    segs.forEach((sg, si) => {
      const meta = BOND_TYPES[sg.type] || BOND_TYPES.harmony;
      const fwd = sg.rev ? !towardB : towardB;   // 뒤집어 붙인 구간은 화살표 방향도 반대
      const col = selB ? T.gold : bondColor(sg.type);
      const start = sg.from ? +sg.from : (si === 0 ? Math.max(born[a.id] || minYear, born[b.id] || minYear) + 16 : null);
      if (start === null || !inR(start)) { prevEndY = sg.to && inR(+sg.to) ? yOf(+sg.to) : prevEndY; return; }
      const y = yOf(start);
      const p1 = { x: left + 12, y }, p2 = { x: right - 12, y };
      const kinds = kindsOf(meta);
      const pillText = kinds && sg.kind && kinds[sg.kind] ? tr(kinds[sg.kind], li) : "";
      const parts = bondGlyphParts(meta, fwd?p1:p2, fwd?p2:p1, col, `${bd.id}-${si}-`, 0, pillText);
      const labelsOn=!!doc.viewPrefs?.label||sg.emphasize;
      const tag = labelsOn ? tr(meta.label, li) : "";
      const midx = (p1.x + p2.x) / 2;

      /* 이전 구간에서 이 구간으로 — 무엇이 무엇으로 바뀌었는지를 화살표에 적는다.
         끝 연도를 적지 않은 구간도 앞 구간의 시작 높이를 기준으로 이어 그린다. */
      const anchorY = prevEndY !== null ? prevEndY : prevY;
      if (anchorY !== null && prevType && anchorY < y - 6) {
        const fromLbl = tr((BOND_TYPES[prevType] || BOND_TYPES.harmony).label, li);
        const toLbl = tr(meta.label, li);
        const changeTxt = labelsOn ? `${fromLbl} → ${toLbl}` : "";
        const cw = changeTxt.length * 5.4 + 12;
        const my = (anchorY + y) / 2;
        const here=glyphPoint(meta,fwd?p1:p2,fwd?p2:p1,0,.5);
        const transitionFrom=prevEndY!==null?{x:midx,y:anchorY}:(prevGlyph||{x:midx,y:anchorY});
        const transitionArrow=arrowGeometry(transitionFrom,here);
        bondArt.push(
          <g key={`${bd.id}-${si}-tr`}>
            <line x1={transitionFrom.x} y1={transitionFrom.y} x2={here.x} y2={here.y} stroke={col} strokeWidth={1.4} strokeDasharray="4 3" />
            <circle cx={transitionFrom.x} cy={transitionFrom.y} r={2.8} fill={col}/>
            <path d={transitionArrow.head} fill="none" stroke={col} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"/>
            {at(`t:${bd.id}:${sg.id}`) && (
              <line x1={midx} y1={my} x2={midx + (at(`t:${bd.id}:${sg.id}`).dx || 0)} y2={my + (at(`t:${bd.id}:${sg.id}`).dy || 0)}
                stroke={col} strokeWidth={0.9} strokeDasharray="2 3" opacity={0.6} />
            )}
            {changeTxt && <DragG id={`t:${bd.id}:${sg.id}`} pos={at(`t:${bd.id}:${sg.id}`)} k={viewK} onMove={move}>
              <rect x={midx - cw / 2} y={my - 8} width={cw} height={14} rx={7} fill="#fff" opacity={0.95} stroke={col} strokeWidth={0.9} />
              <text x={midx} y={my + 2.5} textAnchor="middle" fontSize={9} fontFamily={FB} fontWeight={600} fill={col}>{changeTxt}</text>
            </DragG>}
            {sg.note && segs.length > 1 && (
              <text x={midx + cw / 2 + 6} y={my + 3} fontSize={8.5} fontFamily={FB} fill={col} fontStyle="italic">{sg.note}</text>
            )}
          </g>
        );
      }
      prevY = y; prevType = sg.type;prevGlyph=glyphPoint(meta,fwd?p1:p2,fwd?p2:p1,0,.5);

      bondArt.push(
        <g key={`${bd.id}-${si}`} onPointerDown={(e) => { e.stopPropagation(); onSelectBond(bd.id); }} style={{ cursor: "pointer" }}>
          {parts}
          <text x={midx} y={y - 9} textAnchor="middle" fontSize={9.5} fontFamily={FB} fontWeight={600} fill={col}>
            {tag}{sg.from ? ` ${String(sg.from).slice(2)}~${sg.to ? String(sg.to).slice(2) : ""}` : ""}
          </text>
          {segs.length > 1 && sg.note && (
            <text x={midx} y={y + 15} textAnchor="middle" fontSize={8.5} fontFamily={FB} fill={col} fontStyle="italic">{sg.note}</text>
          )}
          <line x1={p1.x} y1={y} x2={p2.x} y2={y} stroke="transparent" strokeWidth={16} />
        </g>
      );

      if (sg.to && inR(+sg.to)) {
        const ey = yOf(+sg.to);
        bondArt.push(
          <g key={`${bd.id}-${si}-end`}>
            <line x1={p1.x} y1={ey} x2={p2.x} y2={ey} stroke={col} strokeWidth={1} strokeDasharray="3 4" opacity={0.55} />
            <line x1={midx - 6} y1={ey - 8} x2={midx - 6} y2={ey + 8} stroke={col} strokeWidth={2.2} />
          </g>
        );
        prevEndY = ey;
      } else {
        prevEndY = null;   // 끝난 연도가 없으면(현재까지 지속) 다음 구간과 잇지 않는다
      }
    });
  });
  /* 논문 Figure 4 방식 — 증상을 이름 옆이 아니라 생애선의 그 해 자리에 둔다.
     시작에 ↑, 끝에 ↓, 그 사이를 굵은 세로 막대로 잇는다. 이렇게 놓으면
     그 사람의 평생 속성이 아니라 겪어 낸 시기로 읽힌다. */
  const markArt = [];
  const MARKS = [
    { k: "phys", color: "#6E93A8", label: ["Illness", "질환", "疾病"] },
    { k: "ment", color: "#7C6EA8", label: ["Mental health", "정신건강", "心理健康"] },
    { k: "addi", color: T.amber, label: ["Addiction", "중독", "成癮"] },
  ];
  doc.people.forEach((p) => {
    if (cols[p.id] === undefined) return;
    const x = cols[p.id];
    let lane = 0;
    MARKS.forEach((m) => {
      if (!p[m.k]) return;
      const fy = p[m.k + "From"] ? +p[m.k + "From"] : null;
      if (!fy || !inR(fy)) return;
      const ty = p[m.k + "To"] && inR(+p[m.k + "To"]) ? +p[m.k + "To"] : null;
      const y1 = yOf(fy), y2 = ty ? yOf(ty) : null;
      const bx = x - 13 - lane * 9;                       // 생애선 왼쪽으로 차곡차곡
      lane += 1;
      markArt.push(
        <g key={`mk-${p.id}-${m.k}`}>
          <line x1={bx} y1={y1} x2={bx} y2={y2 || bottom - 14} stroke={m.color} strokeWidth={2.4}
            strokeDasharray={y2 ? undefined : "5 4"} opacity={0.9} />
          <path d={`M ${bx} ${y1 - 7} L ${bx - 4} ${y1 + 1} L ${bx + 4} ${y1 + 1} Z`} fill={m.color} />
          {y2 && <path d={`M ${bx} ${y2 + 7} L ${bx - 4} ${y2 - 1} L ${bx + 4} ${y2 - 1} Z`} fill={m.color} />}
          <text x={bx - 6} y={y1 + 1} textAnchor="end" fontSize={9.5} fontFamily={FB} fontWeight={600} fill={m.color}
            stroke="#fff" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
            {tr(m.label, li)}{ty ? ` ${String(fy).slice(2)}–${String(ty).slice(2)}` : ` ${String(fy).slice(2)}~`}
          </text>
        </g>
      );
    });
  });

  const eventArt = [];
  (doc.events || []).forEach((e) => {
    if (!inR(+e.year)) return;
    const c = (EVENT_TYPES[e.type] || EVENT_TYPES.other).color;
    if (e.personId && cols[e.personId] !== undefined) {
      const x = cols[e.personId], y = yOf(+e.year);
      eventArt.push(
        <g key={e.id}>
          <circle cx={x} cy={y} r={3.4} fill={c} />
          {e.endYear && inR(+e.endYear) && (
            <g>
              <line x1={x + 9} y1={y} x2={x + 9} y2={yOf(+e.endYear)} stroke={c} strokeWidth={1.6} />
              <path d={`M ${x + 9} ${y} L ${x + 5.5} ${y + 7} L ${x + 12.5} ${y + 7} Z`} fill={c} />
              <path d={`M ${x + 9} ${yOf(+e.endYear)} L ${x + 5.5} ${yOf(+e.endYear) - 7} L ${x + 12.5} ${yOf(+e.endYear) - 7} Z`} fill={c} />
            </g>
          )}
          {at(`e:${e.id}`) && (
            <line x1={x + 15} y1={y} x2={x + 15 + (at(`e:${e.id}`).dx || 0)} y2={y + (at(`e:${e.id}`).dy || 0)}
              stroke={c} strokeWidth={0.9} strokeDasharray="2 3" opacity={0.6} />
          )}
          <DragG id={`e:${e.id}`} pos={at(`e:${e.id}`)} k={viewK} onMove={move}>
            <text x={x + 15} y={y + 4} fontSize={10} fontFamily={FB} fill={c} fontWeight={500}
              stroke="#fff" strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke">{e.title}</text>
          </DragG>
        </g>
      );
    } else {
      eventArt.push(
        <g key={e.id}>
          <line x1={x0} y1={yOf(+e.year)} x2={x1} y2={yOf(+e.year)} stroke={c} strokeWidth={1} strokeDasharray="2 6" opacity={0.75} />
          <text x={x0 + 4} y={yOf(+e.year) - 4} fontSize={10} fontFamily={FB} fill={c} fontWeight={600}>{e.title}</text>
        </g>
      );
    }
  });
  const personArt = L.people.map((p) => {
    const x = cols[p.id], bY = born[p.id];
    if (bY === undefined) return null;
    const top = yOf(bY), end = yOf(Math.min(p.death ? +p.death : maxYear, maxYear));
    const selP = sel?.kind === "person" && sel.id === p.id;
    const bold = p.proband, col = selP ? T.gold : T.ink, symY = top + 26;
    const Sym = () => p.gender === "female"
      ? <circle cx={x} cy={symY} r={13} fill="#fff" stroke={col} strokeWidth={bold ? 2.4 : 1.8} />
      : p.gender === "male"
        ? <rect x={x - 12.5} y={symY - 12.5} width={25} height={25} fill="#fff" stroke={col} strokeWidth={bold ? 2.4 : 1.8} />
        : p.gender === "object"
          ? <rect x={x - 15} y={symY - 10} width={30} height={20} rx={6} fill={T.ink2} stroke={col} strokeWidth={1.6} />
          : <path d={`M ${x} ${symY - 14} L ${x + 14} ${symY} L ${x} ${symY + 14} L ${x - 14} ${symY} Z`} fill="#fff" stroke={col} strokeWidth={1.8} />;
    const shifted = tlgPos[`p:${p.id}`]?.dx;
    return (
      <g key={p.id}>
        {shifted ? (
          <line x1={L.cols[p.id]} y1={top} x2={L.cols[p.id]} y2={end} stroke={T.faint} strokeWidth={1}
            strokeDasharray="2 5" opacity={0.7} />
        ) : null}
      <DragG id={`p:${p.id}`} pos={at(`p:${p.id}`)} k={viewK} axis="x" onMove={move} transform={false}>
      <g onPointerDown={(e) => { e.stopPropagation(); onSelectPerson(p.id); }}>
        <line x1={x} y1={top} x2={x} y2={end} stroke={selP ? T.gold : T.line} strokeWidth={bold ? 2.6 : 1.5} />
        <circle cx={x} cy={top} r={3} fill={p.birth ? T.ink : "#fff"} stroke={T.ink} strokeWidth={1.2} />
        <text x={x + 7} y={top + 3} fontSize={10} fontFamily={FM} fill={est[p.id] ? T.mute : T.ink2}>{est[p.id] ? "≈" : ""}{String(bY).slice(2)}</text>
        <Sym />
        {p.proband && (p.gender === "female"
          ? <circle cx={x} cy={symY} r={9.5} fill="none" stroke={col} strokeWidth={1.5} />
          : <rect x={x - 9} y={symY - 9} width={18} height={18} fill="none" stroke={col} strokeWidth={1.5} />)}
        {p.deceased && <path d={`M ${x - 12} ${symY - 12} L ${x + 12} ${symY + 12} M ${x + 12} ${symY - 12} L ${x - 12} ${symY + 12}`} stroke={T.ink} strokeWidth={1.4} />}
        <text x={x} y={symY + 27} textAnchor="middle" fontSize={10.5} fontFamily={FB} fontWeight={600} fill={T.ink}
          stroke="#fff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">{personName(p, li)}</text>
        {p.death ? (
          <g><rect x={x - 11} y={end - 3} width={22} height={6} fill={T.ink} />
            <text x={x + 15} y={end + 4} fontSize={10} fontFamily={FM} fill={T.ink}>{String(p.death).slice(2)}</text></g>
        ) : <path d={`M ${x} ${end + 8} L ${x - 4.5} ${end - 2} L ${x + 4.5} ${end - 2} Z`} fill={T.line} />}
      </g>
      </DragG>
      </g>
    );
  });
  return (
    <g>
      {ticks}
      <line x1={x0} y1={0} x2={x0} y2={bottom} stroke={T.ink2} strokeWidth={1.4} />
      <line x1={x1} y1={0} x2={x1} y2={bottom} stroke={T.ink2} strokeWidth={1.4} />
      {markArt}{eventArt}{unionArt}{personArt}{bondArt}
      <text x={x1} y={bottom + 26} textAnchor="end" fontSize={11} fontFamily={FB} fill={T.mute}>
        {YEAR} · ≈ estimated
      </text>
    </g>
  );
}

/* ══ shared drawing layers ══════════════════════════════════════ */
const NOOP = () => {};
function Layers({ doc, li, detail, sel, showStory, showTL, tlg, tlgScale, tlgWin, stdInset, hhDraft, pending,
  onMove, viewK, vis, msel, onPerson = NOOP, onUnion = NOOP, onBond = NOOP, onHH = NOOP, onTri = NOOP, onDown = null }) {
  if (tlg) {
    return <TlgScene doc={doc} li={li} sel={sel} scale={tlgScale} win={tlgWin} stdInset={stdInset}
      onMove={onMove} viewK={viewK} onPerson={onPerson} onBond={onBond} onUnion={onUnion} />;
  }
  return <StandardScene doc={doc} li={li} detail={detail} sel={sel} showStory={showStory} showTL={showTL}
    hhDraft={hhDraft} pending={pending} vis={vis} msel={msel} onPerson={onPerson} onUnion={onUnion} onBond={onBond}
    onHH={onHH} onTri={onTri} onDown={onDown} />;
}

/* ══ 표준 가계도 화면 — 편집 화면과 타임라인의 구조 창에서 함께 쓴다 ══ */
const ALL_ON = { hh: true, tri: true, bond: true, ink: true, note: true, band: true, attr: true, label: false };
/* 세대 띠 색 — 짙으면 관계선과 헷갈리므로 옅은 색만 고를 수 있게
   세 가지로 좁혀 둔다. */
const BAND_PALETTES = { blue: "#F4F7FA", sage: "#F2F6F0", sand: "#FBF6EC" };
/* 한 사람에게 붙일 수준 표지를 모은다 */
function attrChipsOf(p, doc, li) {
  const a = p.attrs || {};
  const out = [];
  if (typeof a.diff === "number") {
    out.push({ key: "diff", frac: a.diff / 100, col: CHIP_COLORS[0], text: `${tr(["Diff", "분화", "分化"], li)} ${a.diff}`,
      title: `${tr(S.diffF, li)} — ${a.diff} · ${tr(S.diffBands[DIFF_BAND(a.diff)], li)}` });
  }
  (doc.attrLayers || []).forEach((L, li2) => {
    const nm = scaleName(L);
    if (!nm) return;
    /* 값이 직접 설정된 경우에만 칩으로 표시한다.
       이전에 미설정자도 50으로 보여줬더니 모든 기호에
       칩이 가득 차서 가계도가 복잡해졌다는 요청에 따른 것이다. */
    const v = a[L.id];
    if (typeof v !== "number") return;
    const short = nm.length > 5 ? nm.slice(0, 4) + "…" : nm;
    /* 색은 칸 순서로 고정한다 — 자아분화 0, 현장 척도 1·2·3 → 1·2·3.
       분화 값이 없는 사람에게서 척도 색이 밀리지 않고, 메뉴의 슬라이더 색과도 맞는다. */
    const ci = (li2 + 1) % CHIP_COLORS.length;
    out.push({ key: L.id, frac: v / 100, col: CHIP_COLORS[ci], text: `${short} ${v}`, title: `${nm} — ${v} / 100` });
  });
  return out;
}
function StandardScene({ doc, li, detail, sel, showStory, showTL, hhDraft, pending, vis, msel,
  onPerson = NOOP, onUnion = NOOP, onBond = NOOP, onHH = NOOP, onTri = NOOP, onDown = null }) {
  const V = vis || {...ALL_ON,...(doc.viewPrefs||{})};
  const grouped = msel || [];
  const byId = useMemo(() => Object.fromEntries(doc.people.map((p) => [p.id, p])), [doc.people]);
  const gens = useMemo(() => computeGens(doc.people, doc.unions), [doc.people, doc.unions]);
  const maxGen = Math.max(0, ...Object.values(gens));
  /* 세대 띠 — 예전에는 "몇 번째 세대인가"라는 숫자에 고정 간격(GEN_H)을 곱해
     띠 위치를 정했다. 그래서 사람을 손으로 옮기거나 자동배치가 표준 간격을
     벗어나면 띠가 실제 그림과 어긋났다. 이제는 각 세대에 속한 사람들의
     실제 y좌표로 띠의 위아래 경계를 정해, 그림이 어떻게 놓이든 항상 맞는다. */
  const genBands = useMemo(() => {
    const byGen = Array.from({ length: maxGen + 1 }, () => []);
    doc.people.forEach((p) => { const g = gens[p.id] ?? 0; if (byGen[g]) byGen[g].push(p.y); });
    const PAD = 90;
    return byGen.map((ys, g) => {
      if (!ys.length) return { top: g * GEN_H - PAD, bottom: g * GEN_H - PAD + GEN_H };
      const lo = Math.min(...ys), hi = Math.max(...ys);
      const prevYs = byGen[g - 1], nextYs = byGen[g + 1];
      const top = prevYs && prevYs.length ? (Math.max(...prevYs) + lo) / 2 : lo - PAD;
      const bottom = nextYs && nextYs.length ? (hi + Math.min(...nextYs)) / 2 : hi + PAD;
      return { top, bottom };
    });
  }, [doc.people, gens, maxGen]);
  /* 한 사람에게 결혼이 여럿이면 선을 층층이 내려 쌓는다. 다만 이미
     배우자를 위아래로 옮겨 두 선의 높이가 다르면 쌓지 않는다.

     예전에는 높이와 상관없이 무조건 쌓았다. 그래서 배우자를 위로
     올려도 그만큼 다시 아래로 밀려나, 선이 따라 올라오지 않는 것처럼
     보였다. 높이로 이미 구별되면 쌓을 이유가 없다. */
  const unionLevel = useMemo(() => {
    const pos = Object.fromEntries(doc.people.map((p) => [p.id, p.y]));
    const posX = Object.fromEntries(doc.people.map((p) => [p.id, p.x]));
    /* 예전에는 "같은 사람이 낀 결혼"만 층을 나눴다. 그래서 서로 아무
       관계 없는 두 부부라도 같은 세대 높이에 있고 가로 폭이 겹치면
       가로선이 똑같은 높이에 그려져 한 줄로 이어진 것처럼 보이거나
       자녀선과 엉켰다. 이제는 사람을 공유하지 않아도, 같은 높이에서
       폭이 겹치면 아래 층으로 내려 긋는다. */
    const lvl = {}, placed = [];
    const ordered = [...doc.unions].sort((u1, u2) => {
      const y1 = Math.max(pos[u1.a] ?? 0, pos[u1.b] ?? 0);
      const y2 = Math.max(pos[u2.a] ?? 0, pos[u2.b] ?? 0);
      return y1 - y2;
    });
    ordered.forEach((u) => {
      const base = Math.max(pos[u.a] ?? 0, pos[u.b] ?? 0);
      const ax = posX[u.a] ?? 0, bx = posX[u.b] ?? 0;
      const lo = Math.min(ax, bx), hi = Math.max(ax, bx);
      let k = 0;
      for (let guard = 0; guard < 12; guard++) {
        const clash = placed.some((e) =>
          e.lvl === k && Math.abs(e.base - base) < 30
          && (e.shares(u) || (lo < e.hi + 24 && hi > e.lo - 24)));
        if (!clash) break;
        k += 1;
      }
      lvl[u.id] = k;
      placed.push({ base, lvl: k, lo, hi,
        shares: (v) => v.a === u.a || v.a === u.b || v.b === u.a || v.b === u.b });
    });
    return lvl;
  }, [doc.unions, doc.people]);
  const xs = doc.people.map((p) => p.x), ys = doc.people.map((p) => p.y);
  const b = doc.people.length
    ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    : { minX: -300, maxX: 300, minY: -100, maxY: 300 };
  const st = doc.story || {}, cx = doc.context || { vert: [], horiz: [] };
  const storyBlocks = [
    st.problem && { head: tr(S.stProblem, li), body: st.problem },
    st.history && { head: tr(S.stHistory, li), body: st.history },
    st.strengths && { head: tr(S.stStrength, li), body: st.strengths },
    st.note && { head: tr(S.stNote, li), body: st.note },
  ].filter(Boolean);
  const ctxBlocks = [
    cx.vert?.length && { head: tr(S.ctxVert, li), body: cx.vert.map((v) => tr(v, li)).join(" · ") },
    cx.horiz?.length && { head: tr(S.ctxHoriz, li), body: cx.horiz.map((v) => tr(v, li)).join(" · ") },
    cx.ring && { head: tr(S.ctxRing, li), body: tr(cx.ring, li) },
    cx.note && { head: tr(S.ctxRead, li), body: cx.note },
  ].filter(Boolean);
  const autoEvents = [];
  doc.people.forEach((p) => {
    if (p.birth) autoEvents.push({ id: "b" + p.id, year: +p.birth, type: "birth", scope: "person", personId: p.id, title: `${personName(p, li)} ${tr(["b.", "출생", "生"], li)}` });
    if (p.death) autoEvents.push({ id: "d" + p.id, year: +p.death, type: "death", scope: "person", personId: p.id, title: `${personName(p, li)} ${tr(["d.", "사망", "歿"], li)}` });
  });
  doc.unions.forEach((u) => {
    const n = `${personName(byId[u.a], li)}·${personName(byId[u.b], li)}`;
    const focal = focusFamily(doc).union?.id === u.id;
    if (u.mYear) autoEvents.push({ id: "m" + u.id, year: +u.mYear, type: "marriage", scope: focal ? "parents" : "family", title: `${n} ${tr(UNION_TYPES[u.type].label, li)}` });
    if (u.eYear) autoEvents.push({ id: "e" + u.id, year: +u.eYear, type: "divorce", scope: focal ? "parents" : "family", title: `${n} ${tr(UNION_TYPES[u.type].label, li)}` });
  });
  const allEvents = [...autoEvents, ...(doc.events || [])].filter((e) => !isNaN(+e.year)).sort((a, b2) => a.year - b2.year);

  return (
    <>
      {/* Math.max(0, ...) 는 인물이 하나도 없을 때 0을 돌려준다.
         그러면 maxGen+1 이 1이 되어, 빈 캔버스에도 "1세대 · 조부모"
         띠 하나가 남아 있었다. 그려진 사람이 있을 때만 띠를 낸다. */}
      {doc.people.length > 0 && genBands.map((band, g) => (
        <g key={g}>
          <rect x={-4000} y={band.top} width={8000} height={Math.max(40, band.bottom - band.top)} fill={g % 2 && V.band ? (BAND_PALETTES[doc.viewPrefs?.bandColor] || T.band) : "transparent"} opacity={0.7} pointerEvents="none" />
          <text x={b.minX - 200} y={band.top + 28} fontSize={11.5} fill={T.sage} fontFamily={FB} pointerEvents="none">
            {tr([["1 · Grandparents", "2 · Parents", "3 · Index & siblings", "4 · Children", "5 · Grandchildren"][g] || `${g + 1}`,
              ["1세대 · 조부모", "2세대 · 부모", "3세대 · 본인·형제", "4세대 · 자녀", "5세대 · 손자녀"][g] || `${g + 1}세대`,
              ["第一代・祖父母", "第二代・父母", "第三代・本人與手足", "第四代・子女", "第五代・孫輩"][g] || `第${g + 1}代`], li)}
          </text>
        </g>
      ))}
      {V.hh && doc.households.map((h, i) => (
        <HouseholdShape key={h.id} hh={h} idx={i} members={h.members.map((m) => byId[m]).filter(Boolean)}
          others={doc.people.filter((p) => !h.members.includes(p.id))}
          selected={sel?.kind === "household" && sel.id === h.id} onSelect={onHH} />
      ))}
      {V.hh && hhDraft && hhDraft.members.length > 0 && (
        <HouseholdShape hh={hhDraft} idx={doc.households.length} members={hhDraft.members.map((m) => byId[m]).filter(Boolean)}
          others={doc.people.filter((p) => !hhDraft.members.includes(p.id))} selected onSelect={NOOP} />
      )}
      {V.tri && doc.triangles.map((t) => (
        <TriangleShape key={t.id} tri={t} li={li} pts={t.ids.map((i) => byId[i])}
          selected={sel?.kind === "triangle" && sel.id === t.id} onSelect={onTri} />
      ))}
      {doc.unions.map((u) => (
        <UnionEdge key={u.id} u={u} a={byId[u.a]} b={byId[u.b]} level={unionLevel[u.id] || 0} detail={detail}
          kids={doc.people.filter((p) => p.puid === u.id)}
          selected={sel?.kind === "union" && sel.id === u.id} onSelect={onUnion} li={li} />
      ))}
      {V.bond && doc.bonds.map((bd) => (
        <BondEdge key={bd.id} bond={bd} a={byId[bd.a]} b={byId[bd.b]} li={li} people={doc.people} bonds={doc.bonds}
          selected={sel?.kind === "bond" && sel.id === bd.id}
          selSeg={sel?.kind === "bond" && sel.id === bd.id ? sel.seg : null} onSelect={onBond}
          showLabels={V.label !== false} />
      ))}
      {grouped.length > 1 && grouped.map((id) => byId[id]).filter(Boolean).map((p) => (
        <circle key={"ms" + p.id} cx={p.x} cy={p.y} r={rOf(p) + 11} fill="none"
          stroke={T.gold} strokeWidth={2} strokeDasharray="4 4" opacity={0.9} pointerEvents="none" />
      ))}
      {doc.people.map((p) => (
        <PersonNode key={p.id} p={p} detail={detail} li={li} attrChips={V.attr === false ? null : attrChipsOf(p, doc, li)}
          events={detail ? (doc.events||[]).filter(e=>e.personId===p.id).sort((a,b)=>a.year-b.year) : null}
          selected={(sel?.kind === "person" && sel.id === p.id) || pending?.includes(p.id) || hhDraft?.members.includes(p.id)}
          onDown={onDown ? (e) => onDown(e, p) : NOOP} />
      ))}
      {showStory && storyBlocks.length > 0 && <SideCard x={b.minX - 400} y={b.minY - 70} w={300} title={tr(S.storyTitle, li)} blocks={storyBlocks} accent={T.pine} />}
      {showStory && ctxBlocks.length > 0 && <SideCard x={b.maxX + 110} y={b.minY - 70} w={300} title={tr(S.ctxTitle, li)} blocks={ctxBlocks} accent={TRI_COLOR} />}
      {showTL && <LayeredChronology doc={doc} events={allEvents} x0={b.minX - 120} x1={b.maxX + 120} y={b.maxY + 210} title={tr(S.tlTitle, li)} li={li} />}
    </>
  );
}

/* ── 구조 창 ───────────────────────────────────────────────────
   Friedman·Rohrbaugh·Krakauer(1988)는 논의부에서, 치료자들이 TLG로는
   삼각관계·세대 간 연합 같은 "구조"를 읽기 어려워했다고 적었다. 그래서
   같은 자료의 표준 가계도를 시간축 위쪽에 축소해 함께 얹는다 —
   논문 Figure 7이 표준 가계도(A)와 TLG(B·C)를 위아래로 짝지은 방식. */
function insetLayout(doc, tlgWidth) {
  if (!doc.people.length) return null;
  const xs = doc.people.map((p) => p.x), ys = doc.people.map((p) => p.y);
  const pad = 120;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad + 80;
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const k = Math.min(Math.max(560, tlgWidth) / bw, 540 / bh, 1);
  const w = bw * k, h = bh * k;
  const HEAD = 34, PADC = 13, GAP = 84;
  const cardW = w + PADC * 2, cardH = h + PADC * 2 + HEAD;
  return { k, w, h, minX, minY, HEAD, PADC,
    cardX: tlgWidth / 2 - cardW / 2, cardY: -(cardH + GAP), cardW, cardH, total: cardH + GAP };
}

function TlgScene({ doc, li, sel, scale, win, stdInset, onMove, viewK, onPerson, onBond, onUnion }) {
  const L = tlgLayout(doc, scale, win);
  const ins = stdInset ? insetLayout(doc, L.width) : null;
  return (
    <g>
      {ins && (
        <g>
          <rect x={ins.cardX} y={ins.cardY} width={ins.cardW} height={ins.cardH} rx={12}
            fill="#FCFBF6" stroke={T.rule} strokeWidth={1.2} />
          <text x={ins.cardX + 14} y={ins.cardY + 21} fontSize={12} fontFamily={FB} fontWeight={700} fill={T.ink2}>
            {tr(S.insetTitle, li)}
          </text>
          <text x={ins.cardX + ins.cardW - 14} y={ins.cardY + 21} textAnchor="end" fontSize={10.5} fontFamily={FB} fill={T.mute}>
            {tr(S.readHint, li)}
          </text>
          <line x1={ins.cardX + 12} y1={ins.cardY + ins.HEAD - 5} x2={ins.cardX + ins.cardW - 12} y2={ins.cardY + ins.HEAD - 5}
            stroke={T.rule} strokeWidth={1} />
          <clipPath id="gs-inset-clip">
            <rect x={ins.cardX + 2} y={ins.cardY + ins.HEAD - 3} width={ins.cardW - 4} height={ins.cardH - ins.HEAD + 1} rx={9} />
          </clipPath>
          <g pointerEvents="none" clipPath="url(#gs-inset-clip)">
            <g transform={`translate(${ins.cardX + ins.PADC},${ins.cardY + ins.HEAD + ins.PADC}) scale(${ins.k}) translate(${-ins.minX},${-ins.minY})`}>
              <StandardScene doc={doc} li={li} detail sel={null} showStory={false} showTL={false} />
            </g>
          </g>
        </g>
      )}
      <TimeLineGenogram doc={doc} scale={scale} win={win} sel={sel} li={li}
        tlgPos={doc.tlgPos || {}} onMove={onMove} viewK={viewK}
        onSelectPerson={onPerson} onSelectBond={onBond} onSelectUnion={onUnion} />
      <g transform={`translate(0,${L.height + 52})`}>
        <rect x={-90} y={0} width={L.width + 180} height={30} rx={9} fill="#FDF8EC" stroke={T.gold} strokeWidth={0.9} opacity={0.85} />
        <text x={-74} y={19.5} fontSize={10.5} fontFamily={FB} fill={T.ink2}>{tr(S.estNote, li)}</text>
      </g>
    </g>
  );
}

function svgDefs() {
  return (
    <defs>
      <clipPath id="clipSquare"><rect x={-26} y={-26} width={52} height={52} /></clipPath>
      <clipPath id="clipCircle"><circle cx={0} cy={0} r={27} /></clipPath>
      <clipPath id="clipDiamond"><path d="M 0 -30 L 30 0 L 0 30 L -30 0 Z" /></clipPath>
      <pattern id="grid" width={26} height={26} patternUnits="userSpaceOnUse">
        <path d="M 26 0 L 0 0 0 26" fill="none" stroke={T.grid} strokeWidth={1} />
      </pattern>
    </defs>
  );
}

function docBounds(doc, opts = {}) {
  const xs = doc.people.map((p) => p.x), ys = doc.people.map((p) => p.y);
  const b = doc.people.length
    ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    : { minX: -300, maxX: 300, minY: -100, maxY: 300 };
  /* 왼쪽에는 세대 이름표(1세대·조부모 …)가 그림 바깥에 놓인다.
     여백이 좁으면 화면 맞춤을 눌러도 이름표가 잘린다. */
  const pad = 170, padLeft = 230;
  const normalLeft = b.minX - padLeft - (opts.story ? 400 : 0);
  const normalRight = b.maxX + pad + (opts.story ? 400 : 0);
  const chronologyLeft = b.minX - 140;
  const chronologyWidth = Math.max(760, b.maxX - b.minX + 540);
  const left = opts.tl ? Math.min(normalLeft, chronologyLeft - 20) : normalLeft;
  const right = opts.tl ? Math.max(normalRight, chronologyLeft + chronologyWidth + 20) : normalRight;
  const top = b.minY - pad;
  const w = right - left;
  const h = b.maxY - b.minY + pad * 2 + 180 + (opts.tl ? 120 + chronologyRowCount(doc) * 58 : 0);
  const extra=(doc.notes||[]).flatMap(n=>{const r=noteBounds(n);
    const pts=noteAnchorList(n).flatMap(a=>noteRoute(n,doc,true,a)?.points||[]);
    return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y+r.h},...pts];});
  (doc.ink||[]).forEach(st=>st.pts.forEach(p=>extra.push({x:p[0],y:p[1]})));
  const x=Math.min(left,...extra.map(p=>p.x-24)),y=Math.min(top,...extra.map(p=>p.y-24));
  return {x,y,w:Math.max(left+w,...extra.map(p=>p.x+24))-x,h:Math.max(top+h,...extra.map(p=>p.y+24))-y};
}

/* ══ editor ═════════════════════════════════════════════════════ */
function Editor({ doc, setDoc, li, cases, storageOK, openSave, loadCase, deleteCase, flash, undo, redo, canUndo, canRedo, templateRef, panelRef, noteBridge, toolHidden }) {
  const [view, setView] = useState({ x: 460, y: 150, k: 0.85 });
  const [mode, setMode] = useState("select");
  /* 덧쓰기 — 펜 모드, 색, 굵기, 형광펜 여부, 지우개 */
  const [pen, setPen] = useState(false);
  const [penHi, setPenHi] = useState(false);
  const [penSettings, setPenSettings] = useState({solid:{color:'ink',w:3},hi:{color:'yellow',w:24}});
  const penKey=penHi?'hi':'solid',penColor=penSettings[penKey].color,penW=penSettings[penKey].w;
  const setPenColor=color=>setPenSettings(v=>({...v,[penKey]:{...v[penKey],color}}));
  const setPenW=w=>setPenSettings(v=>({...v,[penKey]:{...v[penKey],w}}));
  const [penErase, setPenErase] = useState(false);
  const [noteSize, setNoteSize] = useState(12);
  const [delAsk, setDelAsk] = useState(null);      // 삭제 확인 중인 저장 사례 — 한 번 누르면 확인, 두 번째 누르면 삭제
  const [noteColor, setNoteColor] = useState('ink');
  const [menu, setMenu] = useState(null);   // 펼쳐 둔 갈래: add | ink | view | layer
  /* 레이어 — 자료는 그대로 두고 화면에서만 감춘다. 상담 중에 "지금은
     이 층만 보자"고 할 수 있게 하려는 것. */
  /* 이전에는 유형·기간·메모가 있느냐에 따라 글자가 나타났다 안 나타났다
     했다 — "빈약한 관계"는 기간이 없으면 안 보이고 있으면 보였다.
     일관성이 없었다. 이제는 하나의 스위치로 통일한다: 켜면 모든 선에
     짧은 유형 이름만 뜨고, 고른 선만 기간까지 자세히 보인다. */
  /* 다 적어 두면 이미 아는 것을 또 읽는 셈이라 산만하다. 그래서 이름표는
     기본으로 꺼 둔다. 대신 특정 관계를 강조하고 싶을 때는 그 구간에서
     '강조' 표시를 켜면, 전체 스위치와 상관없이 그 이름표만 남는다. */
  const vis = {...ALL_ON,...(doc.viewPrefs||{})};
  const setVis = update => setDoc(d=>({...d,viewPrefs:typeof update === "function" ? update({...ALL_ON,...(d.viewPrefs||{})}) : update}));
  /* 여러 사람을 한꺼번에 골라 함께 옮긴다. Shift를 누른 채 인물을
     누르면 묶이고, 빈 곳에서 Shift로 끌면 상자로 골라진다. */
  const [msel, setMsel] = useState([]);
  const marquee = useRef(null);
  const [mqBox, setMqBox] = useState(null);
  /* 면담 질문은 오른쪽 패널의 한 탭이었다. 그러면 질문을 보는 동안
     인물 정보를 볼 수 없어, 정작 그리면서 참고하기가 어렵다. 왼쪽에
     따로 띄워 두 가지를 나란히 볼 수 있게 한다. 볼지 말지는 고른다. */
  const [qOpen, setQOpen] = useState(false);
  /* 도구 막대 접기 상태 — 상단 헤더 버튼(AppInner)에서도 함께 써야 해서
     부모(AppInner)에서 내려받는다. */
  /* xlCache — 번역 완료 시 re-render 트리거 */
  const [live, setLive] = useState(null);
  const stroke = useRef(null);
  /* 글자 메모 — 기호 옆에 짧게 적어 두는 것 */
  const [textMode, setTextMode] = useState(false);
  const [editing, setEditing] = useState(null);   // { id, x, y, value, isNew }
  const noteDrag = useRef(null);
  const bendDrag = useRef(null);
  const [connectNote,setConnectNote] = useState(null);
  const editRef = useRef(null);
  const [pending, setPending] = useState([]);
  const [unionType, setUnionType] = useState("married");
  const [bondType, setBondType] = useState(null);   // null = 아직 유형을 고르지 않음(상대를 먼저 고르는 순서)
  const [changeNote, setChangeNote] = useState(null);   // { bondId, segId } — 방금 붙인 관계 변화에 이유를 적는 작은 상자
  const [bondKind, setBondKind] = useState(null);
  const [bondCat, setBondCat] = useState("connect");
  const [quickLink, setQuickLink] = useState("bio");
  const [barMode, setBarMode] = useState("main");
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("detail");
  const [detail, setDetail] = useState(true);
  const [showStory, setShowStory] = useState(true);
  const [showTL, setShowTL] = useState(false);
  const [tlg, setTlg] = useState(false);
  const [tlgScale, setTlgScale] = useState(9);
  const [tlgWin, setTlgWin] = useState({ from: "", to: "" });
  const [stdInset, setStdInset] = useState(true);
  const [objRing, setObjRing] = useState(false);
  const [lnYear, setLnYear] = useState(""), [lnText, setLnText] = useState("");
  /* 타임라인에서 옮긴 자리 — 사례 파일에 함께 저장된다 */
  const moveTlg = useCallback((key, dx, dy) => {
    setDoc((d) => ({ ...d, tlgPos: { ...(d.tlgPos || {}), [key]: { dx, dy } } }), `tlg:${key}`);
  }, [setDoc]);
  const resetTlg = () => setDoc((d) => ({ ...d, tlgPos: {} }));
  const [hhDraft, setHhDraft] = useState(null);
  /* hhDraftRef: useEffect가 stale closure 없이 최신 draft를 읽게 한다 */
  useEffect(() => {
    if (mode === "bond" && !bondType && menu !== "bond") { setMode("select"); setPending([]); }
  }, [mode, bondType, menu]);
  /* 관계 변화 상자는 그 관계선에서 눈을 돌리면 접는다(적은 것은 이미 저장됨) */
  useEffect(() => {
    if (changeNote && !(sel && sel.kind === "bond" && sel.id === changeNote.bondId)) setChangeNote(null);
  }, [sel, changeNote]);
  const hhDraftRef = useRef(null);
  useEffect(() => { hhDraftRef.current = hhDraft; }, [hhDraft]);
  /* 도구를 바꾸면 mode가 변한다. household 모드를 벗어날 때
     멤버가 있는 draft는 자동으로 저장한다 — 완료 버튼을 깜빡해도
     가구 윤곽이 그대로 남는다. */
  useEffect(() => {
    if (mode !== "household") {
      const draft = hhDraftRef.current;
      if (draft && draft.members.length) { keepHH(draft, false); setHhDraft(null); }
    }
  }, [mode]);
  /* 가구 모드가 켜진 채로 다른 메뉴(분화·척도, 보기, 필기, 관계선…)를 열면 가구 모드를 끈다.
     켜 둔 채 두면, 그 메뉴에서 정보를 넣으려고 인물을 누르는 순간 그 사람이 가구로
     편입되어 버린다. 끄면서 가구는 그대로 남긴다. */
  useEffect(() => {
    if (menu && mode === "household") {
      const draft = hhDraftRef.current;
      keepHH(draft, false); setHhDraft(null); setMode("select");
    }
  }, [menu, mode]);
  const [narrow, setNarrow] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const svgRef = useRef(null), drag = useRef(null), pan = useRef(null);
  /* 두 손가락 확대 — 모바일에서는 마우스 휠이 없어 그동안 작은 +/- 버튼밖에 쓸 수 없었다.
     포인터 두 개가 동시에 잡히면 그 사이 거리 변화로 배율을, 중점으로 중심을 옮긴다. */
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const t = (k) => tr(S[k], li);
  const byId = useMemo(() => Object.fromEntries(doc.people.map((p) => [p.id, p])), [doc.people]);
  const nameOf = (id) => personName(byId[id], li);

  useEffect(() => {
    const fit = () => { const n = window.innerWidth < 920; setNarrow(n); setPanelOpen((o) => (n ? false : o)); };
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const toWorld = (cx2, cy2) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: (cx2 - r.left - view.x) / view.k, y: (cy2 - r.top - view.y) / view.k };
  };
  const ensureVisible = (wx, wy, m = 120) => {
    const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
    setView((v) => {
      const sx = v.x + wx * v.k, sy = v.y + wy * v.k;
      let nx = v.x, ny = v.y;
      const bot = r.height - m - 80;
      if (sx < m) nx += m - sx; else if (sx > r.width - m) nx -= sx - (r.width - m);
      if (sy < m) ny += m - sy; else if (sy > bot) ny -= sy - bot;
      return { ...v, x: nx, y: ny };
    });
  };
  const fitView = (ppl) => {
    const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
    const list = ppl || doc.people;
    if (!list.length && !(doc.notes||[]).length && !(doc.ink||[]).length) { setView({ x: r.width / 2, y: 150, k: 1 }); return; }
    const bounds=docBounds({...doc,people:list},{tl:showTL});
    const bx=bounds.x,by=bounds.y,bw=Math.max(760,bounds.w),bh=bounds.h;
    const uh = r.height - 80;
    const k = Math.max(0.28, Math.min(1.05, Math.min(r.width / bw, uh / bh)));
    setView({ k, x: r.width / 2 - (bx + bw / 2) * k, y: uh / 2 - (by + bh / 2) * k });
  };
  useEffect(()=>{const frame=requestAnimationFrame(()=>fitView());return ()=>cancelAnimationFrame(frame);},[]);
  const fitTLG = () => {
    const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
    const L = tlgLayout(doc, tlgScale, tlgWin);
    const ins = stdInset ? insetLayout(doc, L.width) : null;
    const top = ins ? ins.total : 0;
    const w = Math.max(L.width + 280, ins ? ins.cardW + 120 : 0), h = L.height + 190 + top;
    const k = Math.max(0.2, Math.min(1, Math.min(r.width / w, (r.height - 60) / h)));
    setView({ k, x: r.width / 2 - (L.width / 2) * k, y: 40 + top * k });
  };

  const makePerson = (o = {}) => ({
    id: uid(), name: "", gender: "male", birth: "", death: "", deceased: false, proband: false,
    phys: false, ment: false, addi: false, role: "", note: "", puid: null, link: "bio",
    twin: null, twinType: null, preg: null, objKind: "other", x: 0, y: 0, ...o,
  });
  /* 설명 박스가 사람에 붙어 있으면, 그 사람을 끌 때 상자도 함께
     따라와야 한다. 지금까지는 연결선의 시작점만 사람을 따라가고,
     상자 자체는 처음 놓인 자리에 그대로 남아 있어 사람과 상자
     사이가 점점 멀어지는 것처럼 보였다. 사람이 옮겨진 만큼(dx,dy)
     그 사람에 붙은 상자도 같이 옮긴다. */
  const shiftPersonNotes = (list, id, dx, dy) => (!dx && !dy) ? list
    : list.map((n) => noteAnchorList(n).some((a) => a.kind === "person" && a.id === id)
      ? { ...n, x: n.x + dx, y: n.y + dy } : n);
  const updatePerson = (id, patch) => setDoc((d) => {
    const prev = d.people.find((p) => p.id === id);
    const dx = (prev && "x" in patch) ? patch.x - prev.x : 0;
    const dy = (prev && "y" in patch) ? patch.y - prev.y : 0;
    return { ...d, people: d.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      notes: shiftPersonNotes(d.notes || [], id, dx, dy) };
  }, editTag(id, patch));
  const removePerson = (id) => setDoc((d) => ({
    ...d,
    people: d.people.filter((p) => p.id !== id).map((p) => (p.puid && d.unions.find((u) => u.id === p.puid && (u.a === id || u.b === id)) ? { ...p, puid: null } : p)),
    unions: d.unions.filter((u) => u.a !== id && u.b !== id),
    bonds: d.bonds.filter((x) => x.a !== id && x.b !== id),
    households: d.households.map((h) => ({ ...h, members: h.members.filter((m) => m !== id) })),
    triangles: d.triangles.filter((x) => !x.ids.includes(id)),
    events: (d.events || []).map((e) => e.personId === id ? { ...e, personId: null, scope: "other" } : e),
  }));
  /* 자녀를 새로 추가하거나 자리를 바꿀 때 다른 집안 기호와 겹치지
     않도록 relayout 뒤에 deoverlap을 한 번 더 돌린다. */
  const relayoutKids = (d, unionId) => {
    const centered = centerKids(d, unionId);
    return { ...centered, people: deoverlapPeople(centered.people, []) };
  };
  const unionsOfPerson = (id) => doc.unions.filter((u) => u.a === id || u.b === id);
  const unionOfPerson = (id) => doc.unions.find((u) => u.a === id || u.b === id);

  /* 형제 줄 정리.

     손으로 옮긴 인물은 자동 배치에서 빠진다. 그것이 원칙이지만,
     이리저리 옮기다 줄이 엉키면 되돌릴 방법이 필요하다. 이 줄에
     한해서만 고정을 풀고, 부모 폭을 자녀 수에 맞춘 뒤, 고르게
     다시 펼친다. 다른 줄은 건드리지 않는다. */
  const tidyRow = (unionId) => {
    if (!unionId) return;
    setDoc((d) => {
      const kidIds = d.people.filter((p) => p.puid === unionId).map((p) => p.id);
      const spouseIds = d.unions
        .filter((u) => kidIds.includes(u.a) || kidIds.includes(u.b))
        .map((u) => (kidIds.includes(u.a) ? u.b : u.a));
      const free = new Set([...kidIds, ...spouseIds]);
      let nd = { ...d, people: d.people.map((p) => (free.has(p.id) ? { ...p, fixed: 0 } : p)) };
      nd = fitSpanToKids(nd, unionId);
      nd = centerKids(nd, unionId);
      return nd;
    });
    flash(t("tidyDone"));
  };

  const addPerson = (gender) => {
    const r = svgRef.current.getBoundingClientRect();
    const c = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    const p = makePerson({ gender, x: Math.round(c.x / 10) * 10, y: Math.round(c.y / 10) * 10 });
    setDoc((d) => ({ ...d, people: [...d.people, p] }));
    setSel({ kind: "person", id: p.id }); setTab("detail");
  };
  /* same 이 참이면 같은 성별의 배우자를 만들고 관계선을 동성 결혼으로 둔다 */
  const addSpouse = (p, type = unionType, same = false) => {
    const isM = p.gender !== "female";
    const n = unionsOfPerson(p.id).length;
    const g = same ? p.gender : (isM ? "female" : "male");
    const q = makePerson({ gender: g, orient: p.orient || "none", x: p.x + (isM ? COL_W * (n + 1) : -COL_W * (n + 1)), y: p.y });
    const u = { id: uid(), a: isM ? p.id : q.id, b: isM ? q.id : p.id, type, mYear: "", eYear: "" };
    setDoc((d) => {
      let nd = { ...d, people: [...d.people, q], unions: [...d.unions, u] };
      /* 형제 줄에 있는 사람에게 배우자를 붙이면 그 부부가 차지하는
         폭이 늘어난다. 형제들을 그대로 두면 배우자가 옆 형제 위에
         얹힌다. 그래서 부모 폭을 다시 잡고 형제들을 다시 펼친다. */
      if (p.puid) { nd = fitSpanToKids(nd, p.puid); nd = centerKids(nd, p.puid); }
      return nd;
    });
    setSel({ kind: "person", id: q.id }); ensureVisible(q.x, q.y);
  };
  const addChild = (p, gender = "male", link = "bio", unionId = null) => {
    let u = unionId ? doc.unions.find((x) => x.id === unionId) : unionOfPerson(p.id);
    if (!u) {
      const isM = p.gender !== "female";
      /* 자녀를 매달려면 짝이 있어야 하므로 배우자를 자동으로 세운다.
         예전에는 성별을 미상(◇)으로 두었으나, 미상을 없앴으므로
         상대 성별로 만든다. 필요하면 패널에서 바로 바꿀 수 있다. */
      const q = makePerson({ gender: isM ? "female" : "male", x: p.x + (isM ? COL_W : -COL_W), y: p.y });
      u = { id: uid(), a: isM ? p.id : q.id, b: isM ? q.id : p.id, type: "married", mYear: "", eYear: "" };
      const c = makePerson({ gender, puid: u.id, link, x: (p.x + q.x) / 2, y: p.y + GEN_H });
      setDoc((d) => ({ ...d, people: [...d.people, q, c], unions: [...d.unions, u] }));
      setSel({ kind: "person", id: c.id }); ensureVisible(c.x, c.y);
      return;
    }
    const a = byId[u.a], b2 = byId[u.b];
    const mid = (a.x + b2.x) / 2, y = Math.max(a.y, b2.y) + GEN_H;
    const c = makePerson({ gender, puid: u.id, link, x: mid + 9999, y });
    setDoc((d) => relayoutKids(fitSpanToKids({ ...d, people: [...d.people, c] }, u.id), u.id));
    setSel({ kind: "person", id: c.id }); ensureVisible(mid, y);
  };
  /* 대상은 사람을 바꾸는 것이 아니라 새로 만든다 — 삼각관계의 세 번째 꼭짓점 */
  const addObject = (p, kind) => {
    /* 대상은 가계도 바깥 오른쪽에 세운다 — 사람 배치를 밀어내지 않도록 */
    const xs = doc.people.filter((x) => x.gender !== "object").map((x) => x.x);
    const objs = doc.people.filter((x) => x.gender === "object");
    const right = xs.length ? Math.max(...xs) : p.x;
    const q = makePerson({ gender: "object", objKind: kind,
      x: right + COL_W * 1.2, y: p.y + objs.length * 96 });
    const bd = { id: uid(), a: p.id, b: q.id, segments: [{ id: uid(), type: "focus", from: "", to: "", note: "" }] };
    if(mode==='triangle'){
      const ids=[...pending,q.id];
      const tri=ids.length===3?{id:uid(),ids,type:TRI_TYPES[0],note:'',src:0,showDistant:true}:null;
      setDoc(d=>({...d,people:[...d.people,q],triangles:tri?[...d.triangles,tri]:d.triangles}));
      setObjRing(false);
      if(tri){setPending([]);setMode('select');setSel({kind:'triangle',id:tri.id});setTab('detail');setPanelOpen(true);}
      else setPending(ids);
      ensureVisible(q.x,q.y);return;
    }
    setDoc((d) => ({ ...d, people: [...d.people, q], bonds: [...d.bonds, bd] }));
    setSel({ kind: "person", id: q.id }); ensureVisible(q.x, q.y);
  };

  /* 인물 패널에서 바로 다는 생애선 메모 — 사건으로 저장되어 타임라인에 그대로 나타난다 */
  const addLifeNote = () => {
    if (!selPerson || !lnYear || !lnText.trim()) return;
    const ev = { id: uid(), year: +lnYear, endYear: null, title: lnText.trim(), type: "other",
      scope: "person", personId: selPerson.id, transitionId: null };
    setDoc((d) => ({ ...d, events: [...(d.events || []), ev] }));
    setLnYear(""); setLnText("");
  };

  const addTwins = (p, gender, identical) => {
    const u = unionOfPerson(p.id);
    if (!u) { addChild(p, gender); return; }
    const a = byId[u.a], b2 = byId[u.b];
    const mid = (a.x + b2.x) / 2, y = Math.max(a.y, b2.y) + GEN_H, tid = uid();
    const mk = (dx) => makePerson({ gender, puid: u.id, twin: tid, twinType: identical ? "identical" : "fraternal", x: mid + dx, y });
    setDoc((d) => relayoutKids(fitSpanToKids({ ...d, people: [...d.people, mk(9998), mk(9999)] }, u.id), u.id));
    ensureVisible(mid, y);
  };
  const addParents = (p) => {
    if (p.puid) return;
    const f = makePerson({ gender: "male", x: p.x - COL_W / 2, y: p.y - GEN_H });
    const m = makePerson({ gender: "female", x: p.x + COL_W / 2, y: p.y - GEN_H });
    const u = { id: uid(), a: f.id, b: m.id, type: "married", mYear: "", eYear: "" };
    setDoc((d) => ({ ...d, people: [...d.people, f, m].map((x) => (x.id === p.id ? { ...x, puid: u.id } : x)), unions: [...d.unions, u] }));
    setSel({ kind: "person", id: f.id }); ensureVisible(f.x, f.y); ensureVisible(m.x, m.y);
  };
  const addSibling = (p, gender) => {
    if (!p.puid) { addParents(p); return; }
    const s = makePerson({ gender, puid: p.puid, x: p.x + 9999, y: p.y });
    setDoc((d) => relayoutKids(fitSpanToKids({ ...d, people: [...d.people, s] }, p.puid), p.puid));
    setSel({ kind: "person", id: s.id }); ensureVisible(p.x, p.y);
  };

  const onNodeDown = (e, p) => {
    e.stopPropagation();
    if (mode === "union") {
      if (!pending.length) { setPending([p.id]); return; }
      if (pending[0] === p.id) { setPending([]); return; }
      const a = byId[pending[0]], b2 = p;
      const male = a.gender === "female" && b2.gender !== "female" ? b2 : a;
      const other = male === a ? b2 : a;
      setDoc((d) => ({ ...d, unions: [...d.unions, { id: uid(), a: male.id, b: other.id, type: unionType, mYear: "", eYear: "" }] }));
      setPending([]); setMode("select"); return;
    }
    if (mode === "bond") {
      /* 두 사람과 유형, 이 셋이 모이면 관계선이 생긴다. 순서는 상관없다.
         ① 유형을 먼저 골랐다면 상대를 누르는 순간 만들어지고,
         ② 유형을 아직 안 골랐다면 두 사람을 잡아 둔 채 위 메뉴에서 유형을 기다린다. */
      if (!pending.length) { setPending([p.id]); return; }
      if (pending.length === 1) {
        if (pending[0] === p.id) { setPending([]); return; }
        if (bondType) { commitBond(pending[0], p.id, bondType, bondKind); endBond(); return; }
        setPending([pending[0], p.id]); setMenu("bond"); return;
      }
      if (p.id === pending[1]) { setPending([pending[0]]); return; }     // 상대 선택 취소
      if (p.id === pending[0]) { setPending([pending[1]]); return; }     // 첫 사람을 빼면 남은 사람이 첫째
      setPending([pending[0], p.id]); return;                            // 상대를 바꿈
    }
    if (mode === "household") {
      setHhDraft((h) => ({ ...h, members: h.members.includes(p.id) ? h.members.filter((m) => m !== p.id) : [...h.members, p.id] }));
      return;
    }
    if (mode === "triangle") {
      const next = pending.includes(p.id) ? pending.filter((x) => x !== p.id) : [...pending, p.id];
      if (next.length === 3) {
        const triId = uid();
        setDoc((d) => {
          const tri = { id: triId, ids: next, type: TRI_TYPES[0], note: "", src: 0, showDistant: true,
            colorIdx: d.triangles.length % TRI_COLORS.length };
          return { ...d, triangles: [...d.triangles, tri] };
        });
        setSel({ kind: "triangle", id: triId }); setTab("detail"); setPanelOpen(true);
        setPending([]); setMode("select");
      } else setPending(next);
      return;
    }
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setMsel((m) => (m.includes(p.id) ? m.filter((x) => x !== p.id) : [...m, p.id]));
      setSel({ kind: "person", id: p.id }); setTab("detail"); setBarMode("main");
      return;
    }
    setSel({ kind: "person", id: p.id }); setTab("detail"); setBarMode("main");
    const w = toWorld(e.clientX, e.clientY);
    /* 묶어 둔 사람 중 하나를 끌면 묶음 전체가 같은 만큼 움직인다.
       묶음 밖의 사람을 끌면 묶음은 풀린다 — 아무 데나 눌렀는데
       엉뚱한 사람들이 따라 움직이면 놀라기 때문. */
    const inGroup = msel.length > 1 && msel.includes(p.id);
    if (!inGroup && msel.length) setMsel([]);
    drag.current = { id: p.id, dx: p.x - w.x, dy: p.y - w.y, moved: false,
      group: inGroup ? msel.map((id) => ({ id })) : null };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  /* 손바닥 걸러내기.

     애플 펜슬은 pointerType "pen"으로, 손가락과 손바닥은 "touch"로 들어온다.
     그런데 처음부터 "touch"를 무조건 막으면, 펜슬 없이 손가락으로 그리려는
     기기에서는 아예 그릴 수가 없다. 그래서 이 기기에서 펜을 한 번이라도
     본 뒤에만 손가락을 막는다. 펜슬을 쓰는 동안에는 손을 얹어도 안전하고,
     펜슬이 없는 기기에서는 손가락으로 그릴 수 있다. */
  const penSeen = useRef(false);
  const isPenInput = (e) => {
    if (!pen) return false;
    if (e.pointerType === "pen") { penSeen.current = true; return true; }
    if (e.pointerType === "mouse") return true;
    return !penSeen.current;   // 펜을 본 적 없으면 손가락도 받는다
  };

  const inkAt = (e) => {
    const w = toWorld(e.clientX, e.clientY);
    /* 필압을 못 주는 기기는 0.5로 들어온다 — 그때는 굵기를 그대로 쓴다 */
    const pr = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return [Math.round(w.x * 10) / 10, Math.round(w.y * 10) / 10, Math.round(pr * 100) / 100];
  };

  const eraseAt = (e) => {
    const w = toWorld(e.clientX, e.clientY);
    const r = (penW * 2.5) / view.k;
    setDoc((d) => ({ ...d, ink: (d.ink || []).filter((st) =>
      !st.pts.some((q) => Math.hypot(q[0] - w.x, q[1] - w.y) < r)) }), "erase");
  };

  const onInkDown = (e) => {
    /* 포인터 붙잡기는 실패할 수 있다(이미 놓인 포인터 등). 그 예외가
       획 긋기 자체를 막아서는 안 되므로 감싸 둔다. */
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* 무시 */ }
    if (penErase) { stroke.current = { erase: true }; eraseAt(e); return; }
    const col = (INK_COLORS.find((c) => c.id === penColor) || INK_COLORS[0]).c;
    const st = { id: uid(), color: col, w: penW, hi: penHi, inkStyle:2, pts: [inkAt(e)] };
    stroke.current = st; setLive(st);
  };
  const onInkMove = (e) => {
    if (!stroke.current) return;
    if (stroke.current.erase) { eraseAt(e); return; }
    const pt = inkAt(e);
    const pts = stroke.current.pts, last = pts[pts.length - 1];
    /* 너무 촘촘한 점은 버린다 — 파일이 커지고 그리기도 느려진다 */
    if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) * view.k < 1.5) return;
    stroke.current = { ...stroke.current, pts: [...pts, pt] };
    setLive(stroke.current);
  };
  const onInkUp = () => {
    const st = stroke.current; stroke.current = null; setLive(null);
    if (!st || st.erase || st.pts.length < 2) return;
    /* 필압을 굵기에 반영해 한 획의 평균 굵기를 정한다 */
    const avg = st.pts.reduce((n, q) => n + q[2], 0) / st.pts.length;
    setDoc((d) => ({ ...d, ink: [...(d.ink || []), { ...st, w: st.hi?st.w:+(st.w * (0.55 + avg)).toFixed(1) }] }));
  };

  /* 눌린 자리에 이미 메모가 있는지 본다. 화면 배율이 달라져도 손끝
     기준으로 같은 넓이가 되도록 world 단위로 환산해 잡는다. */
  const noteAt = (wx,wy) => vis.note ? [...(doc.notes||[])].reverse().find(n=>{
    const b=noteBounds(n);return wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h;
  }) : null;
  const editNote = n => {
    editOpened.current=Date.now();setEditing({...n,value:n.text});setSel({kind:'note',id:n.id});
  };
  const beginNoteDrag = (e,n) => {
    e.stopPropagation();e.preventDefault();const w=toWorld(e.clientX,e.clientY);
    if(editing)commitEdit();
    noteDrag.current={id:n.id,dx:n.x-w.x,dy:n.y-w.y,sx:e.clientX,sy:e.clientY,moved:false};
    setSel({kind:'note',id:n.id});setTab('detail');
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const startNote = () => {
    if(editing)commitEdit();
    setConnectNote(null);setPending([]);setObjRing(false);
    setPen(false);setMenu(null);setMode('select');setVis(v=>({...v,ink:true}));
    if(tlg){setTlg(false);setTimeout(fitView,0);}
    let anchor=null;
    if(sel?.kind==='person')anchor={kind:'person',id:sel.id,x:byId[sel.id].x,y:byId[sel.id].y};
    if(sel?.kind==='bond')anchor={kind:'bond',id:sel.id,seg:sel.seg||sortedSegments(doc.bonds.find(b=>b.id===sel.id)).slice(-1)[0].id,t:.5};
    if(sel?.kind==='union')anchor={kind:'union',id:sel.id,t:.5};
    if(anchor){
      const point=resolveNoteAnchor({x:0,y:0,text:'',anchor},doc,detail)||{x:0,y:0};
      anchor={...anchor,...point};editOpened.current=Date.now();
      setEditing({id:uid(),x:point.x+160,y:point.y-50,value:'',color:T.ink2,size:12,anchor,isNew:true});setTextMode(false);
    }else{setTextMode(true);flash(tr(['Click a space to place a note','설명 박스를 놓을 빈 곳을 누르세요','點選空白處放置說明框'],li));}
  };
  const toggleNote = () => {
    if(textMode||connectNote||editing){
      if(editing)commitEdit();
      setTextMode(false);setConnectNote(null);setMenu(null);setPen(false);setMode('select');
    }else startNote();
  };
  const selectPen = highlighter => {
    if(editing)commitEdit();
    saveHHDraft();setPen(true);setPenHi(highlighter);setPenErase(false);setTextMode(false);setConnectNote(null);
    setMode('select');setPending([]);setObjRing(false);setVis(v=>({...v,ink:true}));setMenu(null);
    if(tlg){setTlg(false);setTimeout(fitView,0);}
  };
  const toggleTimeline = () => {
    const next=!tlg;if(editing)commitEdit();
    setTlg(next);setSel(null);setMenu(null);setPen(false);setTextMode(false);setConnectNote(null);
    setMode('select');setPending([]);setObjRing(false);saveHH();
    setTimeout(()=>next?fitTLG():fitView(),0);
  };
  /* ── 관계선 만들기 ─────────────────────────────────────────
     인물 → 관계선 → 유형 → 상대   /   인물 → 관계선 → 상대 → 유형
     둘 다 된다. 그리고 두 사람 사이에 이미 관계선이 있으면 새 선을 따로 만들지 않고
     그 관계선의 '다음 구간'으로 이어 붙인다 — 관계가 바뀐 것으로 읽고, 선들을 인물
     위아래로 나란히 벌려 그린다(BondEdge). */
  const pairBond = (x, y) => doc.bonds.find((b) => (b.a === x && b.b === y) || (b.a === y && b.b === x));
  const endBond = () => { setPending([]); setMode("select"); setMenu(null); setBondType(null); setBondKind(null); };
  const commitBond = (fromId, toId, type, kind) => {
    const k = kind || null;
    const ex = pairBond(fromId, toId);
    if (!ex) {
      const nb = { id: uid(), a: fromId, b: toId, type, kind: k, note: "", from: "", to: "",
        segments: [{ id: uid(), type, kind: k, from: "", to: "", note: "" }] };
      setDoc((d) => ({ ...d, bonds: [...d.bonds, nb] }));
      setSel({ kind: "bond", id: nb.id }); setTab("detail"); setPanelOpen(true);
      setChangeNote(null);
      return;
    }
    const cur = currentSegment(ex);
    if (cur.type === type && (cur.kind || null) === k) {
      setSel({ kind: "bond", id: ex.id, seg: cur.id }); setChangeNote(null);
      flash(t("bondSame"));
      return;
    }
    /* 화살표가 있는 선(무관심·폭력·통제)은 방향이 있다. 기존 관계선과 반대 방향으로
       그은 것이면 그 구간만 뒤집어 그린다. */
    const rev = !!(BOND_TYPES[type] && BOND_TYPES[type].arrow) && ex.a !== fromId;
    const ns = { id: uid(), type, kind: k, from: "", to: "", note: "", ...(rev ? { rev: true } : {}) };
    setDoc((d) => ({ ...d, bonds: d.bonds.map((b) => (b.id === ex.id ? { ...b, segments: [...bondSegments(b), ns] } : b)) }));
    setSel({ kind: "bond", id: ex.id, seg: ns.id });
    setChangeNote({ bondId: ex.id, segId: ns.id });
  };
  const pickBondType = (ty, kind = null) => {
    if (pending.length === 2) { commitBond(pending[0], pending[1], ty, kind); endBond(); return; }
    setBondType(ty); setBondKind(kind); setMode("bond");
    setPending(pending.length ? pending : (selPerson ? [selPerson.id] : []));
    setMenu(null);
  };
  const openBonds = () => {
    if(editing)commitEdit();
    setPen(false);setTextMode(false);setConnectNote(null);setObjRing(false);setChangeNote(null);
    if (menu === "bond") { endBond(); return; }     // 한 번 더 누르면 접고 취소
    setBondType(null); setBondKind(null);
    setMode("bond"); setPending(selPerson ? [selPerson.id] : []); setMenu("bond");
  };
  const dupGroups = duplicateBondGroups(doc);
  const mergeBonds = (onlyBondId = null) => {
    const r = mergeDuplicateBonds(doc, onlyBondId);
    if (!r.pairs) return;
    setDoc((d) => mergeDuplicateBonds(d, onlyBondId).doc);
    if (sel && sel.kind === "bond" && r.removed.has(sel.id)) setSel({ kind: "bond", id: r.removed.get(sel.id), seg: null });
    flash(t("mergedDone").replace("{n}", r.pairs) + (r.dropped ? ` · ${t("mergedSame").replace("{m}", r.dropped)}` : ""));
  };
  /* 지금 어느 단계인지 한 줄로 — 위 메뉴와 캔버스 안내가 같은 말을 쓴다 */
  const bondHintText = () => {
    const nm = (id) => (id && byId[id] ? personName(byId[id], li) : "");
    const A = nm(pending[0]), B = nm(pending[1]);
    if (bondType) {
      const lbl = tr(BOND_TYPES[bondType].label, li);
      return A ? `${lbl}: ${A} → ${tr(["tap the other person", "상대 인물을 누르세요", "點選對方"], li)}`
               : `${lbl}: ${tr(["tap the first person", "첫 번째 인물을 누르세요", "點選第一位人物"], li)}`;
    }
    if (pending.length === 2) {
      return t("bondHint2").replace("{a}", A).replace("{b}", B) + (pairBond(pending[0], pending[1]) ? " " + t("bondChangeAdd") : "");
    }
    return pending.length === 1 ? t("bondHint1").replace("{a}", A) : t("bondHint0");
  };
  /* 방금 붙인 관계 변화에 연도·이유를 적는다. 입력하는 대로 바로 저장되고, 앞 구간의 끝
     연도가 비어 있으면 같은 해로 채운다(같은 변화의 두 면이므로). */
  const cnBond = changeNote ? doc.bonds.find((b) => b.id === changeNote.bondId) : null;
  const cnSegs = cnBond ? sortedSegments(cnBond) : [];
  const cnIdx = changeNote ? cnSegs.findIndex((x) => x.id === changeNote.segId) : -1;
  const cnSeg = cnIdx >= 0 ? cnSegs[cnIdx] : null;
  const writeChange = (patch) => {
    if (!cnSeg) return;
    setDoc((d) => ({ ...d, bonds: d.bonds.map((b) => {
      if (b.id !== changeNote.bondId) return b;
      const segs = sortedSegments(b), i = segs.findIndex((x) => x.id === changeNote.segId);
      if (i < 0) return b;
      return { ...b, segments: segs.map((x, j) => {
        if (j === i) return { ...x, ...patch };
        if (j === i - 1 && "from" in patch && String(x.to || "") === String(segs[i].from || "")) return { ...x, to: patch.from };
        return x;
      }) };
    }) }), editTag(changeNote.bondId, { segments: 1 }));
  };
  const closeChange = (openHistory) => {
    const cn = changeNote; setChangeNote(null);
    if (openHistory && cn) { setSel({ kind: "bond", id: cn.bondId, seg: cn.segId }); setTab("detail"); setPanelOpen(true); }
  };
  const connectAt = e => {
    e.preventDefault();const point=toWorld(e.clientX,e.clientY),anchor=pickNoteAnchor(point,doc,detail,18/view.k,vis);
    /* connectNote는 문자열(첫 연결을 다시 고르는 중)이거나
       {id,add:true}(연결을 하나 더 더하는 중)이다. */
    const id=typeof connectNote==='string'?connectNote:connectNote?.id;
    const adding=typeof connectNote==='object'&&connectNote?.add;
    setDoc(d=>({...d,notes:(d.notes||[]).map(n=>{
      if(n.id!==id)return n;
      if(!adding||!n.anchor)return {...n,anchor};
      return {...n,anchors:[...(n.anchors||[]),anchor]};
    })}));
    setConnectNote(null);setSel({kind:'note',id});setPanelOpen(true);
  };
  const beginBend = (e,n,r) => {
    e.stopPropagation();e.preventDefault();const w=toWorld(e.clientX,e.clientY);
    bendDrag.current={id:n.id,axis:r.axis,start:r.axis==='horizontal'?w.x:w.y,offset:n.connector?.offset||0};
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  /* 입력칸을 연 시각. 클릭은 pointerdown 다음에 mousedown을 내보내고
     그때 포커스가 옮겨 가면서 방금 연 칸이 곧바로 blur된다. 그러면 빈
     값으로 확정되어 칸이 뜨자마자 사라진다. 그래서 열린 직후의 blur는
     흘려보낸다. */
  const editOpened = useRef(0);

  const commitEdit = () => {
    const ed = editing; setEditing(null);
    if(ed){setSel({kind:"note",id:ed.id});setPanelOpen(true);setTab("detail");}
    if (!ed) return;
    const v = (ed.value || "").trim();
    setDoc((d) => {
      const notes = d.notes || [];
      if (!v) return { ...d, notes: notes.filter((n) => n.id !== ed.id) };   // 비우면 지운다
      const found = notes.some((n) => n.id === ed.id);
      return { ...d, notes: found
        ? notes.map((n) => (n.id === ed.id ? { ...n, text: v } : n))
        : [...notes, { id: ed.id, x: ed.x, y: ed.y, text: v, color: ed.color, size: ed.size, anchor:ed.anchor||null, connector:{axis:"auto",side:"auto",offset:0} }] };
    });
  };

  const onTextDown = (e) => {
    e.preventDefault();   // 포커스가 캔버스로 옮겨 가지 않게
    const w = toWorld(e.clientX, e.clientY);
    const hit = noteAt(w.x, w.y);
    if (editing) commitEdit();
    if (hit) { beginNoteDrag(e,hit);return; }
    const col = (INK_COLORS.find((c) => c.id === penColor) || INK_COLORS[0]).c;
    editOpened.current = Date.now();
    setEditing({ id: uid(), x: Math.round(w.x), y: Math.round(w.y), value: "",
      color: (INK_COLORS.find(c=>c.id===noteColor)||INK_COLORS[4]).c, size: noteSize, isNew: true });
  };
  const onTextMove = (e) => {
    if (!noteDrag.current) return;
    const nd=noteDrag.current;
    if(!nd.moved&&Math.hypot(e.clientX-nd.sx,e.clientY-nd.sy)<4)return;
    const w=toWorld(e.clientX,e.clientY),nx=Math.round(w.x+nd.dx),ny=Math.round(w.y+nd.dy);
    nd.moved=true;
    const id=nd.id;
    setDoc(d=>({...d,notes:(d.notes||[]).map(n=>n.id===id?{...n,x:nx,y:ny}:n)}),`note:${id}`);
  };
  const onTextUp = () => {
    const nd=noteDrag.current;noteDrag.current=null;
    if(nd&&!nd.moved){setSel({kind:'note',id:nd.id});setTab('detail');setPanelOpen(true);}
  };

  /* 포인터 캡처 단계에서 손가락 수를 센다. 두 번째 손가락이 사람 기호나
     손잡이 위에 떨어져도 놓치지 않도록, 자식에게 전달되기 전(capture)에
     먼저 잡는다. */
  const onPointerDownCapture = (e) => {
    if (e.pointerType !== "touch") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svgRef.current?.getBoundingClientRect();
      pan.current = null; drag.current = null; marquee.current = null;
      if (r) {
        /* 시작할 때 손가락 중점 아래에 있던 '세상 좌표' 한 점만 고정해 둔다.
           확대 배율이 바뀌어도, 손가락이 함께 움직여도, 그 점은 항상
           지금 손가락 중점 자리에 그대로 있어야 한다 — 그래야 손가락을
           옮기면 그림도 같이 따라온다(이동+확대가 한 동작으로 된다). */
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const sx = mx - r.left, sy = my - r.top;
        pinch.current = { dist, k0: view.k, wx: (sx - view.x) / view.k, wy: (sy - view.y) / view.k };
      }
    }
  };
  const onPointerMoveCapture = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
      const { dist: d0, k0, wx, wy } = pinch.current;
      const k = Math.min(2.2, Math.max(0.25, k0 * (dist / Math.max(24, d0))));
      /* 매 순간의 실제 손가락 중점을 쓴다 — 고정된 시작점이 아니라. */
      const curMx = (a.x + b.x) / 2, curMy = (a.y + b.y) / 2;
      const sx = curMx - r.left, sy = curMy - r.top;
      setView({ k, x: sx - wx * k, y: sy - wy * k });
    }
  };
  const onPointerUpCapture = (e) => {
    const wasPinching = !!pinch.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    /* 두 손가락 중 하나를 떼도 남은 손가락으로 계속 움직이고 있는 경우가
       많다. 새로 눌러야만 이동이 시작되면 그 사이 반응이 없는 것처럼
       느껴진다. 남은 손가락으로 바로 이어서 화면을 옮길 수 있게 한다. */
    if (wasPinching && pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      pan.current = { sx: p.x, sy: p.y, vx: view.x, vy: view.y };
    }
  };
  const onBgDown = (e) => {
    if (pinch.current || pointers.current.size >= 2) return;
    if (connectNote) {connectAt(e);return;}
    if (menu) setMenu(null);
    if (textMode) { onTextDown(e); return; }
    if (isPenInput(e)) { onInkDown(e); return; }
    /* 필기 도구를 끈 뒤에도 이미 적어 둔 메모는 눌러서 옮길 수 있어야
       한다. 예전에는 글자 도구가 켜져 있을 때만 메모를 붙잡을 수
       있어서, 옮기려면 매번 도구를 다시 켜야 했다. */
    if (mode === "select" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const w0 = toWorld(e.clientX, e.clientY);
      const hitNote = noteAt(w0.x, w0.y);
      if (hitNote) {beginNoteDrag(e,hitNote);return;}
    }
    if (mode === "select" && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      const w = toWorld(e.clientX, e.clientY);
      marquee.current = { x0: w.x, y0: w.y };
      setMqBox({ x: w.x, y: w.y, w: 0, h: 0 });
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* 무시 */ }
      return;
    }
    if (mode === "select") { setSel(null); setMsel([]); }
    pan.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* 무시 */ }
  };
  const onMove = (e) => {
    if (pinch.current) return;
    if(bendDrag.current){const bd=bendDrag.current,w=toWorld(e.clientX,e.clientY),offset=bd.offset+(bd.axis==='horizontal'?w.x:w.y)-bd.start;
      setDoc(d=>({...d,notes:(d.notes||[]).map(n=>n.id===bd.id?{...n,connector:{...n.connector,axis:bd.axis,offset}}:n)}),`bend:${bd.id}`);return;}

    if (noteDrag.current) { onTextMove(e); return; }
    if (stroke.current) { onInkMove(e); return; }
    if (marquee.current) {
      const w = toWorld(e.clientX, e.clientY);
      const { x0, y0 } = marquee.current;
      setMqBox({ x: Math.min(x0, w.x), y: Math.min(y0, w.y), w: Math.abs(w.x - x0), h: Math.abs(w.y - y0) });
      return;
    }
    if (drag.current) {
      const w = toWorld(e.clientX, e.clientY);
      let nx = Math.round(w.x + drag.current.dx), ny = Math.round(w.y + drag.current.dy);
      const p = byId[drag.current.id];
      /* 자녀는 부모 폭 안에서만 움직인다.

         한때 이 제한을 풀어 보았다. 그러자 자녀가 부모 바깥으로
         나가고, 거기까지 닿으려고 가로선이 길게 늘어났다. 꺾어 봐도,
         사선으로 이어 봐도, 부모를 자동으로 벌려 봐도 모두 더
         어수선해졌다. 자녀를 부모 사이에 두는 것이 가계도의 문법이고,
         그 문법을 지키는 편이 결국 가장 읽기 쉬웠다.

         자녀를 정말 옆으로 빼야 한다면 부모를 먼저 벌리면 된다. */
      if (p?.puid && !drag.current.group) {
        const u = doc.unions.find((x) => x.id === p.puid);
        const pa = u && byId[u.a], pb = u && byId[u.b];
        if (pa && pb) {
          /* 부모 기호에 바짝 붙으면 자녀선이 부모선 끝과 겹쳐 읽기
             어렵다. 자동 배치와 같은 여백을 손으로 끌 때도 지킨다. */
          const lo = Math.min(pa.x, pb.x) + SPAN_EDGE, hi = Math.max(pa.x, pb.x) - SPAN_EDGE;
          if (hi > lo) nx = Math.min(hi, Math.max(lo, nx));
          else nx = (pa.x + pb.x) / 2;      // 폭이 여백보다 좁으면 가운데로
          /* 위로도 막는다. 부모를 잇는 가로선 높이까지 끌어올리면
             자녀가 배우자 자리에 선 것처럼 읽혀 뜻이 달라진다. */
          const yFloor = Math.max(pa.y, pb.y) + CHILD_DROP_MIN;
          if (ny < yFloor) ny = yFloor;
        }
      }
      /* 끄는 동안 다른 기호 위에 얹히지 못하게 막는다.

         손을 뗀 뒤에 주변을 밀어내는 방법도 있지만, 그 주변 사람들도
         손으로 자리를 정해 둔 경우에는 아무도 비켜 줄 수 없다. 그래서
         얹히기 전에 막는다 — 끌고 가다 옆 사람에 닿으면 그 앞에서
         멈춘다. 묶음 이동은 서로의 간격이 그대로이므로 막지 않는다. */
      if (p && !drag.current.group) {
        const band = doc.people.filter((o) => o.id !== p.id && o.gender !== "object"
          && Math.abs(o.y - ny) < MIN_PITCH * 0.7);
        for (let pass = 0; pass < 4; pass++) {
          let hit = false;
          band.forEach((o) => {
            if (Math.abs(nx - o.x) >= MIN_PITCH) return;
            nx = nx >= o.x ? o.x + MIN_PITCH : o.x - MIN_PITCH;
            hit = true;
          });
          if (!hit) break;
        }
        nx = Math.round(nx);
      }
      if (p && (nx !== p.x || ny !== p.y)) drag.current.moved = true;
      if (drag.current.group) {
        const gdx = nx - p.x, gdy = ny - p.y;
        const grp = drag.current.group;
        setDoc((d) => ({ ...d, people: d.people.map((q) => {
          const g = grp.find((x) => x.id === q.id);
          return g ? { ...q, x: Math.round(q.x + gdx), y: Math.round(q.y + gdy) } : q;
        }), notes: (d.notes || []).map((n) => noteAnchorList(n).some((a) => a.kind === "person" && grp.some((x) => x.id === a.id))
          ? { ...n, x: n.x + gdx, y: n.y + gdy } : n) }), `mv:${drag.current.id}`);
      } else updatePerson(drag.current.id, { x: nx, y: ny });
    } else if (pan.current) {
      /* 값을 먼저 꺼내 둔다. setView에 넘긴 함수는 나중에 실행되는데,
         그 사이 손을 떼면 onUp이 pan.current를 비워 버려서
         함수 안에서 읽으면 터진다. */
      const { vx, vy, sx, sy } = pan.current;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      setView((v) => ({ ...v, x: vx + dx, y: vy + dy }));
    }
  };
  const onUp = () => {
    if (pinch.current) return;
    if(bendDrag.current){bendDrag.current=null;return;}
    if (noteDrag.current) { onTextUp(); return; }
    if (stroke.current) { onInkUp(); return; }
    if (marquee.current) {
      const bx = mqBox;
      marquee.current = null; setMqBox(null);
      if (bx && (bx.w > 8 || bx.h > 8)) {
        const hit = doc.people.filter((p) => p.x >= bx.x && p.x <= bx.x + bx.w && p.y >= bx.y && p.y <= bx.y + bx.h);
        setMsel(hit.map((p) => p.id));
      }
      return;
    }
    /* 실제로 끌었을 때만 자녀를 다시 배치한다. 그냥 눌러서 고르기만 한
       경우에도 재배치를 돌리면, 손대지 않은 자녀들이 제멋대로 움직인다. */
    if (drag.current && drag.current.moved) {
      const id = drag.current.id;
      const movedIds = drag.current.group ? drag.current.group.map((g) => g.id) : [id];
      /* 손으로 옮긴 자리는 그 사람의 것이다. 이후 자동 배치가 다시
         돌더라도 이 사람만은 건드리지 않는다 — 옮겨 놓은 인물이
         저 혼자 제자리로 돌아가 버리던 문제. */
      let tight = false;
      setDoc((d) => {
        let nd = { ...d, people: d.people.map((p) => (movedIds.includes(p.id) ? { ...p, fixed: 1 } : p)) };
        movedIds.forEach((mv) => {
          nd.unions.filter((u) => u.a === mv || u.b === mv).forEach((u) => {
            nd = relayoutKids(nd, u.id);
            nd = clampKids(nd, u.id);
            if (spanTooTight(nd, u.id)) tight = true;
            /* 배우자로 들어온 사람을 끌었다면, 그 배우자가 붙어 있는
               형제 줄에서도 겹침을 푼다 */
            const mate = nd.people.find((p) => p.id === (u.a === mv ? u.b : u.a));
            if (mate?.puid) nd = centerKids(nd, mate.puid);
          });
          const me = nd.people.find((p) => p.id === mv);
          if (me?.puid) {
            nd = clampKids(nd, me.puid);
            /* 손으로 끌어 옆 사람 위에 얹었을 수 있다. 옮긴 사람은
               그 자리에 두고 주변을 밀어내 겹침을 푼다. */
            nd = centerKids(nd, me.puid);
            if (spanTooTight(nd, me.puid)) tight = true;
          }
        });
        /* 형제 줄 안에서는 겹침을 풀었지만, 서로 다른 집안 줄기가
           끌려와 같은 자리에 포개지는 경우까지는 못 잡았다 — 끌어다
           놓은 사람이 남의 자리를 덮으면, 그 남을 옆으로 밀어
           스스로 자리를 만들게 한다. 같은 세대 줄(y가 비슷한 사람)
           끼리만 비교해 엉뚱한 세대까지 밀리지 않게 한다. */
        nd = { ...nd, people: deoverlapPeople(nd.people, movedIds) };
        return nd;
      }, `mv:${id}`);
      /* 잔소리는 필요한 순간에만 한 번. 화살표를 늘 띄우면 산만하다. */
      if (tight) flash(t("tightSpan"));
    }
    drag.current = null; pan.current = null;
  };
  /* 배율 단추 — 지금까지는 휠로만 확대·축소할 수 있어, 마우스 휠이
     없는 노트북이나 태블릿에서는 손댈 방법이 없었다. 화면 한가운데를
     기준으로 잡아 보고 있던 자리가 흔들리지 않게 한다. */
  const zoomBy = (f) => {
    const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
    const mx = r.width / 2, my = r.height / 2;
    setView((v) => {
      const k = Math.min(2.2, Math.max(0.25, v.k * f));
      return { k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) };
    });
  };

  const onWheel = (e) => {
    const k = Math.min(2.2, Math.max(0.25, view.k * (e.deltaY > 0 ? 0.92 : 1.08)));
    const r = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView((v) => ({ k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) }));
  };

  const startHH = () => {
    setMode("household"); setSel(null);
    setHhDraft({ id: uid(), name: "", year: "", color: HH_COLORS[doc.households.length % HH_COLORS.length], members: [] });
  };
  /* 가구를 남기는 길은 하나로 모은다. 같은 가구를 두 번 넣지 않도록 id를 본다.
     (예전에는 '가구' 버튼을 다시 눌러 끄면 만들던 가구를 버렸고, 필기 도구를 고를 때는
     정의되지 않은 함수를 불러 오류가 났다.) */
  const keepHH = (draft, select) => {
    if (!draft || !draft.members.length) return;
    setDoc((d) => (d.households.some((h) => h.id === draft.id) ? d : { ...d, households: [...d.households, draft] }));
    if (select) { setSel({ kind: "household", id: draft.id }); setTab("detail"); setPanelOpen(true); }
  };
  const saveHH = (select = false) => { keepHH(hhDraftRef.current, select); setHhDraft(null); };
  const saveHHDraft = () => saveHH(false);
  const finishHH = () => { saveHH(true); setMode("select"); };
  const template = () => {
    const pgf = makePerson({ gender: "male", x: -450, y: 0 }), pgm = makePerson({ gender: "female", x: -312, y: 0 });
    const mgf = makePerson({ gender: "male", x: 312, y: 0 }), mgm = makePerson({ gender: "female", x: 450, y: 0 });
    const u1 = { id: uid(), a: pgf.id, b: pgm.id, type: "married", mYear: "", eYear: "" };
    const u2 = { id: uid(), a: mgf.id, b: mgm.id, type: "married", mYear: "", eYear: "" };
    const fa = makePerson({ gender: "male", x: -69, y: GEN_H, puid: u1.id });
    const mo = makePerson({ gender: "female", x: 69, y: GEN_H, puid: u2.id });
    const u3 = { id: uid(), a: fa.id, b: mo.id, type: "married", mYear: "", eYear: "" };
    const me = makePerson({ gender: "male", x: 0, y: GEN_H * 2, proband: true, puid: u3.id });
    let ppl = [pgf, pgm, mgf, mgm, fa, mo, me].map((p, i) => ({ ...p, name: "", tkey: ["gf", "gm", "gf", "gm", "fa", "mo", "me"][i] }));
    let nd = { people: ppl, unions: [u1, u2, u3] };
    nd = centerKids(nd, u1.id);   // 아버지를 할아버지·할머니 부부선 가운데로
    nd = centerKids(nd, u2.id);   // 어머니를 외할아버지·외할머니 부부선 가운데로
    nd = centerKids(nd, u3.id);   // 본인을 아버지·어머니 부부선 가운데로
    setDoc((d) => ({ ...d, people: [...d.people, ...nd.people], unions: [...d.unions, u1, u2, u3] }));
    setSel({ kind: "person", id: me.id }); fitView(nd.people);
  };
  useEffect(() => { if (templateRef) templateRef.current = template; });
  useEffect(() => { if (panelRef) panelRef.current = { openTab: (k) => { setTab(k); setPanelOpen(true); } }; });   // 헤더의 "저장한 가계도" 단추 등, Editor 밖에서 패널 탭을 여는 통로(templateRef와 같은 방식)
  /* 번역 띠에서 보낸 글로 설명 박스를 바로 만든다. 인물·관계선·결혼선이 선택돼 있으면 거기에
     연결된 박스로(같은 대상에 이미 붙은 박스 아래로 쌓는다), 아니면 화면 가운데에 놓는다. */
  const addNoteText = (text) => {
    const v = String(text || "").trim();
    if (!v) return false;
    let anchor = null;
    if (sel?.kind === "person" && byId[sel.id]) anchor = { kind: "person", id: sel.id, x: byId[sel.id].x, y: byId[sel.id].y };
    if (sel?.kind === "bond") { const bd = doc.bonds.find((b) => b.id === sel.id); if (bd) anchor = { kind: "bond", id: sel.id, seg: sel.seg || sortedSegments(bd).slice(-1)[0].id, t: 0.5 }; }
    if (sel?.kind === "union") anchor = { kind: "union", id: sel.id, t: 0.5 };
    let x, y;
    if (anchor) {
      const pt = resolveNoteAnchor({ x: 0, y: 0, text: "", anchor }, doc, detail) || { x: 0, y: 0 };
      anchor = { ...anchor, ...pt };
      const stacked = (doc.notes || []).filter((n) => n.anchor && n.anchor.kind === anchor.kind && n.anchor.id === anchor.id).length;
      x = pt.x + 160; y = pt.y - 50 + stacked * 80;
    } else {
      const r = svgRef.current.getBoundingClientRect();
      const w = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      x = Math.round(w.x - 60); y = Math.round(w.y - 30);
    }
    const id = uid();
    setDoc((d) => ({ ...d, notes: [...(d.notes || []), { id, x, y, text: v, color: T.ink2, size: 12, anchor, connector: { axis: "auto", side: "auto", offset: 0 } }] }));
    setSel({ kind: "note", id });
    return true;
  };
  const noteTargetLabel = sel?.kind === "person" && byId[sel.id] ? personName(byId[sel.id], li)
    : sel?.kind === "bond" ? tr(["relationship line", "관계선", "關係線"], li)
    : sel?.kind === "union" ? tr(["union line", "결혼선", "婚姻線"], li) : "";
  const lastNoteLabel = useRef(null);
  useEffect(() => {
    if (!noteBridge) return undefined;
    noteBridge.current = { add: addNoteText, label: noteTargetLabel };
    if (lastNoteLabel.current !== noteTargetLabel) { lastNoteLabel.current = noteTargetLabel; window.dispatchEvent(new Event("gs-note-target")); }
    return undefined;
  });
  useEffect(() => () => { if (noteBridge) { noteBridge.current = null; window.dispatchEvent(new Event("gs-note-target")); } }, []);


  const selNote=sel?.kind==='note'?(doc.notes||[]).find(n=>n.id===sel.id):null;
  const updateNote=patch=>setDoc(d=>({...d,notes:(d.notes||[]).map(n=>n.id===sel.id?{...n,...patch}:n)}),`edit-note:${sel?.id}`);
  const selPerson = sel?.kind === "person" ? byId[sel.id] : null;
  const selUnion = sel?.kind === "union" ? doc.unions.find((u) => u.id === sel.id) : null;
  const selBond = sel?.kind === "bond" ? doc.bonds.find((x) => x.id === sel.id) : null;
  const selHH = sel?.kind === "household" ? doc.households.find((h) => h.id === sel.id) : null;
  const selTri = sel?.kind === "triangle" ? doc.triangles.find((x) => x.id === sel.id) : null;
  const setU = (patch) => setDoc((d) => ({ ...d, unions: d.unions.map((u) => (u.id === selUnion.id ? { ...u, ...patch } : u)) }), editTag(selUnion?.id, patch));
  const setB = (patch) => setDoc((d) => ({ ...d, bonds: d.bonds.map((x) => (x.id === selBond.id ? { ...x, ...patch } : x)) }), editTag(selBond?.id, patch));
  const setH = (patch) => setDoc((d) => ({ ...d, households: d.households.map((h) => (h.id === selHH.id ? { ...h, ...patch } : h)) }), editTag(selHH?.id, patch));
  const setTri = (patch) => setDoc((d) => ({ ...d, triangles: d.triangles.map((x) => (x.id === selTri.id ? { ...x, ...patch } : x)) }), editTag(selTri?.id, patch));

  /* one Delete key removes whatever is selected, whichever kind it is */
  const deleteSelected = () => {
    if (!sel) return;
    const id = sel.id;
    if (sel.kind === "note") setDoc(d=>({...d,notes:(d.notes||[]).filter(n=>n.id!==id)}));
    else if (sel.kind === "person") removePerson(id);
    else if (sel.kind === "union") setDoc((d) => ({ ...d, unions: d.unions.filter((u) => u.id !== id), people: d.people.map((p) => (p.puid === id ? { ...p, puid: null } : p)) }));
    else if (sel.kind === "bond") {
      const bd = doc.bonds.find((x) => x.id === id);
      const segs = bd ? sortedSegments(bd) : [];
      if (sel.seg && segs.length > 1) {
        setDoc((d) => ({ ...d, bonds: d.bonds.map((x) => (x.id === id ? { ...x, segments: segs.filter((s) => s.id !== sel.seg) } : x)) }));
        setSel({ kind: "bond", id, seg: null }); return;
      }
      setDoc((d) => ({ ...d, bonds: d.bonds.filter((x) => x.id !== id) }));
    }
    else if (sel.kind === "household") setDoc((d) => ({ ...d, households: d.households.filter((h) => h.id !== id) }));
    else if (sel.kind === "triangle") setDoc((d) => ({ ...d, triangles: d.triangles.filter((x) => x.id !== id) }));
    setSel(null);
  };

  /* ── keyboard shortcuts ───────────────────────────────────────
     Meant for live sessions: hands stay on the keyboard while the
     counsellor keeps eye contact with the family.                  */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (meta && k === "z") { e.preventDefault(); (e.shiftKey ? redo : undo)(); return; }
      if (meta && k === "y") { e.preventDefault(); redo(); return; }
      if (meta && k === "s") { e.preventDefault(); openSave(); return; }
      if (typing) return;
      if (e.key === "Escape") {
        setConnectNote(null);setPen(false);setTextMode(false);setEditing(null);
        if (menu) { setMenu(null); return; }
        setPending([]); setSel(null); saveHH(); setMode("select"); setBarMode("main"); return;
      }
      if(selNote&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        e.preventDefault();const step=e.shiftKey?10:2;
        updateNote({x:selNote.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:selNote.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ── 도구 막대 ────────────────────────────────────────────────
          늘 쓰는 것만 밖에 두고, 나머지는 세 갈래로 접었다.

          접기 전에는 묶음이 열 개가 넘었고 펜을 켜면 색 여섯에 굵기
          셋까지 붙어 화면 밖으로 밀려났다. 그래서 쓰는 빈도로 갈랐다.
          되돌리기·인물 추가·배율은 그리는 내내 손이 가므로 밖에 두고,
          가끔 쓰는 것은 `추가`·`덧쓰기`·`보기` 안으로 넣었다.

          다만 펜이나 글자를 켜 둔 동안에는 색과 굵기를 자주 바꾸므로,
          그때만 얇은 띠를 하나 더 내어 손이 닿는 자리에 둔다. */}
      <div style={{ position: "relative", flexShrink: 0, minHeight: toolHidden ? 0 : "auto" }}>
        {!toolHidden && <>
        <div className="gs-editor-toolbar" style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "8px 12px", gap: 10,
          background: "linear-gradient(180deg, #FAFCFD 0%, #E9EFF4 100%)",
          borderBottom: `1px solid ${T.rule}`, boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 2px 6px rgba(22,32,42,.04)",
          overflowX: "auto" }}>

          <Group>
            <GBtn first onClick={undo} disabled={!canUndo} title={`${t("undo")}  ⌘/Ctrl+Z`}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h7.2a3.8 3.8 0 0 1 0 7.6H5.5" /><path d="M5.6 2.2 2.6 5l3 2.8" />
              </svg>
            </GBtn>
            <GBtn onClick={redo} disabled={!canRedo} title={`${t("redo")}  ⌘/Ctrl+Shift+Z`}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 5H5.8a3.8 3.8 0 0 0 0 7.6h4.7" /><path d="M10.4 2.2 13.4 5l-3 2.8" />
              </svg>
            </GBtn>
          </Group>

          {/* 인물 추가는 그리는 내내 쓰므로 밖에 둔다 */}
          <Group>
            {[["male", t("male")], ["female", t("female")]].map(([g, l], i) => (
              <GBtn key={g} first={i === 0} onClick={() => addPerson(g)}><GenderGlyph gender={g} />{l}</GBtn>
            ))}
          </Group>

          {/* '기본 가계도'는 사례 시작할 때 한 번 쓰는 일이지만, 남성/여성
              바로 다음이 손에 익어 찾기 쉽다는 요청으로 여기 둔다. */}
          {templateRef && (
            <button type="button" onClick={() => templateRef.current?.()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", flexShrink: 0,
                borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600,
                border: `1px solid ${T.rule}`, background: "#fff", color: T.ink2 }}>
              {t("template")}
            </button>
          )}

          {/* 관계선은 그리는 내내 가장 자주 손이 가는 도구다. 다른
              갈래와 나란히 접혀 있으면 매번 두 번 눌러야 한다.
              그래서 접힌 갈래에서 빼내 따로, 눈에 띄게 둔다. */}
          <button type="button" onClick={openBonds} aria-expanded={menu==='bond'}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 15px 9px 13px", flexShrink: 0,
              borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
              background: menu === "bond" ? "linear-gradient(155deg, #2C4A6E 0%, #17293F 100%)" : "#fff",
              color: menu === "bond" ? "#fff" : T.ink,
              border: `1px solid ${menu === "bond" ? "transparent" : "rgba(22,32,42,.10)"}`,
              boxShadow: menu === "bond"
                ? "0 2px 10px rgba(22,32,42,.20)"
                : "0 1px 2px rgba(22,32,42,.06), 0 3px 9px rgba(22,32,42,.09)",
              fontSize: 12.5, fontFamily: FB, fontWeight: 600, letterSpacing: "-.01em",
              transition: "background .12s ease, color .12s ease" }}>
            {/* 두 사람 사이를 잇는다 — 네모와 동그라미를 선으로 묶은 표지 */}
            <svg width={22} height={14} viewBox="0 0 22 14" fill="none">
              <rect x={0.9} y={3.4} width={7.2} height={7.2} rx={1.1}
                stroke={menu === "bond" ? "#fff" : T.ink2} strokeWidth={1.3} />
              <circle cx={17.4} cy={7} r={3.6}
                stroke={menu === "bond" ? "#fff" : T.ink2} strokeWidth={1.3} />
              <path d="M8.6 7 H13.4" stroke={menu === "bond" ? "#fff" : T.sage} strokeWidth={1.6} strokeLinecap="round" />
            </svg>
            {t("menuBond")}
            <span style={{ fontSize: 8.5, opacity: 0.55 }}>{menu === "bond" ? "▲" : "▼"}</span>
          </button>

          <Group><GBtn first active={textMode||!!connectNote||!!editing} onPointerDown={e=>e.preventDefault()} onClick={toggleNote}
            title={tr(['Click again to finish annotation mode','다시 누르면 설명 박스 도구가 꺼집니다','再按一次結束說明框工具'],li)}>▤ {tr(['Annotation','설명 박스','說明框'],li)}</GBtn></Group>

          <Group><GBtn first active={mode === "triangle"} onClick={() => {
            setPen(false);setTextMode(false);setConnectNote(null);setObjRing(false);
            if(tlg){setTlg(false);setTimeout(fitView,0);}
            setMode("triangle");setPending(selPerson?[selPerson.id]:[]);setSel(null);setMenu(null);
          }}><TriGlyph />{t("triangles")}</GBtn></Group>

          <Group><GBtn first active={mode === "household"} onClick={() => {
            /* 다른 도구는 한 번 더 누르면 꺼지는데, 가구만 그렇지 않아
               Esc를 눌러야만 빠져나올 수 있었다. 같은 버릇으로 맞춘다. */
            if (mode === "household") { finishHH(); setMenu(null); return; }
            setPen(false);setTextMode(false);setConnectNote(null);startHH();setMenu(null);
          }}>⌂ {t("household")}</GBtn></Group>

          <span style={{ width: 1, alignSelf: "stretch", margin: "4px 2px", background: "rgba(22,32,42,.10)", flexShrink: 0 }} />

          {/* 아이패드 세로처럼 좁은 화면에서는 이 두 가지가 줄을 넘긴다.
              그리는 동안 늘 손이 가는 것이 아니므로 '더보기'로 접는다.
              관계선은 접지 않는다 — 가장 자주 쓰는 도구이기 때문. */}
          <Group>
            {[["ink", t("menuInk")], ["layer", t("menuLayer")], ["attrScale", t("attrTitle")],
              ...(tlg ? [["view", t("menuView")]] : [])].map(([k, l], i) => (
              <GBtn key={k} first={i === 0} active={menu === k}
                onClick={() => {if(k==="ink"&&tlg){setTlg(false);setTimeout(fitView,0);}setMenu(v=>v===k?null:k);}}>
                {l}<span style={{ fontSize: 9, opacity: 0.7 }}>{menu === k ? "▴" : "▾"}</span>
              </GBtn>
            ))}
          </Group>

          <div style={{ flex: 1, minWidth: 8 }} />

          <Group><GBtn first active={tlg} onClick={toggleTimeline}
            title={tr(['Click again to return to the standard view','다시 누르면 표준 가계도로 돌아갑니다','再按一次返回標準家系圖'],li)}>{t('viewTLG')}</GBtn></Group>

          <Group><GBtn first active={qOpen} onClick={()=>setQOpen(v=>!v)}>{t('tabInterview')}</GBtn></Group>


          {/* 예전에는 마우스를 얹어야만 내용이 떴다. 태블릿에는 얹는
              동작이 없어 아무 일도 일어나지 않았다. 이제 눌러서 편다. */}
          <button type="button" aria-label={t("keysTitle")} onClick={() => setMenu((v) => (v === "keys" ? null : "keys"))}
            title={t("keysTitle")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30,
              flexShrink: 0, borderRadius: 9, cursor: "pointer",
              background: menu === "keys" ? T.ink2 : "#fff",
              border: "1px solid rgba(22,32,42,.07)", boxShadow: "0 1px 2px rgba(22,32,42,.06)",
              color: menu === "keys" ? "#fff" : T.mute }}>
            <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
              <rect x={1.2} y={3.6} width={13.6} height={8.8} rx={1.8} />
              <path d="M4 6.4h.01M6.4 6.4h.01M8.8 6.4h.01M11.2 6.4h.01M4 8.8h.01M6.4 8.8h.01M8.8 8.8h.01M11.2 8.8h.01M5.2 10.9h5.6" />
            </svg>
          </button>
        </div>

        {/* 펼쳐진 갈래 */}
        {menu && (
          <div className="gs-tool-menu" style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 12,
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "10px 12px",
            background: "#fff", borderBottom: `1px solid ${T.rule}`,
            boxShadow: "0 8px 20px rgba(22,32,42,.12)" }}>

            {menu === "bond" && (<>
              <Group>
                {Object.entries(BOND_CATS).map(([k, v], i) => (
                  <GBtn key={k} first={i === 0} active={bondCat === k} onClick={() => { setBondCat(k); setBondKind(null); }}>
                    <span style={{ width: 14, height: 3, borderRadius: 2, background: v.color,
                      display: "inline-block", opacity: bondCat === k ? 1 : 0.75 }} />
                    {tr(v.label, li)}
                  </GBtn>
                ))}
              </Group>
              <Sep />
              {KIND_SETS[bondCat] ? Object.entries(KIND_SETS[bondCat]).map(([kind, label], i) => (
                <span key={kind} className="flex items-center">
                  {i > 0 && <span style={{ color: T.faint, margin: "0 8px", fontSize: 11 }}>·</span>}
                  <button type="button" className="gs-bond-kind"
                    onClick={() => pickBondType(bondCat, kind)}
                    style={{ padding: 0, background: "transparent", border: "none", flexShrink: 0, cursor: "pointer", whiteSpace: "nowrap",
                      color: BOND_CATS[bondCat].color,
                      fontSize: 11.5, fontFamily: FB, fontWeight: 600, letterSpacing: "-.01em" }}>
                    {tr(label, li)}
                  </button>
                </span>
              )) : Object.entries(BOND_TYPES).filter(([, v]) => v.cat === bondCat && !v.legacy).map(([ty, v]) => (
                <button key={ty} type="button" className="gs-bond-option"
                  onClick={() => pickBondType(ty, null)}
                  style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, cursor: "pointer", whiteSpace: "nowrap",
                    color: bondColor(ty),
                    fontSize: 11.5, fontFamily: FB, fontWeight: 600, letterSpacing: "-.01em" }}>
                  <svg width={34} height={14}><BondPreview type={ty} w={34} /></svg>{tr(v.label, li)}
                </button>
              ))}
              <span style={{ fontSize: 11, color: T.mute, fontFamily: FB, flexBasis: "100%" }}>
                {bondHintText()}
              </span>
              {dupGroups.length > 0 && (
                <span className="flex items-center" style={{ gap: 8, flexBasis: "100%", flexWrap: "wrap" }}>
                  <Btn onClick={() => mergeBonds(null)}>{t("mergeAll").replace("{n}", dupGroups.length)}</Btn>
                  <span style={{ fontSize: 11, color: T.mute, fontFamily: FB }}>{t("mergeNote")}</span>
                </span>
              )}
            </>)}

                        {menu === "attrScale" && (<>
              {/* 분화·척도 메뉴 ─ 항상 표시. 인물 선택 전엔 슬라이더 비활성.
                  순서: 자아분화 → 현장 척도 1 → 2 → 3.
                  현장 척도는 이름 칸이 곧 슬라이더의 이름표다. 이름이 비면 슬라이더는
                  잠겨 있고, 그 칸은 가계도·인물 정보 어디에도 나타나지 않는다. */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"8px 12px",
                  background:"#F7F9FC", border:`1px solid ${T.rule}`, borderRadius:10, minWidth:300 }}>
                  <span style={{ fontSize:11, fontFamily:FB, fontWeight:700, color: selPerson ? T.ink : T.mute }}>
                    {selPerson ? (selPerson.name || "—")
                      : tr(["Select a person","인물을 누르면 활성화됩니다","點選人物以啟用"],li)}
                  </span>
                  {[{ k:"diff", L:null }, ...(doc.attrLayers||[]).map((L)=>({ k:L.id, L }))].map(({k,L},ci)=>{
                    const cc=CHIP_COLORS[ci%CHIP_COLORS.length];
                    const named = !L || !!scaleName(L);
                    const live = !!selPerson && named;
                    const setNm = (name) => setDoc((d) => ({ ...d, attrLayers: (d.attrLayers||[]).map((x) => (x.id===L.id ? {...x, name} : x)) }));
                    return (
                    <div key={k} className="flex items-center" style={{gap:6}}>
                      {L ? (
                        <input value={L.name} placeholder={tr(S.customScaleEx, li)[ci-1] || t("layName")}
                          onChange={(e)=>setNm(e.target.value)}
                          style={{ ...inputStyle, width:96, flexShrink:0, borderRadius:7, fontSize:11.5, padding:"3px 7px",
                            fontWeight:600, color:cc, borderStyle: named ? "solid" : "dashed" }} />
                      ) : (
                        <span title={t("diffF")} style={{fontSize:11.5,fontFamily:FB,color:cc,width:96,flexShrink:0,fontWeight:700,
                          padding:"0 7px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t("diffShort")}</span>
                      )}
                      <input type="range" min={0} max={100} step={1} disabled={!live}
                        value={selPerson && typeof selPerson.attrs?.[k]==="number" ? selPerson.attrs[k] : 50}
                        onChange={(e)=>selPerson&&updatePerson(selPerson.id,{attrs:{...(selPerson.attrs||{}),[k]:+e.target.value}})}
                        style={{flex:1,minWidth:90,accentColor:cc,opacity:live?1:0.35}}/>
                      <span style={{minWidth:30,fontSize:12,fontFamily:FM,fontWeight:700,
                        color:live?cc:T.faint,textAlign:"right",
                        background:live?"#EEF3FA":"#F4F7FA",borderRadius:5,padding:"1px 5px"}}>
                        {live && typeof selPerson.attrs?.[k]==="number" ? selPerson.attrs[k] : "—"}
                      </span>
                      {/* 자리를 맞추려고 ✕ 칸은 늘 두되, 이름이 있을 때만 보인다 */}
                      <button type="button" title={t("del")} onClick={()=>L&&named&&setNm("")}
                        style={{ background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:12,
                          padding:"1px 3px", width:18, visibility: L&&named ? "visible" : "hidden" }}>✕</button>
                    </div>
                  );})}
                </div>
                {(doc.attrLayers||[]).some((L)=>!scaleName(L)) && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flex:"1 1 240px", maxWidth:340 }}>
                    <div style={HINT_NOTE}>{t("customUnnamed")}</div>
                  </div>
                )}
              </div>
            </>)}
            {menu === "ink" && (<>
              <Group>
                <GBtn first active={pen&&!penHi&&!penErase} onClick={() => selectPen(false)}>
                  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.6 1.9 14.1 4.4 5.3 13.2 1.9 14.1 2.8 10.7z" /><path d="M10.2 3.3 12.7 5.8" />
                  </svg>{t("penSolid")}
                </GBtn>
                <GBtn active={pen&&penHi&&!penErase} onClick={() => selectPen(true)}>{t('penHi')}</GBtn>
                <GBtn active={pen&&penErase} onClick={()=>{selectPen(false);setPenErase(true);}}>{t('penErase')}</GBtn>
              </Group>
              {/* 형광펜·굵기·크기·지우개는 캔버스 팔레트에 있다. 여기 또 두면
                  같은 것을 두 벌 보여 주게 되고 윗줄만 길어진다. */}
              <Group>
                <GBtn first onClick={() => setDoc((d) => ({ ...d, ink: [] }))}
                  disabled={!(doc.ink || []).length}>{tr(['Clear pen strokes','필기만 지우기','清除筆跡'],li)}</GBtn>
              </Group>
            </>)}

            {menu === "keys" && (<>
              <span style={{ fontSize: 11.5, fontFamily: FB, fontWeight: 700, color: T.ink }}>{t("keysTitle")}</span>
              {[["⌘/Ctrl + Z", t("keyUndo")], ["⌘/Ctrl + S", t("keySave")], ["Delete", t("keyDel")], ["Esc", t("keyEsc")]].map(([k, l]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontFamily: FB, color: T.ink2 }}>
                  <code style={{ fontFamily: FM, fontSize: 11, padding: "3px 7px", borderRadius: 6,
                    background: "rgba(22,32,42,.05)", color: T.ink }}>{k}</code>
                  {l}
                </span>
              ))}
            </>)}

            {menu === "layer" && (<>
              <Group>
                {[["hh", t("layHH")], ["tri", t("layTri")], ["bond", t("layBond")], ["label", t("layLabel")], ["ink", t("layInk")], ["note", t("layNote")], ["attr", t("layAttr")], ["band", t("layBand")]].map(([k, l], i) => (
                  <GBtn key={k} first={i === 0} active={vis[k]}
                    onClick={() => setVis((v) => ({ ...v, [k]: !v[k] }))}>
                    <span style={{ fontSize: 10, opacity: 0.75 }}>{vis[k] ? "◉" : "○"}</span>{l}
                  </GBtn>
                ))}
              </Group>
              {vis.band && (
                <div className="flex items-center" style={{ gap: 6 }}>
                  <span style={{ fontSize: 10.5, color: T.mute, fontFamily: FB }}>{t("bandColorLbl")}</span>
                  {Object.entries(BAND_PALETTES).map(([k, hex]) => (
                    <button key={k} type="button" title={k} onClick={() => setDoc((d) => ({ ...d, viewPrefs: { ...(d.viewPrefs || {}), bandColor: k } }))}
                      style={{ width: 22, height: 22, borderRadius: 6, background: hex, cursor: "pointer",
                        border: (doc.viewPrefs?.bandColor || "blue") === k ? `2px solid ${T.pine}` : `1px solid ${T.rule}` }} />
                  ))}
                </div>
              )}
              <span style={{ fontSize: 11, color: T.mute, fontFamily: FB }}>{t("layHint")}</span>
              <div style={{ flex: 1 }} />
              <Group>
                <GBtn first disabled={!doc.people.some((p) => p.fixed)}
                  onClick={() => setDoc((d) => ({ ...d, people: d.people.map((p) => ({ ...p, fixed: 0 })) }))}>
                  {t("unpinAll")}
                </GBtn>
              </Group>
            </>)}

            {menu === "view" && (<>
              {tlg && (<>
                <Group>
                  <GBtn first active={stdInset} onClick={() => { setStdInset((v) => !v); setTimeout(fitTLG, 0); }}>{t("stdInsetTog")}</GBtn>
                  <GBtn onClick={resetTlg} disabled={!Object.keys(doc.tlgPos || {}).length}>{t("tlgReset")}</GBtn>
                </Group>
                <input type="range" min={4} max={26} value={tlgScale} onChange={(e) => setTlgScale(+e.target.value)} style={{ width: 74, flexShrink: 0, accentColor: T.pine }} />
                <input value={tlgWin.from} onChange={(e) => setTlgWin((w) => ({ ...w, from: e.target.value }))} placeholder={t("from")} style={{ ...inputStyle, width: 58, fontFamily: FM, flexShrink: 0, borderRadius: 9 }} />
                <input value={tlgWin.to} onChange={(e) => setTlgWin((w) => ({ ...w, to: e.target.value }))} placeholder={t("to")} style={{ ...inputStyle, width: 58, fontFamily: FM, flexShrink: 0, borderRadius: 9 }} />
              </>)}
            </>)}
          </div>
        )}
        </>}
      </div>

      <div className="gs-workspace" style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: narrow ? "column" : "row" }}>
        {qOpen && (
          <aside style={{ display: "flex", flexDirection: "column", flexShrink: 0, background: T.panel,
            ...(narrow
              ? { width: "100%", height: "42vh", borderBottom: `1px solid ${T.rule}` }
              : { width: 312, borderRight: `1px solid ${T.rule}` }) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
              borderBottom: `1px solid ${T.rule}`, background: "linear-gradient(180deg,#FBFCFD,#EFF3F7)" }}>
              <span style={{ flex: 1, fontSize: 12.5, fontFamily: FB, fontWeight: 700, color: T.ink }}>{t("ivTitle")}</span>
              <button type="button" onClick={() => setQOpen(false)} title={t("closePanel")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: T.mute, fontSize: 15, padding: "0 2px" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              <InterviewGuide li={li} hideTitle />
            </div>
          </aside>
        )}
        <main className="gs-canvas" style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <svg ref={svgRef} style={{ width: "100%", height: "100%", background: T.canvas, touchAction: "none", display: "block" }}
            onPointerDownCapture={onPointerDownCapture} onPointerMoveCapture={onPointerMoveCapture}
            onPointerUpCapture={onPointerUpCapture} onPointerCancelCapture={onPointerUpCapture}
            onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} onWheel={onWheel}>
            {svgDefs()}
            <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" onPointerDown={onBgDown} />
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {mqBox && (
                <rect x={mqBox.x} y={mqBox.y} width={mqBox.w} height={mqBox.h} fill={T.gold} fillOpacity={0.08}
                  stroke={T.gold} strokeWidth={1.4} strokeDasharray="5 4" pointerEvents="none" />
              )}
              <Layers doc={doc} li={li} detail={detail} sel={sel} showStory={showStory} showTL={showTL} vis={vis} msel={msel}
                tlg={tlg} tlgScale={tlgScale} tlgWin={tlgWin} stdInset={stdInset} hhDraft={hhDraft} pending={pending}
                onMove={moveTlg} viewK={view.k}
                onPerson={(id) => { setSel({ kind: "person", id }); setTab("detail"); setPanelOpen(true); }}
                onUnion={(id) => { setSel({ kind: "union", id }); setTab("detail"); setPanelOpen(true); }}
                onBond={(id, seg) => { setSel({ kind: "bond", id, seg: seg || null }); setTab("detail"); setPanelOpen(true); }}
                onHH={(id) => { setSel({ kind: "household", id }); setTab("detail"); setPanelOpen(true); }}
                onTri={(id) => { setSel({ kind: "triangle", id }); setTab("detail"); setPanelOpen(true); }}
                onDown={onNodeDown} />
                          {vis.ink && !tlg && <InkLayer strokes={doc.ink || []} live={live} />}
                          {vis.note && !tlg && <NoteLayer notes={doc.notes || []} doc={doc} detail={detail} vis={vis} hideId={editing?.id} selected={sel?.kind==="note"?sel.id:null} onDown={beginNoteDrag} onEdit={editNote} onBend={beginBend} />}

            </g>
            {/* 펜 모드에서는 이 판이 모든 입력을 먼저 받는다. 가계도보다
                위에 있어야 인물이나 선 위에 그어도 그것이 끌려가지 않는다. */}
            {(pen || textMode || connectNote) && (
              <rect x={0} y={0} width="100%" height="100%" fill="transparent"
                onPointerDown={onBgDown}
                style={{ cursor: connectNote ? "crosshair" : textMode ? "text" : penErase ? "cell" : "crosshair", touchAction: "none" }} />
            )}
          </svg>

          <div className="gs-zoom" style={selPerson && !selPerson.preg ? { opacity: 0.15, pointerEvents: "none", transition: "opacity .15s" } : { transition: "opacity .15s" }}>          <Group>
            <GBtn first onClick={() => (tlg ? fitTLG() : fitView())} title={t("fit")}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6V2.4h3.6M14 6V2.4h-3.6M2 10v3.6h3.6M14 10v3.6h-3.6" />
              </svg>
            </GBtn>
            <GBtn onClick={() => zoomBy(1 / 1.15)} disabled={view.k <= 0.26} title={t("zoomOut")}>−</GBtn>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 46,
              fontSize: 11, color: T.mute, fontFamily: FM, borderLeft: `1px solid rgba(22,32,42,.08)`,
              borderRight: `1px solid rgba(22,32,42,.08)`, alignSelf: "stretch" }}>
              {Math.round(view.k * 100)}%
            </span>
            <GBtn onClick={() => zoomBy(1.15)} disabled={view.k >= 2.19} title={t("zoomIn")}>＋</GBtn>
          </Group></div>
          <div className="gs-canvas-status">{doc.people.length}{tr([' people','명',' 人'],li)} · {doc.bonds.length}{tr([' relationships','개 관계',' 段關係'],li)}</div>
          {connectNote&&<div className="gs-connect-hint"><span>{tr(['Click a person, relationship line or a point on the canvas.','연결할 인물·관계선 또는 그림의 지점을 누르세요.','點選要連接的人物、關係線或畫布位置。'],li)}</span><button onClick={()=>setConnectNote(null)}>{t('cancel')}</button></div>}
          {/* '기본 가계도'는 위쪽 메뉴에 이미 있다(templateRef). 여기서
             또 권하면, 개인 내담자처럼 3대 틀이 안 맞는 가계도를 그릴
             때도 일단 만들어진 사람들을 지우고 시작하게 된다. 빈
             캔버스는 그냥 비워 둔다 — 필요하면 메뉴에서 고르면 된다. */}
          {!doc.people.length&&!(doc.notes||[]).length&&!textMode&&!pen&&<div className="gs-empty-canvas" style={{opacity:.35}}><Logo size={40}/></div>}
          {!tlg && mode === "select" && selPerson && !selPerson.preg && !objRing && !pen && !textMode && !editing && !connectNote && selPerson.gender !== "object" && menu!=='bond' && (
            <NodeHandles p={selPerson} view={view} svgRef={svgRef} hasParents={!!selPerson.puid} li={li}
              onSpouse={() => addSpouse(selPerson, "married")} onSameSpouse={() => addSpouse(selPerson, "ssm", true)} onParents={() => addParents(selPerson)}
              onSon={() => addChild(selPerson, "male", quickLink)} onDaughter={() => addChild(selPerson, "female", quickLink)}
              onBrother={() => addSibling(selPerson, "male")} onSister={() => addSibling(selPerson, "female")}
              onBond={openBonds} />
          )}
          {!tlg && mode === "select" && selPerson && selPerson.gender === "object" && (
            <ObjectRing p={selPerson} view={view} svgRef={svgRef} li={li} mode="edit"
              onPick={(k) => updatePerson(selPerson.id, { objKind: k })} onClose={() => setSel(null)} />
          )}
          {objRing && mode==='triangle' && pending.length>0 && byId[pending[0]] && (
            <ObjectRing p={byId[pending[0]]} view={view} svgRef={svgRef} li={li}
              onPick={(k) => addObject(byId[pending[0]], k)} onClose={() => setObjRing(false)} />
          )}
          {cnSeg && cnBond && mode === "select" && (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 14, zIndex: 8,
              width: "min(560px, calc(100% - 24px))", boxSizing: "border-box", padding: "10px 12px", background: "#fff",
              border: `1px solid ${T.rule}`, borderRadius: 14, boxShadow: "0 10px 28px rgba(22,32,42,.22)", fontFamily: FB }}>
              <div style={{ fontSize: 12, color: T.ink2, marginBottom: 8, lineHeight: 1.5 }}>
                <b style={{ color: T.ink }}>{t("chgTitle")}</b> · {nameOf(cnBond.a)} ↔ {nameOf(cnBond.b)}
                {" · "}
                <span style={{ color: bondColor(cnSegs[cnIdx - 1] ? cnSegs[cnIdx - 1].type : cnSeg.type) }}>
                  {tr((BOND_TYPES[cnSegs[cnIdx - 1] ? cnSegs[cnIdx - 1].type : cnSeg.type] || BOND_TYPES.harmony).label, li)}</span>
                {" → "}
                <b style={{ color: bondColor(cnSeg.type) }}>{tr((BOND_TYPES[cnSeg.type] || BOND_TYPES.harmony).label, li)}</b>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={cnSeg.from || ""} inputMode="numeric" placeholder={t("chgYear")}
                  onChange={(e) => writeChange({ from: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") closeChange(false); }}
                  style={{ ...inputStyle, width: 104, fontFamily: FM }} />
                <input data-trans="" value={cnSeg.note || ""} placeholder={t("chgReason")}
                  onChange={(e) => writeChange({ note: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") closeChange(false); }}
                  style={{ ...inputStyle, flex: 1, minWidth: 170, width: "auto" }} />
                <BarChip onClick={() => closeChange(false)}>{t("chgDone")}</BarChip>
              </div>
              <button type="button" onClick={() => closeChange(true)}
                style={{ marginTop: 7, padding: 0, background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 11.5, fontFamily: FB, color: T.pine, textDecoration: "underline" }}>{t("chgMore")}</button>
            </div>
          )}
          {mode === "household" && (
            <div style={{ position: "absolute", left: 8, right: 8, bottom: 10, display: "flex", gap: 8, alignItems: "center",
              background: "rgba(255,255,255,.96)", border: `1px solid ${T.rule}`, borderRadius: 24, padding: "8px 12px", zIndex: 6 }}>
              <span style={{ fontSize: 12.5, color: T.ink2, fontWeight: 600 }}>{t("household")} · {hhDraft?.members.length || 0}</span>
              <span style={{ fontSize: 11.5, color: T.mute, flex: 1, minWidth: 0, lineHeight: 1.4 }}>{t("hhModeHint")}</span>
              <BarChip onClick={finishHH}>{t("hhDone")}</BarChip>
              <BarChip tone="warn" onClick={() => { setHhDraft(null); setMode("select"); }}>{t("cancel")}</BarChip>
            </div>
          )}
          {(mode === "union" || mode === "bond" || mode === "triangle") && (
            <div style={{ position: "absolute", left: 16, top: 16, background: "rgba(22,32,42,.92)", color: "#fff",
              padding: "9px 13px", borderRadius: 6, fontSize: 12.5, maxWidth: 340, lineHeight: 1.55 }}>
              {mode === "bond" ? bondHintText() :
                mode === "triangle" ? `${t("triangle")} ${pending.length}/3` : t("couple")}
              {mode==='triangle'&&<div style={{display:'flex',gap:8,alignItems:'center',marginTop:8,flexWrap:'wrap'}}>
                <span>{tr(['Connect people / objects','인물·대상을 연결하세요','連接人物/對象'],li)}</span>
                <button type="button" onClick={()=>setObjRing(v=>!v)}
                  style={{background:'#fff',color:T.ink,border:'none',borderRadius:5,padding:'7px 10px',fontSize:14,cursor:'pointer'}}>
                  ＋ {tr(['Add object outside family','가족 이외의 대상 추가','新增家庭外對象'],li)}</button>
              </div>}
              <button type="button" onClick={()=>{setMode('select');setPending([]);setObjRing(false);if(mode==='bond'){setBondType(null);setBondKind(null);setMenu(null);}}}
                style={{marginTop:8,background:'transparent',border:'1px solid #ffffff88',borderRadius:5,padding:'4px 8px',color:'#fff',cursor:'pointer'}}>{t('cancel')}</button>
            </div>
          )}
          {/* 덧쓰기 팔레트 — 색과 굵기는 그리는 손 가까이 있어야 한다.
              화면 맨 위까지 손을 뻗지 않도록 캔버스 왼쪽에 띄운다. */}
          {(pen || textMode) && (
            <div className="gs-ink-palette" style={{ position: "absolute", left: 12, top: menu ? 76 : 12, zIndex: 7,
              display: "flex", flexDirection: "column", gap: 6, padding: 7,
              background: "rgba(255,255,255,.96)", border: `1px solid ${T.rule}`, borderRadius: 12,
              boxShadow: "0 6px 20px rgba(22,32,42,.16)" }}>
              {pen&&<>
                <div style={{display:'flex',gap:4}}>
                  <GBtn first active={!penHi&&!penErase} onClick={()=>selectPen(false)}>{t('penSolid')}</GBtn>
                  <GBtn active={penHi&&!penErase} onClick={()=>selectPen(true)}>{t('penHi')}</GBtn>
                </div>
                <svg className="gs-ink-sample" width={160} height={44} aria-label={tr(['Stroke preview','필기 미리보기','筆跡預覽'],li)}>
                  <text x={12} y={28} fontSize={14} fill={T.ink}>{tr(['Family relationship','가족 관계','家庭關係'],li)}</text>
                  <InkLayer strokes={[{id:'sample',pts:[[8,23,.5],[148,23,.5]],w:penW,hi:penHi,inkStyle:2,color:(INK_COLORS.find(c=>c.id===penColor)||INK_COLORS[0]).c}]}/>
                </svg>
              </>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {INK_COLORS.map((c) => (
                  <button key={c.id} type="button" title={tr(c.label, li)}
                    onClick={() => { textMode?setNoteColor(c.id):setPenColor(c.id); setPenErase(false); }}
                    style={{ width: 26, height: 26, borderRadius: 13, cursor: "pointer", padding: 0,
                      background: c.c, opacity: pen && penHi ? 0.6 : 1,
                      border: (textMode?noteColor:penColor) === c.id && !penErase ? `2.5px solid ${T.ink}` : `1px solid rgba(0,0,0,.12)` }} />
                ))}
              </div>

              {pen && (
                <div style={{ display: "flex", gap: 5, borderTop: `1px solid ${T.rule}`, paddingTop: 6 }}>
                  {(penHi?[16,24,36]:[2,3,5]).map((w) => (
                    <button key={w} type="button" onClick={() => { setPenW(w); setPenErase(false); }}
                      title={`${w}px`} aria-label={`${w}px`} aria-pressed={penW===w&&!penErase}
                      style={{ flex: 1, height: 26, borderRadius: 7, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: penW === w && !penErase ? T.pine : "#fff",
                        border: `1px solid ${penW === w && !penErase ? T.pine : T.rule}` }}>
                      <span style={{ display: "block", width: 18, height: penHi?w/2:w, borderRadius: penHi?1:w,
                        background: penW === w && !penErase ? "#fff" : T.ink2 }} />
                    </button>
                  ))}
                </div>
              )}

              {textMode && (
                <div style={{ display: "flex", gap: 5, borderTop: `1px solid ${T.rule}`, paddingTop: 6 }}>
                  {[12, 16, 22].map((z, i) => (
                    <button key={z} type="button" onClick={() => setNoteSize(z)}
                      style={{ flex: 1, height: 26, borderRadius: 7, cursor: "pointer",
                        fontSize: 10 + i * 3, fontWeight: 700, fontFamily: FB,
                        color: noteSize === z ? "#fff" : T.ink2,
                        background: noteSize === z ? T.pine : "#fff",
                        border: `1px solid ${noteSize === z ? T.pine : T.rule}` }}>가</button>
                  ))}
                </div>
              )}

              {pen && (
                <button type="button" onClick={() => setPenErase((v) => !v)}
                  style={{ height: 28, borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontFamily: FB,
                    fontWeight: penErase ? 600 : 500,
                    color: penErase ? "#fff" : T.ink2,
                    background: penErase ? T.pine : "#fff",
                    border: `1px solid ${penErase ? T.pine : T.rule}` }}>{t("penErase")}</button>
              )}

              <button type="button" onClick={() => { setPen(false); setTextMode(false); setPenErase(false); }}
                style={{ height: 26, borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: FB,
                  color: T.mute, background: "#fff", border: `1px solid ${T.rule}` }}>✕</button>
            </div>
          )}

          {/* 선택한 설명 박스의 글씨를 바로 키우고 줄이는 작은 단추(기본은 12). 오른쪽 위에 붙는다. */}
          {selNote && !editing && (() => {
            const b = noteBounds(selNote);
            const SIZES = [10, 12, 14, 16, 18, 22, 28];
            const cur = selNote.size || 12;
            const idx = SIZES.includes(cur) ? SIZES.indexOf(cur) : Math.max(0, SIZES.findIndex((z) => z >= cur));
            const bump = (d) => updateNote({ size: SIZES[Math.min(SIZES.length - 1, Math.max(0, idx + d))] });
            const bs = { border: `1px solid ${T.rule}`, background: "#fff", color: T.ink2, borderRadius: 6, cursor: "pointer", fontSize: 10.5, fontWeight: 700, padding: "0 6px", lineHeight: 1.5, fontFamily: FB, boxShadow: "0 1px 4px rgba(22,32,42,.18)" };
            return (
              <div className="gs-note-size" data-noprint onPointerDown={(e) => e.stopPropagation()}
                style={{ position: "absolute", zIndex: 9, left: view.x + (b.x + b.w) * view.k - 50, top: view.y + b.y * view.k - 21, display: "flex", gap: 2 }}>
                <button type="button" className="gs-note-size-dn" title={tr(['Smaller text','글씨 작게','縮小文字'],li)} onClick={() => bump(-1)} style={bs}>A−</button>
                <button type="button" className="gs-note-size-up" title={tr(['Larger text','글씨 크게','放大文字'],li)} onClick={() => bump(1)} style={bs}>A+</button>
              </div>
            );
          })()}

          {editing && (
            <textarea ref={editRef} autoFocus value={editing.value} rows={Math.min(5, noteLines(editing.value).length || 1)}
              onChange={(e) => setEditing((v) => ({ ...v, value: e.target.value }))}
              onBlur={() => { if (Date.now() - editOpened.current > 350) commitEdit(); }}
              onKeyDown={(e) => {
                /* Enter로 확정하고, 줄을 직접 나누고 싶으면 Shift+Enter */
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode!==229) { e.preventDefault(); commitEdit(); }
                if (e.key === "Escape") setEditing(null);
              }}
              placeholder={t("noteAdd")}
              style={{ position: "absolute", zIndex: 8,
                left: view.x + editing.x * view.k - 4,
                top: view.y + editing.y * view.k - (editing.size || 12) * view.k - 8,
                width: Math.max(150, NOTE_WRAP * (editing.size || 12) * view.k * 0.66),
                padding: "5px 9px", borderRadius: 4, resize: "none", lineHeight: TK_RE.test(editing.value) ? 1.75 : 1.35,
                border: `1.5px solid ${T.pine}`, background: "#fff", color: T.ink,
                fontSize: Math.max(12, (editing.size || 12) * view.k), fontFamily: FB, fontWeight: 600,
                boxShadow: "0 4px 14px rgba(22,32,42,.18)", outline: "none" }} />
          )}

          {/* 여닫이 단추. 닫혀 있을 때는 무언가 감춰져 있다는 것을 알려야
              하므로 먹빛으로 채워 눈에 띄게 하고, 열려 있을 때는 작업을
              방해하지 않도록 조용히 물러난다. 화살표가 어느 쪽으로 움직일지
              가리킨다. */}
          <button type="button" onClick={() => setPanelOpen((v) => !v)}
            title={panelOpen ? t("panelHide") : t("panelShow")}
            style={{ position: "absolute", right: panelOpen ? 12 : 0, top: 12,
              display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
              background: panelOpen ? "rgba(255,255,255,.94)" : T.pine,
              color: panelOpen ? T.ink2 : "#fff",
              border: panelOpen ? `1px solid ${T.rule}` : "none",
              borderRadius: panelOpen ? 16 : "16px 0 0 16px",
              padding: panelOpen ? "7px 12px" : "10px 15px 10px 17px",
              boxShadow: panelOpen ? "0 2px 8px rgba(22,32,42,.10)" : "0 4px 16px rgba(22,32,42,.28)",
              fontSize: 12.5, fontFamily: FB, fontWeight: panelOpen ? 500 : 600 }}>
            <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: panelOpen ? "none" : "rotate(180deg)" }}>
              <path d="M5.5 3 L10.5 8 L5.5 13" />
            </svg>
            {panelOpen ? t("panelHide") : t("panelShow")}
          </button>
        </main>

        {panelOpen && (
          <aside className="gs-inspector" style={{ display: "flex", flexDirection: "column", ...(narrow
            ? { width: "100%", height: "50vh", background: T.panel, borderTop: `1px solid ${T.rule}`, flexShrink: 0 }
            : { width: 336, background: T.panel, borderLeft: `1px solid ${T.rule}`, minWidth: 0 }) }}>
            {/* 336px 폭에 탭 여섯이 가로로 들어가지 않는다. 가로 스크롤로
                두면 마지막 탭이 잘린 채 더 있다는 표시도 없어서, 두 줄로
                접어 여섯 개가 언제나 보이게 한다. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 8px 6px",
              background: "linear-gradient(180deg,#FBFCFD,#EFF3F7)", borderBottom: `1px solid ${T.rule}` }}>
              {[["detail", t("tabDetail")], ["list", t("tabList")], ["story", t("tabStory")], ["context", t("tabContext")], ["time", t("tabTime")]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  style={{ flex: "0 0 auto", padding: "7px 12px", fontSize: 12, fontFamily: FB, cursor: "pointer", whiteSpace: "nowrap",
                    borderRadius: 14, border: "none",
                    background: tab === k ? "linear-gradient(155deg, #2C4A6E 0%, #17293F 100%)" : "transparent",
                    boxShadow: tab === k ? "0 2px 6px rgba(22,32,42,.18)" : "none",
                    color: tab === k ? "#fff" : T.mute, fontWeight: tab === k ? 600 : 500,
                    transition: "background .12s ease, color .12s ease" }}>{l}</button>
              ))}
            </div>
            <div className="gs-panel-content" style={{ flex: 1, overflowY: "auto", padding: 14 }}>

              {tab==='detail' && selNote && <div className="gs-note-panel">
                <SectionTitle>{tr(['Annotation','설명 박스','說明框'],li)}</SectionTitle>
                <p className="gs-help">{tr(['Drag the box to move it. Double-click to edit.','박스를 끌어 이동하고, 두 번 눌러 글을 고칩니다.','拖曳移動說明框，點兩下編輯文字。'],li)}</p>
                <Field label={tr(['Text','설명 내용','說明內容'],li)}>
                  <textarea rows={4} value={selNote.text} onChange={e=>updateNote({text:e.target.value})} style={{...inputStyle,resize:'vertical',lineHeight:1.65}}/>
                </Field>
                <div className="grid grid-cols-2" style={{gap:12}}>
                  <Field label={tr(['Text size','글자 크기','文字大小'],li)}><select value={selNote.size||12} onChange={e=>updateNote({size:+e.target.value})} style={inputStyle}>
                    {[10,12,14,16,18,22,28].map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
                  <Field label={tr(['Color','색상','顏色'],li)}><input aria-label={tr(['Note color','설명 색상','說明顏色'],li)} type="color" value={selNote.color||T.ink2} onChange={e=>updateNote({color:e.target.value})} style={{...inputStyle,height:40}}/></Field>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',margin:'-4px 0 8px'}}>
                  <button type="button" className="gs-note-size-all" onClick={()=>setDoc(d=>({...d,notes:(d.notes||[]).map(n=>({...n,size:selNote.size||12}))}),'notes-size-all')}
                    style={{border:`1px solid ${T.rule}`,background:'#fff',color:T.ink2,borderRadius:6,cursor:'pointer',fontSize:11,padding:'2px 8px',fontFamily:FB}}>
                    {tr(['Apply this size to all notes','모든 설명 박스에 이 크기 적용','全部說明框套用此大小'],li)}</button>
                </div>
                <div className="gs-note-connection">
                  <SectionTitle>{tr(['Connector','설명 연결선','說明連接線'],li)}</SectionTitle>
                  {/* 한 사건이 부부와 자녀에게 동시에 걸리는 일이 흔해,
                      연결을 여러 개 둘 수 있다. 목록으로 보여 주고
                      각각 따로 뗄 수 있게 한다. */}
                  {noteAnchorList(selNote).length===0&&
                    <div style={{fontSize:13,color:T.mute,marginBottom:10}}>{tr(['No connector','연결 없음','未連接'],li)}</div>}
                  {noteAnchorList(selNote).map((a,ai)=>(
                    <div key={ai} className="flex items-center justify-between" style={{gap:8,padding:'6px 0',borderBottom:'1px solid rgba(22,32,42,.08)'}}>
                      <span style={{fontSize:13,color:T.ink2}}>
                        {ai+1}. {tr(a.kind==='person'?['Person','인물','人物']:a.kind==='bond'?['Relationship line','관계선','關係線']:a.kind==='union'?['Union line','부부선','伴侶線']:['Canvas point','지정한 위치','指定位置'],li)}
                        {a.kind!=='point'&&<span style={{color:T.mute}}> · {noteAnchorLabel({anchor:a},doc,li)}</span>}
                      </span>
                      <Btn onClick={()=>{
                        const list=noteAnchorList(selNote).filter((_,i)=>i!==ai);
                        updateNote({anchor:list[0]||null,anchors:list.slice(1)});
                      }}>✕</Btn>
                    </div>
                  ))}
                  <div className="flex" style={{gap:8,flexWrap:'wrap',marginTop:10}}>
                    <Btn onClick={()=>{setConnectNote(selNote.id);setTextMode(false);setPen(false);setMenu(null);setPanelOpen(false);}}>{tr([selNote.anchor?'Replace first target':'Connect to person or line',selNote.anchor?'첫 연결 다시 선택':'인물·관계선에 연결',selNote.anchor?'重新選擇第一個對象':'連接人物或關係線'],li)}</Btn>
                    {selNote.anchor&&<Btn onClick={()=>{setConnectNote({id:selNote.id,add:true});setTextMode(false);setPen(false);setMenu(null);setPanelOpen(false);}}>＋ {tr(['Add another','연결 추가','新增連接'],li)}</Btn>}
                  </div>
                  {selNote.anchor&&<>
                    <Field label={tr(['Bend direction','꺾임 방향','轉折方向'],li)}>
                      <select value={selNote.connector?.axis||'auto'} onChange={e=>updateNote({connector:{...selNote.connector,axis:e.target.value,offset:0}})} style={inputStyle}>
                        {[['auto',['Automatic','자동','自動']],['horizontal',['Horizontal first','가로 방향 먼저','先橫向']],['vertical',['Vertical first','세로 방향 먼저','先縱向']]].map(([v,l])=><option key={v} value={v}>{tr(l,li)}</option>)}
                      </select>
                    </Field>
                    <Field label={tr(['Enter box from','박스에 닿는 방향','進入說明框的方向'],li)}>
                      <select value={selNote.connector?.side||'auto'} onChange={e=>updateNote({connector:{...selNote.connector,side:e.target.value,offset:0}})} style={inputStyle}>
                        {[['auto',['Automatic','자동','自動']],['left',['Left','왼쪽','左側']],['right',['Right','오른쪽','右側']],['top',['Top','위쪽','上方']],['bottom',['Bottom','아래쪽','下方']]].map(([v,l])=><option key={v} value={v}>{tr(l,li)}</option>)}
                      </select>
                    </Field>
                    <p className="gs-help">{tr(['Drag the small square on the connector to adjust its bend.','점선의 작은 네모를 끌면 꺾이는 위치를 조정할 수 있습니다.','拖曳虛線上的小方塊可調整轉折位置。'],li)}</p>
                    <div className="flex" style={{gap:8,flexWrap:'wrap'}}>
                      <Btn onClick={()=>updateNote({connector:{axis:'auto',side:'auto',offset:0}})}>{tr(['Reset route','자동 연결로 복원','恢復自動連接'],li)}</Btn>
                      <Btn onClick={()=>updateNote({anchor:null,anchors:[]})}>{tr(['Disconnect all','연결 모두 해제','全部取消連接'],li)}</Btn>
                    </div>
                  </>}
                </div>
                <Btn tone="warn" full onClick={deleteSelected}>{tr(['Delete note','설명 박스 삭제','刪除說明框'],li)}</Btn>
              </div>}
              {tab==='detail'&&(selPerson||selBond||selUnion)&&<div className="gs-context-add"><button onClick={startNote}>＋ {tr(['Attach an annotation here','선택한 대상에 설명 붙이기','在選取對象上連接說明'],li)}</button></div>}
              {tab === "detail" && !sel && (
                <div style={{ fontSize: 12.5, color: T.mute, lineHeight: 1.48 }}>
                  <SectionTitle>{t("nothingSel")}</SectionTitle>
                  {t("nothingSelBody")}
                  <div style={{ marginTop: 14, padding: 11, background: "#F4F7FA", borderRadius: 6, fontSize: 12, color: T.ink2 }}>{t("privacyNote")}</div>
                </div>
              )}

              {tab === "saved" && (
                <div style={{ fontSize: 12.5, color: T.mute, lineHeight: 1.48 }}>
                  <SectionTitle>{t("savedCases")}</SectionTitle>
                  {!storageOK && <div style={{ fontSize: 12 }}>{t("noSaved")}</div>}
                  {storageOK && cases.length === 0 && <div style={{ fontSize: 12 }}>{t("noSaved")}</div>}
                  {storageOK && cases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between" style={{ padding: "7px 0", borderBottom: "1px solid #EEF1EC", gap: 6 }}>
                      <button type="button" onClick={() => loadCase(c.id)}
                        style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 12.5, color: T.ink, fontFamily: FB, flex: 1 }}>
                        {c.title || "—"}
                        <span style={{ display: "block", fontSize: 10.5, color: T.mute, fontFamily: FM }}>{(c.savedAt || "").slice(0, 10)}</span>
                      </button>
                      <Btn tone="warn" onClick={() => {
                        if (delAsk === c.id) { setDelAsk(null); deleteCase(c.id); }
                        else { setDelAsk(c.id); setTimeout(() => setDelAsk((v) => (v === c.id ? null : v)), 4000); }
                      }}>{delAsk === c.id ? t("delSure") : t("del")}</Btn>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: 11, background: "#F4F7FA", borderRadius: 6, fontSize: 12, color: T.ink2 }}>{t("privacyNote")}</div>
                </div>
              )}

              {tab === "detail" && selPerson && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle>{t("personRec")}</SectionTitle>
                  <Field label={t("nameF")}><input value={selPerson.name} placeholder={selPerson.tkey ? tr(TEMPLATE_NAMES[selPerson.tkey], li) : ""} onChange={(e) => updatePerson(selPerson.id, { name: e.target.value })} style={inputStyle} /></Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[["male", `□ ${t("male")}`], ["female", `○ ${t("female")}`]].map(([g, l]) => (
                      <Btn key={g} active={selPerson.gender === g} onClick={() => updatePerson(selPerson.id, { gender: g })}>{l}</Btn>
                    ))}
                  </div>
                  {selPerson.gender === "object" && (
                    <Field label={t("objKindF")}>
                      <select value={selPerson.objKind || "other"} onChange={(e) => updatePerson(selPerson.id, { objKind: e.target.value })} style={inputStyle}>
                        {Object.entries(OBJ_KINDS).map(([k, v]) => <option key={k} value={k}>{tr(v, li)}</option>)}
                      </select>
                    </Field>
                  )}
                  {/* 출생·나이·사망 — 가장 자주 쓰는 세 칸이라 이름 바로 다음에 둔다.
                      숫자 세 칸일 뿐이라 굳이 크게 그릴 필요가 없어, 다른 입력칸보다
                      한 단 작게 짠다. */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <Field label={t("birthF")}><input value={selPerson.birth} onChange={(e) => updatePerson(selPerson.id, { birth: e.target.value })} style={{ ...inputStyle, fontFamily: FM, padding: "5px 7px", fontSize: 12 }} placeholder="1958" /></Field>
                    <Field label={t("ageF")}>
                      <input
                        /* 생년월일을 모를 때를 위한 입력칸. 나이를 적으면
                           (사망연도가 있으면 그 나이로, 없으면 지금 나이로
                           풀어서) 출생연도를 거꾸로 계산해 채운다. 반대로
                           출생연도를 적으면 이 칸에는 계산된 나이가 저절로
                           나타난다 — 두 칸이 같은 값을 서로 다른 방식으로
                           보여줄 뿐이다. */
                        value={selPerson.birth ? String((selPerson.death ? +selPerson.death : YEAR) - +selPerson.birth) : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return;
                          const age = +v;
                          if (!Number.isFinite(age)) return;
                          const refYear = selPerson.death ? +selPerson.death : YEAR;
                          updatePerson(selPerson.id, { birth: String(refYear - age) });
                        }}
                        style={{ ...inputStyle, fontFamily: FM, padding: "5px 7px", fontSize: 12 }} placeholder="67" />
                    </Field>
                    <Field label={t("deathF")}><input value={selPerson.death} onChange={(e) => updatePerson(selPerson.id, { death: e.target.value, deceased: e.target.value ? true : selPerson.deceased })} style={{ ...inputStyle, fontFamily: FM, padding: "5px 7px", fontSize: 12 }} placeholder="2020" /></Field>
                  </div>
                  <div style={{ fontSize: 10.5, color: T.mute, marginTop: -4 }}>{t("ageHint")}</div>
                  <Field label={`${t("roleF")} — ${t("roleHint")}`}>
                    <input value={selPerson.role} onChange={(e) => updatePerson(selPerson.id, { role: e.target.value })} style={inputStyle} />
                  </Field>
                  {/* 본인·사망·신체질환 — 개인 메모 앞으로 */}
                  <div className="gs-person-flags grid grid-cols-2" style={{ background: "#fff", borderRadius: 10,
                    border: "1px solid rgba(22,32,42,.13)", boxShadow: "0 1px 2px rgba(22,32,42,.05)", overflow: "hidden" }}>
                    {/* 다섯 줄이 너무 길다는 요청 — 두 칸씩 접어 세 줄로 줄인다.
                        전체 설명(— 이중선 등)은 길어서 한 칸에 다 못 들어가니
                        앞부분만 보여주고, 나머지는 마우스를 올리면(title) 보인다. */}
                    <div className="gs-flagrow" style={{ padding: "8px 11px", borderRight: "1px solid rgba(22,32,42,.08)" }}>
                      <Check label={t("proband").split(" — ")[0]} title={t("proband")} checked={selPerson.proband} onChange={(v) => updatePerson(selPerson.id, { proband: v })} />
                    </div>
                    <div className="gs-flagrow" style={{ padding: "5px 11px" }}>
                      <Check label={t("deceased").split(" — ")[0]} title={t("deceased")} checked={selPerson.deceased} onChange={(v) => updatePerson(selPerson.id, { deceased: v })} />
                    </div>
                    {[["phys", t("physF"), "#6E93A8"], ["ment", t("mentF"), "#7C6EA8"], ["addi", t("addiF"), T.amber]].map(([k, lab, c], i) => (
                      <div key={k} className="gs-flagrow" style={{ padding: "5px 11px", borderTop: "1px solid rgba(22,32,42,.08)",
                        borderRight: i % 2 === 0 ? "1px solid rgba(22,32,42,.08)" : "none",
                        gridColumn: (i === 2 && selPerson[k]) ? "1 / -1" : "auto" }}>
                        <Check label={lab.split(" — ")[0]} title={lab} color={c} checked={selPerson[k]} onChange={(v) => updatePerson(selPerson.id, { [k]: v })} />
                        {selPerson[k] && (
                          <div className="flex items-center" style={{ gap: 5, marginTop: 4, paddingLeft: 22, flexWrap: "wrap" }}>
                            <input value={selPerson[k + "From"] || ""} placeholder={t("fromY")} inputMode="numeric"
                              onChange={(e) => updatePerson(selPerson.id, { [k + "From"]: e.target.value })}
                              style={{ ...inputStyle, width: 62, padding: "5px 7px", fontSize: 11.5 }} />
                            <span style={{ color: T.faint, fontSize: 11 }}>–</span>
                            <input value={selPerson[k + "To"] || ""} placeholder={t("toY")} inputMode="numeric"
                              onChange={(e) => updatePerson(selPerson.id, { [k + "To"]: e.target.value })}
                              style={{ ...inputStyle, width: 62, padding: "5px 7px", fontSize: 11.5 }} />
                            <span style={{ fontSize: 10, color: T.mute }}>{t("onLifeLine")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Field label={`${t("noteF")} — ${t("noteHint")}`}>
                    <textarea rows={4} value={selPerson.note} onChange={(e) => updatePerson(selPerson.id, { note: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                  {/* 분화·척도는 손 가는 빈도가 낮아 아래로 내린다. */}
                  {selPerson.gender !== "object" && !selPerson.preg && (
                    <>
                      <SectionTitle>{t("attrTitle")}</SectionTitle>
                      <Field label={t("diffF")}>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <input type="range" min={0} max={100} step={1}
                            value={typeof selPerson.attrs?.diff === "number" ? selPerson.attrs.diff : 50}
                            onChange={(e) => updatePerson(selPerson.id, { attrs: { ...(selPerson.attrs || {}), diff: +e.target.value } })}
                            style={{ flex: 1, accentColor: T.ink2 }} />
                          <span style={{ minWidth: 66, fontSize: 11.5, fontFamily: FM, color: T.ink2 }}>
                            {typeof selPerson.attrs?.diff === "number" ? selPerson.attrs.diff : "—"}
                          </span>
                          <Btn onClick={() => { const a = { ...(selPerson.attrs || {}) }; delete a.diff; updatePerson(selPerson.id, { attrs: a }); }}>✕</Btn>
                        </div>
                      </Field>
                      {typeof selPerson.attrs?.diff === "number" && (
                        <div style={{ fontSize: 11, color: T.ink2, fontFamily: FB, marginTop: -6 }}>
                          {tr(S.diffBands[DIFF_BAND(selPerson.attrs.diff)], li)}
                        </div>
                      )}

                      {(doc.attrLayers || []).filter((L) => scaleName(L)).map((L) => (
                        <Field key={L.id} label={scaleName(L)}>
                          {/* 자아분화와 같은 0–100 눈금을 쓴다. 척도마다
                              눈금이 다르면 옆에 나란히 붙은 칩을 비교할 수
                              없다. */}
                          <div className="flex items-center" style={{ gap: 8 }}>
                            <input type="range" min={0} max={100} step={1}
                              value={typeof selPerson.attrs?.[L.id] === "number" ? selPerson.attrs[L.id] : 50}
                              onChange={(e) => updatePerson(selPerson.id, { attrs: { ...(selPerson.attrs || {}), [L.id]: +e.target.value } })}
                              style={{ flex: 1, accentColor: T.ink2 }} />
                            <span style={{ minWidth: 66, fontSize: 11.5, fontFamily: FM, color: T.ink2 }}>
                              {typeof selPerson.attrs?.[L.id] === "number" ? selPerson.attrs[L.id] : "—"}
                            </span>
                            <Btn onClick={() => { const at = { ...(selPerson.attrs || {}) }; delete at[L.id]; updatePerson(selPerson.id, { attrs: at }); }}>✕</Btn>
                          </div>
                        </Field>
                      ))}
                    </>
                  )}
                  {/* 성적 지향은 자주 쓰는 항목이 아니라 맨 아래로 내린다. */}
                  {selPerson.gender !== "object" && (
                    <Field label={t("orientF")}>
                      <select value={selPerson.orient || "none"} onChange={(e) => updatePerson(selPerson.id, { orient: e.target.value })} style={inputStyle}>
                        {Object.entries(ORIENTATIONS).map(([k, v]) => <option key={k} value={k}>{tr(v, li)}</option>)}
                      </select>
                    </Field>
                  )}
                  {selPerson.puid && (<>
                    <div className="grid grid-cols-2" style={{ gap: 8 }}>
                      <Field label={t("linkF")}>
                        <select value={selPerson.link} onChange={(e) => updatePerson(selPerson.id, { link: e.target.value })} style={inputStyle}>
                          {Object.entries(LINK_TYPES).map(([k, v]) => <option key={k} value={k}>{tr(v, li)}</option>)}
                          {LEGACY_LINKS[selPerson.link] && <option value={selPerson.link}>{tr(LEGACY_LINKS[selPerson.link], li)}</option>}
                        </select>
                      </Field>
                      <Field label={t("pregF")}>
                        <select value={selPerson.preg || ""} onChange={(e) => updatePerson(selPerson.id, { preg: e.target.value || null })} style={inputStyle}>
                          <option value="">—</option>
                          {Object.entries(PREG).map(([k, v]) => <option key={k} value={k}>{tr(v, li)}</option>)}
                        </select>
                      </Field>
                    </div>
                    {selPerson.preg && (
                      <div style={{ fontSize: 10.5, lineHeight: 1.55, color: T.mute, fontFamily: FB,
                        padding: "7px 9px", background: "rgba(22,32,42,.035)", borderRadius: 8 }}>
                        {t("pregSexHint")}
                      </div>
                    )}
                    <Field label={t("twinF")}>
                      <select value={doc.people.find((k) => k.id !== selPerson.id && selPerson.twin && k.twin === selPerson.twin)?.id || ""}
                        onChange={(e) => {
                          const other = e.target.value;
                          if (!other) { updatePerson(selPerson.id, { twin: null, twinType: null }); return; }
                          const tid = uid();
                          setDoc((d) => ({ ...d, people: d.people.map((x) => (x.id === selPerson.id || x.id === other ? { ...x, twin: tid, twinType: "fraternal" } : x)) }));
                        }} style={inputStyle}>
                        <option value="">{selPerson.twin ? t("twinUnlink") : "—"}</option>
                        {doc.people.filter((k) => k.puid === selPerson.puid && k.id !== selPerson.id && !k.preg).map((k) => <option key={k.id} value={k.id}>{personName(k, li)}</option>)}
                      </select>
                    </Field>
                    {selPerson.twin && (
                      <div className="flex" style={{ gap: 6 }}>
                        {[["fraternal", t("fraternal")], ["identical", t("identical")]].map(([ty, l]) => (
                          <Btn key={ty} active={selPerson.twinType === ty}
                            onClick={() => setDoc((d) => ({ ...d, people: d.people.map((x) => (x.twin === selPerson.twin ? { ...x, twinType: ty } : x)) }))}>{l}</Btn>
                        ))}</div>
                    )}
                  </>)}
                  <SectionTitle>{t("lifeNote")}</SectionTitle>
                  <div style={{ fontSize: 10.5, color: T.ink2, lineHeight: 1.45, padding: "6px 9px",
                    background: "rgba(22,32,42,.035)", borderRadius: 7, marginBottom: 4 }}>{t("lifeNoteHint")}</div>
                  {(doc.events || []).filter((e) => e.personId === selPerson.id).sort((a, b) => a.year - b.year).map((e) => (
                    <div key={e.id} className="flex items-center" style={{ gap: 6, padding: "5px 8px", background: "#F4F7FA", borderRadius: 6 }}>
                      <span style={{ fontFamily: FM, fontSize: 11, color: T.gold, width: 34 }}>{e.year}</span>
                      <span style={{ flex: 1, fontSize: 12, color: T.ink2 }}>{e.title}</span>
                      <Btn tone="warn" onClick={() => setDoc((d) => ({ ...d, events: (d.events || []).filter((x) => x.id !== e.id) }))}>✕</Btn>
                    </div>
                  ))}
                  <div className="flex items-center" style={{ gap: 5 }}>
                    <input value={lnYear} placeholder={t("fromY")} inputMode="numeric" onChange={(e) => setLnYear(e.target.value)}
                      style={{ ...inputStyle, width: 68, padding: "6px 8px", fontSize: 12 }} />
                    <input data-trans="" value={lnText} placeholder={t("lifeNote")} onChange={(e) => setLnText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addLifeNote(); }}
                      style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: 12 }} />
                    <Btn onClick={addLifeNote}>{t("add")}</Btn>
                  </div>

                  <SectionTitle>{t("quickAdd")}</SectionTitle>
                  <Field label={t("childLine")}>
                    <div className="flex" style={{ gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(LINK_TYPES).map(([k, v]) => (
                        <MiniBtn key={k} active={quickLink === k} onClick={() => setQuickLink(k)}><ChildLinkPreview link={k} />{tr(v, li)}</MiniBtn>
                      ))}
                    </div>
                  </Field>
                  <Field label={tr(["Twins", "쌍둥이", "雙胞胎"], li)}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 3 }}>
                      <MiniBtn onClick={() => addTwins(selPerson, "male", false)}><TwinPreview gender="male" small />{tr(["Frat·sons","이란성·아들","異卵兒"], li)}</MiniBtn>
                      <MiniBtn onClick={() => addTwins(selPerson, "female", false)}><TwinPreview gender="female" small />{tr(["Frat·dau","이란성·딸","異卵女"], li)}</MiniBtn>
                      <MiniBtn onClick={() => addTwins(selPerson, "male", true)}><TwinPreview gender="male" identical small />{tr(["Iden·sons","일란성·아들","同卵兒"], li)}</MiniBtn>
                      <MiniBtn onClick={() => addTwins(selPerson, "female", true)}><TwinPreview gender="female" identical small />{tr(["Iden·dau","일란성·딸","同卵女"], li)}</MiniBtn>
                    </div>
                  </Field>
                  {selPerson.puid && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "8px 10px",
                      borderRadius: 9, background: "rgba(22,32,42,.035)" }}>
                      <Btn full onClick={() => tidyRow(selPerson.puid)}>{t("tidyRow")}</Btn>
                      <span style={{ fontSize: 10.5, lineHeight: 1.5, color: T.mute, fontFamily: FB }}>{t("tidyHint")}</span>
                    </div>
                  )}
                  {selPerson.fixed ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9,
                      background: "rgba(154,124,42,.07)", border: `1px solid rgba(154,124,42,.2)` }}>
                      <span style={{ flex: 1, fontSize: 11.5, fontFamily: FB, color: T.ink2 }}>{t("pinned")}</span>
                      <Btn onClick={() => setDoc((d) => ({ ...d, people: d.people.map((p) => (p.id === selPerson.id ? { ...p, fixed: 0 } : p)) }))}>
                        {t("unpin")}
                      </Btn>
                    </div>
                  ) : null}
                  {msel.length > 1 && msel.includes(selPerson.id) && (
                    <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(22,32,42,.04)" }}>
                      <div style={{ fontSize: 11.5, fontFamily: FB, fontWeight: 700, color: T.ink }}>
                        {t("mselTitle")} · {msel.length}
                      </div>
                      <div style={{ fontSize: 11, color: T.mute, fontFamily: FB, margin: "3px 0 7px" }}>{t("mselHint")}</div>
                      <Btn full onClick={() => setMsel([])}>{t("mselClear")}</Btn>
                    </div>
                  )}
                  <Btn tone="warn" full onClick={() => { removePerson(selPerson.id); setSel(null); }}>{t("delPerson")}</Btn>
                </div>
              )}

              {tab === "detail" && selUnion && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle>{t("couple")}</SectionTitle>
                  <div style={{ fontSize: 13 }}>{nameOf(selUnion.a)} — {nameOf(selUnion.b)}</div>
                  <Field label={t("coupleState")}>
                    <div className="flex" style={{ gap: 4, flexWrap: "wrap" }}>
                      {Object.keys(UNION_TYPES).map((ty) => (
                        <MiniBtn key={ty} active={selUnion.type === ty} onClick={() => setU({ type: ty })}>
                          <UnionLinePreview type={ty} w={40} color={selUnion.type === ty ? T.pine : T.ink2} />{tr(UNION_TYPES[ty].label, li)}
                        </MiniBtn>
                      ))}
                    </div>
                  </Field>
                  <div className="grid grid-cols-2" style={{ gap: 8 }}>
                    <Field label={t("mYearF")}><input value={selUnion.mYear} onChange={(e) => setU({ mYear: e.target.value })} style={{ ...inputStyle, fontFamily: FM }} /></Field>
                    <Field label={t("eYearF")}><input value={selUnion.eYear} onChange={(e) => setU({ eYear: e.target.value })} style={{ ...inputStyle, fontFamily: FM }} /></Field>
                  </div>
                  <div className="grid grid-cols-2" style={{ gap: 6 }}>
                    <Btn onClick={() => addChild(byId[selUnion.a], "male", quickLink, selUnion.id)}>{t("addSon")}</Btn>
                    <Btn onClick={() => addChild(byId[selUnion.a], "female", quickLink, selUnion.id)}>{t("addDau")}</Btn>
                  </div>
                  <Btn tone="warn" full onClick={() => { setDoc((d) => ({ ...d, unions: d.unions.filter((u) => u.id !== selUnion.id), people: d.people.map((p) => (p.puid === selUnion.id ? { ...p, puid: null } : p)) })); setSel(null); }}>{t("delUnion")}</Btn>
                </div>
              )}

              {tab === "detail" && selBond && (() => {
                const segs = sortedSegments(selBond);
                const writeSegs = (next) => setB({ segments: next });
                const updateSeg = (idx, patch) => writeSegs(segs.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
                const removeSeg = (idx) => {
                  if (segs.length > 1) { writeSegs(segs.filter((_, i) => i !== idx)); setSel({ kind: "bond", id: selBond.id, seg: null }); }
                  else { setDoc((d) => ({ ...d, bonds: d.bonds.filter((x) => x.id !== selBond.id) })); setSel(null); }
                };
                const addSeg = () => {
                  const last = segs[segs.length - 1];
                  const ns = { id: uid(), type: last?.type || "harmony", from: last?.to || "", to: "", note: "" };
                  writeSegs([...segs, ns]);
                  setSel({ kind: "bond", id: selBond.id, seg: ns.id });
                };
                return (
                  <div className="flex flex-col" style={{ gap: 12 }}>
                    <SectionTitle>{t("relType")}</SectionTitle>
                    <div style={{ fontSize: 13 }}>{nameOf(selBond.a)} <span style={{ color: bondColor(currentSegment(selBond).type) }}>→</span> {nameOf(selBond.b)}</div>
                    {(() => {
                      const same = dupGroups.find((g) => g.some((b) => b.id === selBond.id));
                      return same ? (
                        <div style={{ padding: "9px 10px", background: "#FDF7E6", border: `1px solid ${T.gold}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                          <Btn full onClick={() => mergeBonds(selBond.id)}>{t("mergeThis").replace("{n}", same.length)}</Btn>
                          <span style={{ fontSize: 11, color: T.mute, lineHeight: 1.45 }}>{t("mergeNote")}</span>
                        </div>
                      ) : null;
                    })()}

                    <Check label={tr(['Show all relationship labels','전체 관계 이름 표시','顯示全部關係名稱'],li)} checked={vis.label} onChange={v=>setVis(o=>({...o,label:v}))}/>
                    <SectionTitle>{t("relHistory")}</SectionTitle>
                    <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45 }}>{t("relHistoryHint")}</div>
                    {segs.map((sg, idx) => (
                      <div key={sg.id || idx} className="flex flex-col"
                        onPointerDown={() => setSel({ kind: "bond", id: selBond.id, seg: sg.id })}
                        style={{ gap: 6, padding: 10, background: sel?.seg === sg.id ? "#FDF7E6" : "#F4F7FA", borderRadius: 8,
                          border: sel?.seg === sg.id ? `1.5px solid ${T.gold}` : `1px solid ${T.rule}` }}>
                        <div className="flex items-center" style={{ gap: 6 }}>
                          <span style={{ fontFamily: FM, fontSize: 10.5, color: T.mute, width: 14 }}>{idx + 1}</span>
                          {kindsOf(BOND_TYPES[sg.type]) ? (
                            /* 화살표 하나로 유형과 종류를 함께 보여 준다 — 탭에서
                               이미 말한 "폭력·학대"를 여기서 또 적지 않는다. */
                            <AbuseSlotPreview type={sg.type}
                              kindLabel={sg.kind && kindsOf(BOND_TYPES[sg.type])[sg.kind] ? tr(kindsOf(BOND_TYPES[sg.type])[sg.kind], li) : ""}
                              li={li} />
                          ) : (
                            <span style={{ flex: 1, fontSize: 11.5, fontFamily: FB, fontWeight: 600, color: bondColor(sg.type) }}>
                              {tr((BOND_TYPES[sg.type] || BOND_TYPES.harmony).label, li)}
                            </span>
                          )}
                          <div style={{ flex: 1 }} />
                          {(BOND_TYPES[sg.type] || {}).arrow && segs.length > 0 && (
                            <Btn onClick={() => updateSeg(idx, { rev: !sg.rev })}>{sg.rev ? "← " : "→ "}{t("segFlipDir")}</Btn>
                          )}
                          {segs.length > 1 && <Btn tone="warn" onClick={() => removeSeg(idx)}>✕</Btn>}
                        </div>
                        {(segs.length === 1 || sel?.seg === sg.id) && (
                          <BondTypePicker value={sg.type} kind={sg.kind} li={li}
                            onChange={(ty) => {
                              /* 유형이 바뀌면 이전 종류 표시는 버린다 — 폭력의
                                 "신체"를 집중·통제에 그대로 들고 가면, 새 목록에
                                 없는 값이라 아무것도 안 고른 것처럼 보인다. */
                              const prev = kindsOf(BOND_TYPES[sg.type]), next = kindsOf(BOND_TYPES[ty]);
                              updateSeg(idx, { type: ty, kind: prev === next ? sg.kind : null });
                            }}
                            onKind={(k) => updateSeg(idx, { kind: sg.kind === k ? null : k })} />
                        )}
                        <div className="grid grid-cols-2" style={{ gap: 6 }}>
                          <input value={sg.from} onChange={(e) => updateSeg(idx, { from: e.target.value })} placeholder={t("bondFrom")} style={{ ...inputStyle, fontFamily: FM }} />
                          <input value={sg.to} onChange={(e) => updateSeg(idx, { to: e.target.value })} placeholder={t("bondTo")} style={{ ...inputStyle, fontFamily: FM }} />
                        </div>
                        <input data-trans="" value={sg.note} onChange={(e) => updateSeg(idx, { note: e.target.value })}
                          placeholder={idx === 0 ? t("bondNote") : t("segReason")} style={inputStyle} />
                        <button type="button" onClick={() => updateSeg(idx, { emphasize: !sg.emphasize })}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 2px", background: "transparent",
                            border: "none", cursor: "pointer", fontSize: 11, fontFamily: FB,
                            color: sg.emphasize ? T.gold : T.mute, fontWeight: sg.emphasize ? 700 : 500 }}>
                          <span style={{ fontSize: 12 }}>{sg.emphasize ? "★" : "☆"}</span>
                          {t("segEmphasize")}
                        </button>
                      </div>
                    ))}
                    <Btn full onClick={addSeg}>＋ {t("addSegment")}</Btn>

                    <Btn full onClick={() => setB({ a: selBond.b, b: selBond.a })}>{t("flip")}</Btn>
                    <Btn tone="warn" full onClick={() => { setDoc((d) => ({ ...d, bonds: d.bonds.filter((x) => x.id !== selBond.id) })); setSel(null); }}>{t("delBond")}</Btn>
                  </div>
                );
              })()}

              {tab === "detail" && selHH && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle>{t("hhTitle")}</SectionTitle>
                  <Field label={t("hhName")}><input value={selHH.name} onChange={(e) => setH({ name: e.target.value })} style={inputStyle} /></Field>
                  <Field label={t("hhYear")}><input value={selHH.year || ""} onChange={(e) => setH({ year: e.target.value })} style={{ ...inputStyle, fontFamily: FM }} /></Field>
                  <Field label={t("hhColor")}>
                    <div className="flex" style={{ gap: 6 }}>
                      {HH_COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setH({ color: c })}
                          style={{ width: 26, height: 26, borderRadius: 13, background: c, border: selHH.color === c ? `3px solid ${T.gold}` : "1px solid #ddd", cursor: "pointer" }} />
                      ))}
                    </div>
                  </Field>
                  <Field label={t("hhMembers")}>
                    <div className="flex" style={{ gap: 4, flexWrap: "wrap" }}>
                      {doc.people.map((p) => {
                        const on = selHH.members.includes(p.id);
                        return (
                          <button key={p.id} type="button"
                            onClick={() => setH({ members: on ? selHH.members.filter((m) => m !== p.id) : [...selHH.members, p.id] })}
                            style={{ padding: "5px 9px", borderRadius: 13, cursor: "pointer", fontSize: 11.5, fontFamily: FB,
                              background: on ? selHH.color : "#fff", color: on ? "#fff" : T.ink2,
                              border: `1px solid ${on ? selHH.color : T.rule}`, fontWeight: on ? 600 : 400 }}>{personName(p, li)}</button>
                        );
                      })}
                    </div>
                  </Field>
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45 }}>{t("hhHint")}</div>
                  <Btn tone="warn" full onClick={() => { setDoc((d) => ({ ...d, households: d.households.filter((h) => h.id !== selHH.id) })); setSel(null); }}>{t("delHH")}</Btn>
                </div>
              )}

              {tab === "detail" && selTri && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle>{t("triTitle")}</SectionTitle>
                  <div style={{ fontSize: 12.5, lineHeight: 1.48, padding: "9px 11px", background: "#F4F1F8", borderRadius: 6 }}>
                    <div>{t("triConflict")}: <b>{nameOf(selTri.ids[0])}</b> ↔ <b>{nameOf(selTri.ids[1])}</b></div>
                    <div style={{ color: TRI_COLOR }}>{t("triFlow")} → <b>{nameOf(selTri.ids[2])}</b></div>
                  </div>
                  <Btn full onClick={() => setTri({ ids: [selTri.ids[1], selTri.ids[2], selTri.ids[0]] })}>{t("triRotate")}</Btn>
                  <Field label={t("triSrc")}>
                    <div className="flex" style={{ gap: 6 }}>
                      {[0, 1].map((i) => (
                        <Btn key={i} active={(selTri.src || 0) === i} onClick={() => setTri({ src: i })}>{nameOf(selTri.ids[i])}</Btn>
                      ))}
                    </div>
                  </Field>
                  <Check label={t("triDistant")} color={TRI_COLOR} checked={selTri.showDistant !== false} onChange={(v) => setTri({ showDistant: v })} />
                  <Field label={t("triKind")}>
                    <TriKindPicker value={selTri.type} custom={selTri.typeCustom} li={li}
                      onPick={(ty) => setTri({ type: ty, typeCustom: null })}
                      onCustom={(txt) => setTri({ type: null, typeCustom: txt })} />
                  </Field>
                  <Field label={t("triCause")}>
                    <textarea rows={3} value={selTri.note || ""} onChange={(e) => setTri({ note: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.48 }}>{t("triHint")}</div>
                  <Btn tone="warn" full onClick={() => { setDoc((d) => ({ ...d, triangles: d.triangles.filter((x) => x.id !== selTri.id) })); setSel(null); }}>{t("delTri")}</Btn>
                </div>
              )}

              {tab === "story" && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle right={<Btn active={showStory} onClick={() => setShowStory((v) => !v)}>{t("storyCard")}</Btn>}>{t("storyTitle")}</SectionTitle>
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45 }}>{t("storyHint")}</div>
                  {[["problem", t("stProblem")], ["history", t("stHistory")], ["strengths", t("stStrength")], ["note", t("stNote")]].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <textarea rows={3} value={doc.story[k] || ""} onChange={(e) => setDoc((d) => ({ ...d, story: { ...d.story, [k]: e.target.value } }))} style={{ ...inputStyle, resize: "vertical" }} />
                    </Field>
                  ))}
                </div>
              )}

              {tab === "context" && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle>{t("ctxTitle")}</SectionTitle>
                  <ContextRings li={li} active={doc.context.ring} onPick={(r) => setDoc((d) => ({ ...d, context: { ...d.context, ring: r } }))} />
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45 }}>{t("ctxHint")}</div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: TRI_COLOR, marginBottom: 6 }}>{t("ctxVert")}</div>
                    {CTX_VERT.map((v, i) => (
                      <Check key={i} label={tr(v, li)} color={TRI_COLOR} checked={doc.context.vert.some((x) => tr(x, li) === tr(v, li))}
                        onChange={(on) => setDoc((d) => ({ ...d, context: { ...d.context, vert: on ? [...d.context.vert, v] : d.context.vert.filter((x) => tr(x, li) !== tr(v, li)) } }))} />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.pine, marginBottom: 6 }}>{t("ctxHoriz")}</div>
                    {CTX_HORIZ.map((v, i) => (
                      <Check key={i} label={tr(v, li)} checked={doc.context.horiz.some((x) => tr(x, li) === tr(v, li))}
                        onChange={(on) => setDoc((d) => ({ ...d, context: { ...d.context, horiz: on ? [...d.context.horiz, v] : d.context.horiz.filter((x) => tr(x, li) !== tr(v, li)) } }))} />
                    ))}
                  </div>
                  <Field label={t("ctxRead")}>
                    <textarea rows={4} value={doc.context.note} onChange={(e) => setDoc((d) => ({ ...d, context: { ...d.context, note: e.target.value } }))} style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                </div>
              )}

              {tab === "time" && (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <SectionTitle right={<Btn active={showTL} onClick={() => setShowTL((v) => !v)}>{t("timelineTog")}</Btn>}>{t("tlTitle")}</SectionTitle>
                  {/* 무엇을 어떻게 적으라는 안내(tlHint)보다 앞서, 왜 전환기를
                     기록하는지부터 짚어 둔다 — 이 문단이 없으면 전환기가
                     그저 사건 하나 적는 칸처럼 보인다. */}
                  <div style={{ padding: 11, background: T.goldSoft, borderRadius: 6, fontSize: 11.5, lineHeight: 1.5, color: T.ink2 }}>{t("transitionWhy")}</div>
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45 }}>{t("tlHint")}</div>
                  <div style={{ padding: 11, background: "#F4F1F8", borderRadius: 6, fontSize: 11.5, lineHeight: 1.48, color: T.ink2 }}>{t("tlgHint")}</div>
                  <TransitionAdder li={li} transitions={doc.transitions || []}
                    onAdd={(g) => { setDoc((d) => ({ ...d, transitions: [...(d.transitions || []), { ...g, id: uid() }] })); setShowTL(true); }}
                    onEdit={(id, patch) => setDoc((d) => ({ ...d, transitions: (d.transitions || []).map((g) => (g.id === id ? { ...g, ...patch } : g)) }))}
                    onDelete={(id) => setDoc((d) => ({ ...d, transitions: (d.transitions || []).filter((g) => g.id !== id), events: (d.events || []).map((e) => e.transitionId === id ? { ...e, transitionId: null } : e) }))} />
                  <EventAdder li={li} people={doc.people} transitions={doc.transitions || []} onAdd={(ev) => setDoc((d) => ({ ...d, events: [...d.events, { ...ev, id: uid() }] }))} />
                  <div>
                    {(doc.events || []).slice().sort((a, b2) => a.year - b2.year).map((e) => {
                      const scopeLabel = e.scope === "parents" ? t("evParents") : e.scope === "other" ? t("evOther") : e.personId ? nameOf(e.personId) : t("evFamily");
                      const group = (doc.transitions || []).find((g) => g.id === e.transitionId);
                      return <div key={e.id} className="flex items-center" style={{ gap: 8, padding: "6px 0", borderBottom: "1px solid #EEF1EC" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: (EVENT_TYPES[e.type] || EVENT_TYPES.other).color, flexShrink: 0 }} />
                        <span style={{ fontFamily: FM, fontSize: 11.5, color: T.ink2, width: 38 }}>{e.year}</span>
                        <span style={{ fontSize: 12.5, flex: 1 }}>{e.title}{e.endYear ? `–${e.endYear}` : ""}<span style={{ color: T.mute, fontSize: 10.5 }}> · {scopeLabel}{group ? ` · ◯ ${group.label}` : ""}</span></span>
                        <Btn tone="warn" onClick={() => setDoc((d) => ({ ...d, events: (d.events || []).filter((x) => x.id !== e.id) }))}>{t("del")}</Btn>
                      </div>;
                    })}
                  </div>
                </div>
              )}

              {tab === "list" && (
                <div className="flex flex-col" style={{ gap: 16 }}>
                  <div>
                    <SectionTitle>{t("people")} {doc.people.length}</SectionTitle>
                    {doc.people.map((p) => (
                      <RowBtn key={p.id} onClick={() => { setSel({ kind: "person", id: p.id }); setTab("detail"); }}>{personName(p, li)}</RowBtn>
                    ))}
                  </div>
                  <div>
                    <SectionTitle>{t("lines")} {doc.bonds.length}</SectionTitle>
                    {doc.bonds.map((bd) => (
                      <RowBtn key={bd.id} onClick={() => { setSel({ kind: "bond", id: bd.id, seg: currentSegment(bd).id }); setTab("detail"); }}>
                        {nameOf(bd.a)} → {nameOf(bd.b)} <span style={{ color: bondColor(currentSegment(bd).type) }}>{tr(BOND_TYPES[currentSegment(bd).type].label, li)}</span>
                        {sortedSegments(bd).length > 1 && <span style={{ color: T.mute, fontSize: 10.5 }}> · {sortedSegments(bd).length}{tr(["periods", "구간", "個時段"], li)}</span>}
                      </RowBtn>
                    ))}
                  </div>
                  <div>
                    <SectionTitle>{t("households")} {doc.households.length}</SectionTitle>
                    {doc.households.map((h) => (
                      <RowBtn key={h.id} onClick={() => { setSel({ kind: "household", id: h.id }); setTab("detail"); }}>
                        <span style={{ color: h.color }}>■ </span>{h.name || "—"} ({h.members.length})
                      </RowBtn>
                    ))}
                  </div>
                  <div>
                    <SectionTitle>{t("triangles")} {doc.triangles.length}</SectionTitle>
                    {doc.triangles.map((x) => (
                      <RowBtn key={x.id} onClick={() => { setSel({ kind: "triangle", id: x.id }); setTab("detail"); }}>
                        {x.ids.map(nameOf).join(" — ")} <span style={{ color: TRI_COLOR }}>{x.type ? tr(x.type, li) : x.typeCustom}</span>
                      </RowBtn>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ══ export helpers ═════════════════════════════════════════════ */
function serializeSVG(svgEl, box) {
  const clone = svgEl.cloneNode(true);
  clone.removeAttribute("style");           // CSS width/height on the live preview (100%/380px)
  clone.removeAttribute("class");           // would otherwise override the XML viewBox size once
  clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
  clone.setAttribute("width", Math.round(box.w));
  clone.setAttribute("height", Math.round(box.h));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const g = clone.querySelector("#exportRoot");
  if (g) g.setAttribute("transform", "translate(0,0) scale(1)");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", box.x); bg.setAttribute("y", box.y);
  bg.setAttribute("width", box.w); bg.setAttribute("height", box.h);
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
/* "다른 이름으로 저장" — 지원하는 브라우저(Chrome·Edge 데스크톱)에서는
   저장 위치를 직접 고르는 대화상자를 띄운다. 지원하지 않으면(Safari·
   Firefox·모바일) 평소처럼 기본 다운로드 폴더로 내려받는다. */
async function saveAs(blob, suggestedName, mimeType, extLabel) {
  if (typeof window !== "undefined" && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: extLabel, accept: { [mimeType]: ["." + suggestedName.split(".").pop()] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "picked";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // 지원은 하지만 실패한 경우 — 기본 다운로드로 대체
    }
  }
  download(blob, suggestedName);
  return "downloaded";
}
function svgToCanvas(str, w, h, scale, cb) {
  const img = new Image();
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  img.onload = () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      cb(cv);
    } catch (e) { cb(null); }
  };
  img.onerror = () => cb(null);
  img.src = "data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(str)));
}
/* minimal single-page PDF wrapping a JPEG (no external library) */
function jpegToPDF(bytes, wpx, hpx) {
  const W = +(wpx * 0.72).toFixed(2), H = +(hpx * 0.72).toFixed(2);
  const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff; return a; };
  const parts = [];
  const offsets = [];
  let len = 0;
  const push = (chunk) => { parts.push(chunk); len += chunk.length; };
  push(enc("%PDF-1.4\n"));
  const obj = (n, body, stream) => {
    offsets[n] = len;
    push(enc(`${n} 0 obj\n${body}\n`));
    if (stream) { push(enc("stream\n")); push(stream); push(enc("\nendstream\n")); }
    push(enc("endobj\n"));
  };
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`, bytes);
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>`, enc(content));
  const xref = len;
  let x = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  x += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  push(enc(x));
  const out = new Uint8Array(len);
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return new Blob([out], { type: "application/pdf" });
}

/* ══ screens ═══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   가족체계 분석기
   지식체계: S1 McGoldrick · S2 가계도의 이해 · S3 부부 및 가족사정 ·
             S4 Goldenberg (보웬) · S5 면담 질문지 · S6 The Genogram Casebook · S7 가족심리상담사 강의교안 — 14개 영역
   출력은 진단이 아니라 전문가가 함께 검토할 잠정적 가설이다.
   ══════════════════════════════════════════════════════════════════ */

/* 증거 등급 — 자료가 어디까지 말해 주는지를 구분한다 */
const GRADE = {
  observed: { label: ["Seen in the chart", "가계도에서 보이는 것", "圖中可見"], color: "#2E7D5B" },
  supported: { label: ["A possible reading", "지금 생각해 볼 수 있는 것", "目前可能的解讀"], color: "#9C7228" },
  explore: { label: ["Ask more", "더 물어볼 것", "需再詢問"], color: "#3A6E93" },
  withheld: { label: ["Hard to tell yet", "아직 알기 어려움", "尚難判斷"], color: "#7E8B95" },
};

/* 가계도에서 직접 셀 수 있는 것만 읽어 낸다. 여기서 해석하지 않는다. */
function readGenogram(doc) {
  const gen = computeGens(doc.people, doc.unions);
  const real = doc.people.filter((p) => !p.preg && p.gender !== "object");
  const byId = Object.fromEntries(doc.people.map((p) => [p.id, p]));
  const genCount = new Set(real.map((p) => gen[p.id] ?? 0)).size;

  const unionsByType = {};
  doc.unions.forEach((u) => { unionsByType[u.type] = (unionsByType[u.type] || 0) + 1; });

  /* 관계선은 가장 최근 구간의 유형으로 센다 */
  const bondCat = {}, bondsOf = {};
  let supportive = 0;   // 융합은 자원이 아니라 경계의 문제이므로 지지선에서 뺀다
  doc.bonds.forEach((b) => {
    const cur = currentSegment(b);
    const cat = (BOND_TYPES[cur.type] || BOND_TYPES.harmony).cat;
    bondCat[cat] = (bondCat[cat] || 0) + 1;
    if (cat === "connect" && !["fused", "fusedConflict"].includes(cur.type)) supportive += 1;
    [b.a, b.b].forEach((id) => { (bondsOf[id] = bondsOf[id] || []).push({ cat, type: cur.type, other: id === b.a ? b.b : b.a }); });
  });

  const cutoffs = doc.bonds.filter((b) => ["cutoff", "estranged"].includes(currentSegment(b).type));
  const fused = doc.bonds.filter((b) => ["fused", "fusedConflict"].includes(currentSegment(b).type));
  const conflict = doc.bonds.filter((b) => (BOND_TYPES[currentSegment(b).type] || {}).cat === "conflict");
  const abuse = doc.bonds.filter((b) => (BOND_TYPES[currentSegment(b).type] || {}).cat === "abuse");
  const changed = doc.bonds.filter((b) => sortedSegments(b).length > 1);

  /* 세대를 건너 되풀이되는 관계 범주 */
  const catGens = {};
  doc.bonds.forEach((b) => {
    const cat = (BOND_TYPES[currentSegment(b).type] || BOND_TYPES.harmony).cat;
    const g = Math.min(gen[b.a] ?? 0, gen[b.b] ?? 0);
    (catGens[cat] = catGens[cat] || new Set()).add(g);
  });
  const repeated = Object.entries(catGens).filter(([, gs]) => gs.size >= 2).map(([c]) => c);

  /* 사람에게 표시된 어려움이 세대를 건너 나타나는지 */
  const flagSpread = {};
  ["phys", "ment", "addi"].forEach((k) => {
    const gs = new Set(real.filter((p) => p[k]).map((p) => gen[p.id] ?? 0));
    if (gs.size >= 2) flagSpread[k] = gs.size;
  });

  /* 부모 세대를 건너 이어지는 관계선 — 세대 경계를 가로지르는 밀착의 단서 */
  const crossGen = doc.bonds.filter((b) => Math.abs((gen[b.a] ?? 0) - (gen[b.b] ?? 0)) >= 2);

  const flagged = {
    phys: real.filter((p) => p.phys), ment: real.filter((p) => p.ment), addi: real.filter((p) => p.addi),
    deceased: real.filter((p) => p.deceased || p.death), roles: real.filter((p) => p.role),
  };
  const losses = doc.events.filter((e) => e.type === "death").concat(flagged.deceased.map((p) => ({ year: +p.death || null })));
  const moves = doc.events.filter((e) => ["move", "migration"].includes(e.type));

  const missing = {
    birth: real.filter((p) => !p.birth).length,
    marriage: doc.unions.filter((u) => !u.mYear).length,
    noBond: real.filter((p) => !(bondsOf[p.id] || []).length).length,
    household: doc.households.length === 0,
    events: doc.events.length === 0,
  };

  /* ── 관계의 시간에 따른 변화 — 마지막 구간이 아니라 전체 이력을 읽는다 ──
     각 범주에 대략적인 '건강도'를 매겨, 구간이 바뀔 때 그 방향이 나빠졌는지
     좋아졌는지를 계산한다. 정확한 임상 척도가 아니라 방향을 보기 위한
     상대적 순서일 뿐이다. */
  const VALENCE = { connect: 2, control: 0, conflict: -1, distance: -1.5, abuse: -2.5 };
  const yearsOfEvents = {};
  (doc.events || []).forEach((e) => { if (e.year) (yearsOfEvents[e.year] = yearsOfEvents[e.year] || []).push(e); });

  const history = doc.bonds.map((b) => {
    const segs = sortedSegments(b);
    const withCat = segs.map((sg) => ({ ...sg, cat: (BOND_TYPES[sg.type] || BOND_TYPES.harmony).cat }));
    const transitions = [];
    for (let i = 1; i < withCat.length; i++) {
      const prev = withCat[i - 1], cur = withCat[i];
      const dv = (VALENCE[cur.cat] ?? 0) - (VALENCE[prev.cat] ?? 0);
      const year = cur.from ? +cur.from : null;
      transitions.push({
        fromType: prev.type, toType: cur.type, year,
        dir: dv > 0 ? "improve" : dv < 0 ? "worsen" : "flat",
        coincidesWithEvent: year ? !!yearsOfEvents[year] : false,
      });
    }
    const worsenCount = transitions.filter((t) => t.dir === "worsen").length;
    const improveCount = transitions.filter((t) => t.dir === "improve").length;
    return {
      bondId: b.id, a: b.a, b: b.b, segs: withCat, transitions,
      changeCount: transitions.length,
      netDirection: improveCount && !worsenCount ? "improved" : worsenCount && !improveCount ? "worsened"
        : worsenCount && improveCount ? "mixed" : "stable",
      cycles: worsenCount >= 1 && improveCount >= 1,   // 악화와 회복이 함께 있으면 반복으로 본다
      firstType: withCat[0]?.type, lastType: withCat[withCat.length - 1]?.type,
    };
  });

  /* 여러 관계에서 같은 순서(예: 연결→갈등→단절)가 되풀이되는지 */
  const seqKey = (h) => h.segs.map((sg) => sg.cat).join(">");
  const seqCount = {};
  history.filter((h) => h.changeCount > 0).forEach((h) => { const k = seqKey(h); seqCount[k] = (seqCount[k] || 0) + 1; });
  const repeatedSequences = Object.entries(seqCount).filter(([k, n]) => n >= 2 && k.includes(">")).map(([k]) => k);

  return { gen, real, byId, genCount, unionsByType, bondCat, supportive, bondsOf, cutoffs, fused, conflict, abuse, flagSpread,
    changed, repeated, crossGen, flagged, losses, moves, missing, history, repeatedSequences,
    triangles: doc.triangles, households: doc.households, events: doc.events, transitions: doc.transitions || [] };
}

/* ══════════════════════════════════════════════════════════════════
   14개 분석 영역과 그 아래의 개별 규칙.

   각 규칙은 정확히 하나의 조건(when)과 그 결과 문장(text)을 선언한다.
   이렇게 나누어 둔 이유는 감사 가능성 때문이다 — 이제 다음을 확인할 수
   있다: 규칙이 실제로 몇 개인지, 어느 규칙이 어느 분석자료에 근거하는지,
   보고서의 특정 문장이 어느 규칙에서 나왔는지(예: D03-R18 · S1), 규칙이
   수정되거나 빠졌는지, 같은 규칙이 중복되지 않는지.

   ternary(양자택일) 조건은 서로 다른 두 규칙으로 나누어 각각 독립적으로
   세었다 — 예전에는 f.push() 한 번으로 두 가지 문장 중 하나를 골랐지만,
   이는 실제로 서로 다른 조건에 서로 다른 결론을 내리는 두 개의 규칙이다.
   ══════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   가계도를 보며 함께 생각해 볼 질문 — 상담가가 새로 정리해 준 16개
   질문. 영역별 규칙보다 앞서, 가계도 전체를 처음 눈에 담을 때 던지는
   질문들이라 도메인 목록 위에 따로 둔다. 방금 들어온 내용이라
   파란 표시로 구분해 둔다(요청하면 표시를 지운다). */
/* 이번에 문구를 다듬은 영역 — 다르게 볼 수도 있습니다/질문 글을
   파란색으로 표시해 방금 바뀐 곳을 눈에 띄게 한다. */
/* ══════════════════════════════════════════════════════════════════
   설명 박스는 상담 중에 손 가는 대로 붙이는 메모라, 형식을 갖춘
   규칙(RULES)으로는 못 담아낸다. 대신 분석 화면과 보고서 한쪽에
   사람·관계선별로 모아 두어, 44개 규칙을 읽는 동안 옆에 놓고 볼
   원자료로 쓴다 — 규칙이 낸 결론이 아니라, 상담가가 직접 판단할
   재료로 남긴다. */
function noteAnchorLabel(n, doc, li) {
  const a = n.anchor;
  if (!a) return tr(["Unattached", "위치 메모", "未附加"], li);
  if (a.kind === "person") {
    const p = doc.people.find((x) => x.id === a.id);
    return p ? personName(p, li) : tr(["Unattached", "위치 메모", "未附加"], li);
  }
  if (a.kind === "bond") {
    const bd = doc.bonds.find((x) => x.id === a.id);
    if (bd) {
      const pa = doc.people.find((x) => x.id === bd.a), pb = doc.people.find((x) => x.id === bd.b);
      const seg = sortedSegments(bd).find((sg) => sg.id === a.seg);
      const kind = seg ? tr(BOND_TYPES[seg.type]?.label || [], li) : "";
      return `${personName(pa, li)} · ${personName(pb, li)}${kind ? ` (${kind})` : ""}`;
    }
  }
  if (a.kind === "union") {
    const u = doc.unions.find((x) => x.id === a.id);
    if (u) return `${personName(doc.people.find((x) => x.id === u.a), li)} · ${personName(doc.people.find((x) => x.id === u.b), li)}`;
  }
  return tr(["Unattached", "위치 메모", "未附加"], li);
}
function collectedNotes(doc, li) {
  return (doc.notes || []).filter((n) => (n.text || "").trim())
    .map((n) => {
      /* 연결이 여럿이면 대상을 모두 적는다 — 한 사건이 누구누구에게
         걸려 있는지가 분석에서 중요한 정보다. */
      const list = noteAnchorList(n);
      const label = list.length
        ? [...new Set(list.map((a) => noteAnchorLabel({ anchor: a }, doc, li)))].join(" · ")
        : tr(["Unattached", "위치 메모", "未附加"], li);
      return { id: n.id, label, text: n.text.trim() };
    });
}

const REVISED_DOMAINS = new Set(["D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14"]);

const OVERVIEW_QS = [
  { q: ["What relationship or event repeats across three generations?", "3대에 걸쳐 되풀이되는 관계나 사건은 무엇입니까?", "什麼樣的關係或事件在三代之間反覆出現？"], src: "S1" },
  { q: ["When the family grows anxious, who carries most of that anxiety — and between whom are they caught?", "가족이 불안해지면 누가 그 불안을 가장 많이 떠안습니까? 그 사람은 누구와 누구 사이에 끼어 있습니까?", "當家庭焦慮升高時，誰承受最多？這個人夾在誰與誰之間？"], src: "S1·S4" },
  { q: ["Is there a relationship where contact has stopped? What happened before it stopped?", "연락이나 왕래가 끊긴 사이가 있습니까? 끊기기 전에는 무슨 일이 있었습니까?", "是否有中斷聯繫的關係？中斷前發生了什麼？"], src: "S1·S4" },
  { q: ["What was happening in the family around when the symptom first appeared?", "증상이 처음 나타날 무렵 가족에게 어떤 일이 있었습니까?", "症狀初次出現時，家中發生了什麼？"], src: "S1·S2" },
  { q: ["What has this family done well? Who do they turn to when things are hard?", "이 가족은 무엇을 잘해 왔습니까? 힘들 때 누구를 찾습니까?", "這個家庭擅長什麼？遇到困難時會找誰？"], src: "S2·S3" },
  { q: ["In a triangle, if one person steps out, how do the remaining two change?", "삼각관계에서 한 사람이 빠지면 남은 두 사람은 어떻게 달라집니까?", "三角關係中，若一人退出，剩下兩人會如何改變？"], src: "S2·S4" },
  { q: ["When did the problem begin? How often does it happen, and when does it worsen or ease?", "문제는 언제 시작했습니까? 얼마나 자주 일어나며, 언제 심해지고 언제 잦아듭니까?", "問題何時開始？多常發生？何時加劇、何時緩解？"], src: "S3" },
  { q: ["What has the family already tried? What changed when they tried it?", "가족은 지금까지 어떤 방법을 써 봤습니까? 그때 무엇이 달라졌습니까?", "家庭已嘗試過什麼方法？當時有何改變？"], src: "S3" },
  { q: ["Who most wants things to change right now? Who finds it hardest to move?", "지금 달라지기를 가장 바라는 사람은 누구입니까? 거꾸로 가장 움직이기 어려워하는 사람은 누구입니까?", "現在最希望改變的人是誰？最難以行動的人又是誰？"], src: "S3" },
  { q: ["Who is closest to whom? Who feels most alone within the family?", "누가 누구와 가장 가깝습니까? 가족 안에서 혼자 떨어져 있다고 느끼는 사람은 누구입니까?", "誰與誰最親近？在家庭中誰感覺最孤立？"], src: "S3" },
  { q: ["When the family disagrees, whose decision settles it?", "가족의 뜻이 갈리면 누가 마지막으로 결정합니까?", "家庭意見分歧時，最終由誰的決定拍板？"], src: "S3" },
  { q: ["Which rules does this family still keep? Which of those could now be changed?", "이 가족이 지금도 지키는 규칙은 무엇입니까? 그중 이제는 바꿔도 될 규칙은 무엇입니까?", "這個家庭至今仍遵守什麼規則？其中有哪些如今可以改變？"], src: "S3" },
  { q: ["What is hard to bring up in this family? Who knows, and who doesn't?", "가족 안에서 꺼내기 어려운 이야기는 무엇입니까? 누가 알고 있고 누가 모르고 있습니까?", "在這個家庭中，什麼難以啟齒？誰知道、誰不知道？"], src: "S3" },
  { q: ["How close does this family stay? Even when close, does each person voice their own thoughts and make their own choices?", "가족은 서로 얼마나 가깝게 지냅니까? 가까운 사이에서도 저마다 자기 생각을 말하고 자기 선택을 합니까?", "這個家庭有多親近？即使親近，每個人是否仍表達自己的想法、做自己的選擇？"], src: "S4" },
  { q: ["Which child receives the most worry or expectation from the parents?", "부모는 어느 자녀에게 걱정이나 기대를 가장 많이 쏟습니까?", "父母對哪個孩子傾注最多擔憂或期待？"], src: "S4" },
  { q: ["What expectations does being the eldest, second, or youngest create between siblings?", "첫째·둘째·막내라는 자리는 서로에게 어떤 기대를 걸게 합니까?", "身為老大、老二或么子的位置，讓手足之間產生了什麼期待？"], src: "S4" },
];

const DOMAINS = [
  { id: "D01", title: ["Family structure and composition", "가족 구조와 구성", "家庭結構與組成"],
    alts: [["A particular family form is not in itself healthy or unhealthy.", "가족의 모습만 보고 건강한 가족인지, 문제가 있는 가족인지 판단하지 않습니다.", "特定家庭形式本身無所謂健康或失功能。"]],
    qs: [
      ["Who lives under one roof now, and who did five years ago?", "지금 한 지붕 아래 사는 사람은 누구이고, 5년 전에는 누구였습니까?", "現在誰同住一個屋簷下？五年前又是誰？"],
      ["Which relatives are missing from this chart, and why?", "이 가계도에서 빠진 친족은 누구이며, 왜 빠졌습니까?", "此圖中缺少哪些親屬？為何缺少？"],
    ] },
  { id: "D02", title: ["Family subsystems", "가족 하위체계", "家庭次系統"],
    alts: [["Grandparent caregiving is expected in many cultures and is not by itself a boundary problem.", "여러 문화에서는 조부모가 손자녀를 함께 양육합니다. 조부모가 양육에 많이 참여한다고 해서 그것만으로 가족의 울타리가 흔들린다고 보기는 어렵습니다.", "祖父母參與照顧在許多文化中屬常態，本身並非界線問題。"]],
    qs: [
      ["Who actually raised each child day to day?", "자녀를 날마다 주로 돌본 사람은 누구였습니까?", "每個孩子日常實際由誰撫養？"],
      ["When the couple disagrees, who else joins the conversation?", "부부의 뜻이 갈릴 때 그 대화에 들어오는 사람은 누구입니까?", "夫妻意見不合時，還有誰加入這場對話？"],
      ["What roles do family members play — scapegoat, hero, lost child?", "가족 안에서 누군가가 늘 문제를 떠안거나, 해결을 도맡거나, 눈에 띄지 않게 물러나 있지는 않았습니까? 희생양·영웅·잃어버린 아이 같은 자리가 있었습니까?", "家庭成員扮演什麼角色 — 代罪羔羊、英雄、迷失的孩子？"],
    ] },
  { id: "D03", title: ["Boundaries and differentiation of self", "경계와 자아분화", "界線與自我分化"],
    alts: [["Physical distance, migration or work may explain infrequent contact without emotional cut-off.", "멀리 떨어져 살거나, 옮겨 갔거나, 일에 매여 자주 만나지 못할 수도 있습니다. 만남이 뜸하다고 마음까지 멀어졌다고 보기는 어렵습니다.", "距離、遷徙或工作可能造成少有往來，未必等同情緒截斷。"]],
    qs: [
      ["Who in this family can say no without fearing the consequence?", "이 가족에서 상대의 반응을 지나치게 겁내지 않고 자기 생각을 말하거나 \"아니요\"라고 할 수 있는 사람은 누구입니까?", "這個家庭中，誰能不畏後果地說不？"],
      ["When did contact stop, and what happened in the months before it?", "연락이나 왕래가 끊긴 사이가 있다면 언제 끊겼습니까? 그 몇 달 앞서 무슨 일이 있었습니까?", "往來何時中斷？中斷前幾個月發生了什麼？"],
      ["As a child, did comfort come with warmth and consistency, or with distance?", "어릴 때 힘들거나 속상하면 부모는 어떻게 위로했습니까? 따뜻하고 꾸준히 다가왔습니까, 아니면 거리를 두는 편이었습니까?", "童年時的安慰是帶著溫暖與一致，還是帶著疏離？"],
    ] },
  { id: "D04", title: ["Hierarchy, power and role responsibility", "위계와 권력, 역할과 책임", "階層、權力與角色責任"],
    alts: [["Eldest children carrying responsibility is normative in many families and may be a strength.", "많은 가족에서 맏이가 책임을 맡습니다. 그 책임감이 가족에게 힘이 되기도 합니다.", "長子女承擔責任在許多家庭屬常態，也可能是優勢。"]],
    qs: [
      ["Whose decision settles a matter in this family?", "이 가족에서 누구의 결정이 일을 매듭짓습니까?", "在這個家庭中，誰的決定能定案？"],
      ["Which responsibilities did someone take on before they were ready?", "누가 준비되기 전에 떠맡은 책임은 무엇입니까?", "誰在尚未準備好時便承擔了哪些責任？"],
      ["How would you describe the parenting style you grew up with?", "어릴 때 부모는 집안의 규칙을 어떻게 정했습니까?", "如何描述你成長過程中經歷的教養方式？"],
      ["How much was a child's voice heard in big family decisions?", "큰일을 결정할 때 자녀의 뜻은 얼마나 들었습니까?", "做重大決定時，孩子的意見被聽取的程度有多少？"],
    ] },
  { id: "D05", title: ["Alliances and coalitions", "동맹과 연합", "結盟與聯盟"],
    alts: [["Taking someone's side once is not a coalition. Repetition over time is what distinguishes it.", "한 번 누군가의 편을 들었다고 해서 늘 한편은 아닙니다. 같은 편에 서는 일이 여러 다툼에서 되풀이되는지 살펴야 합니다.", "偶爾偏袒不構成聯盟；隨時間反覆出現才是判準。"]],
    qs: [
      ["When a disagreement starts, who reliably sides with whom?", "다툼이 벌어지면 주로 누가 누구 편에 섭니까?", "爭執開始時，誰總是站在誰那一邊？"],
      ["Is there a pairing that formed against someone else?", "누군가에게 맞서면서 서로 더 가까워진 두 사람이 있습니까?", "是否存在為對抗某人而形成的組合？"],
    ] },
  { id: "D06", title: ["Triangles", "삼각관계", "三角關係"],
    alts: [["Three people in a relationship do not make a triangle. One instance of siding is not enough.", "세 사람이 가깝다고 해서 모두 삼각관계는 아닙니다. 두 사람 사이에 긴장이 생길 때마다 제삼자가 되풀이해 끼어드는지, 또는 한 사람이 두 사람 사이의 긴장을 대신 떠안는지 살펴야 합니다.", "三人有關係並不等於三角關係；單次偏袒亦不足。"]],
    qs: [
      ["If the third person did not step in, what would happen between the other two?", "제삼자가 끼어들지 않으면 남은 두 사람은 어떻게 달라집니까?", "若第三者不介入，另兩人之間會如何？"],
      ["How often has this pattern repeated, and since when?", "이런 일이 얼마나 자주 일어나며 언제부터 되풀이되었습니까?", "此模式多久重複一次？從何時開始？"],
      ["Does anyone rely on you — or someone else — as a messenger between two others?", "두 사람이 직접 말하지 않고 당신이나 다른 사람에게 대신 전해 달라고 하는 일이 있습니까?", "是否有人依賴你或他人在另兩人之間傳話？"],
    ] },
  { id: "D07", title: ["Anxiety, emotional regulation and homeostasis", "정서 조절과 불안의 흐름, 가족 항상성", "焦慮流動、情緒調節與家庭恆定"],
    alts: [["A symptom may have its own course, independent of family tension.", "가족이 긴장하지 않을 때도 증상은 나옵니다. 증상이 언제 심해지고 언제 잦아드는지도 따로 살펴야 합니다.", "症狀可能有其自身病程，與家庭張力無關。"]],
    qs: [
      ["What does this family do to settle things down when tension rises?", "긴장이 높아질 때 이 가족은 무엇을 하면서 다시 안정을 찾습니까?", "張力升高時，這個家庭做什麼讓事情平息？"],
      ["Who notices the tension first, and who notices last?", "가족 안의 긴장을 가장 먼저 알아채는 사람은 누구입니까? 가장 늦게 알아채는 사람은 누구입니까?", "誰最先察覺張力？誰最後察覺？"],
    ] },
  { id: "D08", title: ["Balance of family functioning", "가족 기능과 역기능의 균형", "家庭功能與失功能的平衡"],
    alts: [["Functioning varies by domain: a family may cope well with work and poorly with conflict.", "가족은 위기에는 잘 뭉치면서도 다툼은 잘 풀지 못할 수 있습니다. 잘하는 일과 힘겨워하는 일은 서로 다르니 따로 살펴야 합니다.", "功能因領域而異：家庭可能善於應對工作，卻拙於處理衝突。"]],
    qs: [
      ["What does this family do well that has kept it going?", "이 가족은 무엇을 잘합니까? 힘든 고비를 어떻게 넘겨 왔습니까?", "這個家庭做得好、支撐至今的是什麼？"],
      ["Which difficulty would the family name first, and would everyone name the same one?", "가족은 무엇을 가장 힘들어합니까? 식구들이 다 같은 문제를 꼽습니까?", "家庭會先提出哪個困難？每個人會提同一個嗎？"],
    ] },
  { id: "D09", title: ["Multigenerational transmission and repeating patterns", "세대 간 전이와 반복 패턴", "多世代傳遞與重複模式"],
    alts: [["A repeated pattern is not an inheritance. Ask what each generation was facing at the time.", "비슷한 일이 여러 대에서 거듭됐다고 해서 윗대에서 그대로 물려받았다고 단정할 수는 없습니다. 각 세대가 그때 무엇을 겪고 있었는지도 함께 물어야 합니다.", "重複的模式並不等於遺傳。請詢問每一代當時面對的處境。"]],
    qs: [
      ["Which family story gets retold, and what lesson is attached to it?", "가족 안에서 되풀이해 전해지는 이야기는 무엇입니까? 그 이야기에는 어떤 교훈이 붙어 있습니까?", "哪個家族故事被反覆述說？其中附帶什麼教訓？"],
      ["Who was said to be 'just like' someone from an earlier generation?", "윗대의 누구와 \"꼭 닮았다\"는 말을 듣는 사람이 있습니까? 무엇이 닮았다고 합니까?", "誰被說「和上一代某人一模一樣」？"],
      ["What belief or story about this family gets passed down as a kind of myth?", "\"우리 집안 사람은 원래 이렇다\" 하고 오래 전해 온 믿음이나 이야기가 있습니까?", "關於這個家庭，有什麼被當作神話般流傳的信念或故事？"],
    ] },
  { id: "D10", title: ["Life cycle, critical events and timing", "생애주기와 중대한 사건의 시기", "生命週期、重大事件與時間"],
    alts: [["Two events in the same year may be unrelated. Coincidence in time invites a question, not a conclusion.", "두 일이 같은 해에 일어났다고 해서 반드시 맞물려 있지는 않습니다. 시기가 겹친다면 두 일이 서로 상관이 있었는지 가족에게 먼저 물어보십시오.", "同年的兩個事件可能無關。時間巧合引出提問，而非結論。"]],
    qs: [
      ["What else was happening in the family the year the problem began?", "문제나 증상이 처음 나타난 무렵 가족에게 또 무슨 일이 있었습니까?", "問題開始那年，家中還發生了什麼？"],
      ["Which transition is this family in the middle of right now?", "이 가족은 지금 어떤 고비를 지나고 있습니까?", "這個家庭目前正處於哪一個轉換期？"],
      ["Has any family member lived through trauma, and did its effect reach the next generation?", "가족 가운데 큰 충격이나 상처를 겪은 사람이 있습니까? 그 일을 겪은 뒤 가족 사이나 아랫대에서 달라진 점이 있었습니까?", "是否有家人經歷過創傷？其影響是否延續到下一代？"],
    ] },
  { id: "D11", title: ["Communication and emotional climate", "의사소통과 가족의 정서적 분위기", "溝通與家庭情緒氛圍"],
    alts: [["Quietness in session may be caution with the counsellor rather than the family's usual manner.", "상담실에서 말을 아낀다고 해서 집에서도 늘 조용하지는 않습니다. 상담자가 낯설거나 자리가 조심스러워 평소보다 말수를 줄였을 수도 있습니다.", "會談中的沉默可能是對諮商師的謹慎，而非家庭平時的樣貌。"]],
    qs: [
      ["Do family members speak to each other directly, or through a third person?", "가족은 서로에게 직접 말합니까? 아니면 다른 사람에게 대신 전해 달라고 합니까?", "家庭成員彼此直接對話，或透過第三人？"],
      ["What is not allowed to be said out loud in this family?", "이 가족에서 입 밖에 내기 어려운 이야기는 무엇입니까?", "在這個家庭中，什麼是不能說出口的？"],
      ["How do family members speak to one another when upset or angry?", "불편하거나 화가 날 때 식구들은 서로 어떻게 말합니까?", "感到不快或生氣時，家人之間如何說話？"],
    ] },
  { id: "D12", title: ["Cultural, social and historical context", "문화·사회·역사적 맥락", "文化、社會與歷史脈絡"],
    alts: [["What looks like enmeshment in one culture may be ordinary obligation in another.", "어떤 문화에서는 지나치게 가까워 보이는 관계도 자연스러운 가족의 도리일 수 있습니다.", "在某文化中看似糾結者，在另一文化中可能只是尋常的本分。"]],
    qs: [
      ["What did this family's generation live through that mine did not?", "이 가족의 윗세대가 겪은, 지금 세대는 겪지 않은 일은 무엇입니까?", "這個家庭的上一代經歷了什麼，是這一代未曾經歷的？"],
      ["Which expectations in this family come from faith, region or generation rather than from the people in it?", "이 가족이 당연하게 여기는 규칙 가운데 신앙·고장·문화·세대에서 온 것은 무엇입니까?", "家中哪些期待來自信仰、地域或世代，而非家人本身？"],
      ["Where has this family lived across generations, and when and why did it move?", "이 가족은 대마다 어디에서 살아왔습니까? 옮겨 갔다면 언제, 왜 옮겼습니까?", "這個家庭世代居住於何處？若曾遷徙，何時、為何遷徙？"],
      ["How has the family's economic situation changed across generations?", "가족의 살림 형편은 대마다 어떻게 달라졌습니까?", "這個家庭的經濟狀況隨世代如何變化？"],
    ] },
  { id: "D13", title: ["Strengths, resilience and resources", "강점과 회복력, 자원", "優勢、復原力與資源"],
    alts: [],
    qs: [
      ["What has this family already survived together?", "이 가족이 지금까지 함께 견뎌 낸 일은 무엇입니까?", "這個家庭已經一起挺過什麼？"],
      ["Who outside the family can be counted on?", "힘든 일이 생기면 가족 밖에서 누구에게 도움을 청합니까?", "家庭之外，有誰是可以依靠的？"],
      ["Was there a family member once admired and wished to be like?", "가족 가운데 닮고 싶었던 사람은 누구입니까? 그 사람에게서 무엇을 배우고 싶었습니까?", "是否曾有敬佩並想效仿的家庭成員？"],
    ] },
  { id: "D14", title: ["Information quality, interviewing and interpretive ethics", "정보의 품질과 면담·해석 윤리", "資訊品質、訪談與詮釋倫理"],
    alts: [["A genogram records one person's account. Another family member would draw it differently.", "한 사람이 들려준 이야기를 바탕으로 그린 가계도라면 다른 식구는 같은 일을 달리 기억하고 달리 풀어놓을 수 있습니다. 한 사람의 이야기를 가족 전체의 하나뿐인 사실로 받아들이지 마십시오.", "家系圖記錄的是一個人的敘述。另一位家人會畫得不同。"]],
    qs: [
      ["Whose account is this chart based on?", "이 가계도는 주로 누구의 이야기를 바탕으로 그렸습니까?", "此圖依據誰的敘述？"],
      ["Which part of this would another family member tell differently?", "다른 식구가 이 가계도를 본다면 어느 대목을 달리 말하겠습니까?", "其中哪一部分，另一位家人會有不同說法？"],
      ["Which parts did you confirm directly, and which are secondhand?", "직접 확인한 사실과 남에게 전해 들은 이야기는 각각 무엇입니까?", "哪些是直接查證的事實？哪些是轉述聽來的？"],
    ] },
];

/* ══════════════════════════════════════════════════════════════════
   문화 렌즈 — 한국·태국·캄보디아
   규칙이 읽어 낸 것을 지우지 않는다. 그 위에 "이 문화에서는 이것이
   규범인가, 아니면 이 가족만의 일인가"를 되묻는 층을 얹는다.
   여기 적힌 것은 일반적 경향이며, 눈앞의 가족을 설명하지 않는다.
   ══════════════════════════════════════════════════════════════════ */
const CULTURES = [
  {
    id: "kr", label: ["Korea", "한국", "韓國"],
    summary: [
      "Patrilineal record-keeping, Confucian filial duty, and a compressed history of war, industrialisation and financial crisis.",
      "부계 중심의 기록 관습, 유교적 효, 그리고 전쟁·산업화·외환위기가 한 세대 안에 압축된 역사.",
      "父系記錄傳統、儒家孝道，以及戰爭、工業化與金融危機壓縮於一代之內的歷史。"],
    lens: {
      D01: ["The maternal side is often thinner on the chart than the paternal side — a recording habit, not an absence of relationship.",
            "외가 쪽이 친가 쪽보다 얇게 그려지는 일이 많습니다. 관계가 없어서가 아니라 기록하는 습관이 그렇습니다. 외가를 따로 물어보십시오.",
            "母系一側常較父系單薄——這是記錄習慣，而非關係缺席。"],
      D02: ["Grandparent caregiving while both parents work is a standard arrangement, not a boundary failure.",
            "맞벌이 가정에서 조부모가 손주를 기르는 것은 표준적인 방식입니다. 경계가 무너졌다고 바로 읽지 않습니다.",
            "雙薪家庭由祖父母照顧孫輩屬常態安排，並非界線失敗。"],
      D03: ["Living with parents until marriage is normative. Read differentiation by emotional autonomy, not by address.",
            "결혼 전까지 부모와 함께 사는 것은 규범입니다. 분화는 주소가 아니라 정서적 자율성으로 읽습니다.",
            "婚前與父母同住屬常態。分化應以情緒自主判讀，而非居住地址。"],
      D04: ["Ancestral rites and parent support have traditionally fallen to the eldest son; age hierarchy is built into the language itself.",
            "제사와 부모 부양이 전통적으로 장남에게 몰립니다. 나이 위계는 말씨에까지 새겨져 있어 권력 구조가 언어로 드러납니다.",
            "祭祀與奉養傳統上落於長子；年齡階層甚至內建於語言之中。"],
      D06: ["The mother-in-law / son / wife triangle is the most frequently reported configuration.",
            "고부갈등 — 어머니와 아내 사이에 아들이 놓이는 삼각관계가 가장 자주 보고됩니다.",
            "婆媳之間夾著兒子的三角關係，是最常被報告的組態。"],
      D09: ["The Korean War and its separations, rural-to-urban migration, and the 1997 financial crisis are the usual carriers of transmission.",
            "한국전쟁과 이산, 산업화기의 이농, 1997년 외환위기가 세대 전이를 실어 나르는 통로입니다. 조부모의 피란과 아버지의 실직이 같은 줄에 놓입니다.",
            "韓戰與離散、工業化時期的離農、1997年金融危機，是世代傳遞的主要載體。"],
      D10: ["College entrance exams, military service and first employment are the normative pressure points of the life cycle.",
            "입시·군복무·첫 취업이 생애주기의 규범적 압력점입니다. 증상은 흔히 이 시기에 맞물려 터집니다.",
            "升學考試、兵役與初次就業，是生命週期的規範性壓力點。"],
      D11: ["Meaning is carried by reading the room and by silence more than by statement; 정 and 한 name bonds and grief that go unspoken.",
            "말보다 눈치와 침묵이 뜻을 실어 나릅니다. 정(情)과 한(恨)은 말해지지 않은 유대와 슬픔에 붙은 이름입니다.",
            "意義多由察言觀色與沉默承載，而非明言；「情」與「恨」命名了未說出口的連結與哀傷。"],
      D12: ["Confucian duty, Christianity and Buddhism coexist in one family, often across generations.",
            "유교적 의무와 기독교·불교가 한 가족 안에, 흔히 세대별로 갈려 공존합니다.",
            "儒家義務與基督教、佛教常在同一家庭中並存，且多沿世代分化。"],
      D13: ["Church, alumni ties and mutual-aid circles are strong non-kin resources.",
            "교회·동창·계 같은 비친족 연결망이 강한 자원입니다.",
            "教會、同窗與互助會是強韌的非親屬資源。"],
    },
    qs: [
      ["What did your family lose, or leave behind, in the war or in moving to the city?",
       "전쟁 때나 도시로 나오면서 이 집안이 잃은 것, 두고 온 것은 무엇입니까?",
       "戰爭中或遷入城市時，這個家失去了什麼、留下了什麼？"],
      ["Who carries the ancestral rites and the care of the parents, and was that ever discussed?",
       "제사와 부모 부양은 누가 맡고 있으며, 그 일을 의논해 본 적이 있습니까?",
       "祭祀與奉養由誰承擔？此事曾被討論過嗎？"],
      ["What do you know about your mother's side of the family?",
       "외가에 대해서는 무엇을 알고 계십니까?",
       "關於母親一側的家族，您了解多少？"],
    ],
  },
  {
    id: "th", label: ["Thailand", "태국", "泰國"],
    summary: [
      "Bilateral kinship, labour migration that separates parents from children, and norms of deference and conflict avoidance.",
      "양계 친족, 부모와 자녀를 갈라놓는 노동 이주, 그리고 배려와 갈등 회피의 규범.",
      "雙系親屬、使親子分離的勞動遷移，以及體恤與迴避衝突的規範。"],
    lens: {
      D01: ["Kinship runs through both sides; in the North and Isan the youngest daughter often inherits the parental house and the duty of care. Marriages and separations are frequently unregistered, so legal records and actual households diverge.",
            "친족은 양쪽으로 이어집니다. 북부와 이산에서는 막내딸이 부모 집과 부양 책임을 잇는 일이 흔합니다. 혼인·별거가 등록되지 않는 경우가 많아 법적 기록과 실제 가구가 어긋납니다.",
            "親屬雙系並行；北部與依善地區常由么女繼承父母房舍與照顧責任。婚姻與分居多未登記，法律記錄與實際家戶常有落差。"],
      D02: ["Skip-generation households — grandparents raising children while parents work in Bangkok or abroad — are common and often the family's best available arrangement.",
            "부모는 방콕이나 해외에서 일하고 조부모가 아이를 기르는 '조손 가구'가 흔합니다. 대개 그 가족이 택할 수 있는 최선의 방식입니다.",
            "隔代家戶——父母在曼谷或海外工作、由祖父母撫養——十分普遍，往往是該家庭最好的可行安排。"],
      D03: ["Closeness to parents is framed by bunkhun, a lifelong debt of gratitude; it is not automatically fusion.",
            "부모와의 밀착은 분쿤(บุญคุณ), 곧 평생 갚는 은혜의 빚이라는 틀 안에 있습니다. 곧바로 융합으로 읽지 않습니다.",
            "與父母的親近由「bunkhun」（終生報恩之義）所框定，不應逕自讀為融合。"],
      D04: ["Kreng jai — reluctance to impose — suppresses direct requests, so power can look softer on the chart than it is.",
            "크렝짜이(เกรงใจ), 곧 상대를 불편하게 하지 않으려는 마음이 직접적인 요구를 누릅니다. 그래서 그림에서는 권력이 실제보다 부드러워 보입니다.",
            "「kreng jai」（不願給人添麻煩）壓抑了直接要求，圖上的權力因而顯得比實際柔和。"],
      D06: ["Conflict avoidance is normative, so triangles present as silence and detour rather than open fighting.",
            "갈등 회피가 규범이므로 삼각관계는 드러난 다툼이 아니라 침묵과 우회의 형태로 나타납니다.",
            "迴避衝突為常態，三角關係多以沉默與迂迴呈現，而非公開爭執。"],
      D09: ["Labour migration and remittance are the main channels along which obligation and absence pass down.",
            "노동 이주와 송금이 의무와 부재를 세대로 실어 나르는 주된 통로입니다.",
            "勞動遷移與匯款，是義務與缺席向下傳遞的主要通道。"],
      D10: ["Temporary ordination, bride-price at marriage, and the return of care to parents mark the life cycle.",
            "단기 출가(승려 서품), 결혼 때의 신붓값(신솟), 부모 부양으로의 회귀가 생애주기를 표시합니다.",
            "短期出家、婚時的聘金，以及回頭奉養父母，標記著生命週期。"],
      D11: ["Keeping a cool heart and letting things pass are valued; loss of face is avoided at high cost.",
            "마음을 차게 유지하고(จายเย็น) 넘어가는 것이 미덕입니다. 체면을 잃는 일은 큰 대가를 치르고서라도 피합니다.",
            "重視「心涼」與讓事情過去；不惜代價避免失面子。"],
      D12: ["Theravada Buddhism and spirit beliefs coexist; the temple is both a social and a spiritual centre.",
            "상좌부 불교와 정령 신앙이 함께 있습니다. 사원은 신앙의 중심이자 사회적 중심입니다.",
            "上座部佛教與精靈信仰並存；寺院既是信仰中心，也是社會中心。"],
      D13: ["Temple, village and a wide network of kin and fictive kin carry support.",
            "사원과 마을, 그리고 친족과 의사친족으로 넓게 퍼진 연결망이 지지를 실어 나릅니다.",
            "寺院、村落，以及廣泛的親屬與擬親屬網絡承載支持。"],
    },
    qs: [
      ["Who has worked away from home, for how long, and who looked after the children then?",
       "집을 떠나 일한 사람은 누구이고, 얼마나 오래였으며, 그동안 아이는 누가 돌보았습니까?",
       "誰曾離家工作？多久？期間孩子由誰照顧？"],
      ["Which duties toward your parents are you expected to repay, and how is that going?",
       "부모에게 갚아야 할 도리로 무엇이 기대되고 있으며, 그것은 어떻게 되어 가고 있습니까?",
       "家中期待您如何回報父母？進行得如何？"],
      ["When someone is upset here, how do you know — what is said and what is left unsaid?",
       "이 집에서 누가 속상할 때 어떻게 알아차립니까 — 무엇이 말해지고 무엇이 남겨집니까?",
       "家中有人難過時，您如何得知——什麼被說出，什麼被留下？"],
    ],
  },
  {
    id: "kh", label: ["Cambodia", "캄보디아", "柬埔寨"],
    summary: [
      "A generation removed by the Khmer Rouge, silence as protection, and Buddhist framing of suffering.",
      "크메르루주가 통째로 앗아간 한 세대, 보호 수단으로서의 침묵, 그리고 고통을 읽는 불교적 틀.",
      "被赤柬奪去的一整個世代、作為保護的沉默，以及以佛教框架理解苦難。"],
    lens: {
      D01: ["Blanks in the grandparent generation are common and often mark killing, starvation or forced separation between 1975 and 1979. Read an empty space as loss before reading it as avoidance.",
            "조부모 세대의 빈칸이 흔합니다. 1975~79년의 학살·기아·강제 이산이 남긴 자리인 경우가 많습니다. 빈칸을 회피로 읽기 전에 상실로 읽으십시오.",
            "祖父母世代的空白十分常見，多為1975至1979年間屠殺、饑荒或強制離散所留。先將空白讀為失落，而非迴避。"],
      D02: ["Kinship is bilateral, and a couple commonly lives with the wife's parents in the early years of marriage.",
            "친족은 양쪽으로 이어지며, 결혼 초기에는 처가에서 사는 것이 일반적입니다.",
            "親屬為雙系，新婚初期夫妻常與妻方父母同住。"],
      D03: ["What looks like emotional cut-off may be forced separation or death rather than a choice to withdraw.",
            "정서적 단절처럼 보이는 것이 실은 강제 이산이거나 죽음일 수 있습니다. 물러선 것이 아니라 끊긴 것입니다.",
            "看似情緒截斷者，可能是強制離散或死亡，而非選擇退離。"],
      D04: ["Elder authority and the protection of face are strong; hierarchy is carried in forms of address.",
            "연장자의 권위와 체면 지키기가 강하게 작동하며, 위계는 호칭에 실려 있습니다.",
            "長者權威與顧全面子甚強；階層承載於稱謂之中。"],
      D06: ["Distress often moves through silence and detour rather than open confrontation.",
            "고통은 정면 대결보다 침묵과 우회를 통해 움직입니다.",
            "痛苦多經由沉默與迂迴流動，而非正面衝突。"],
      D09: ["Collective trauma transmits through what was never said; a parent's unspoken years can appear as a child's symptom.",
            "집단 트라우마는 말해지지 않은 것을 통해 전해집니다. 부모가 끝내 말하지 않은 몇 해가 자녀의 증상으로 나타나기도 합니다.",
            "集體創傷經由未曾言說之事傳遞；父母未曾提起的那些年，可能顯現為子女的症狀。"],
      D10: ["Labour migration to Thailand, early marriage, and the duty of care to parents shape the life cycle.",
            "태국으로의 노동 이주, 이른 결혼, 부모 부양의 의무가 생애주기를 만듭니다.",
            "赴泰勞動遷移、早婚，以及奉養父母的義務，形塑了生命週期。"],
      D11: ["Not telling is often a way of protecting the next generation, not a refusal to engage.",
            "말하지 않는 것은 대개 다음 세대를 지키는 방식이지, 대화를 거부하는 것이 아닙니다.",
            "不說，往往是保護下一代的方式，而非拒絕溝通。"],
      D12: ["Theravada Buddhism and notions of kamma shape how suffering is explained and borne.",
            "상좌부 불교와 업(kamma) 관념이 고통을 설명하고 견디는 방식을 만듭니다.",
            "上座部佛教與業（kamma）的觀念，形塑了苦難如何被解釋與承受。"],
      D13: ["Pagoda, monks and village networks are primary resources for repair.",
            "사원과 승려, 마을 연결망이 회복의 일차 자원입니다.",
            "佛寺、僧侶與村落網絡是修復的首要資源。"],
    },
    qs: [
      ["Which relatives can no longer be asked about, and what is known of what happened to them?",
       "이제는 물어볼 수 없는 친족은 누구이며, 그분들에게 무슨 일이 있었는지 알려진 것은 무엇입니까?",
       "哪些親屬已無從詢問？關於他們的遭遇，家中知道些什麼？"],
      ["What does this family not talk about, and who decided that it would not be talked about?",
       "이 가족이 말하지 않는 일은 무엇이며, 말하지 않기로 한 것은 누구입니까?",
       "這個家不談論什麼？是誰決定不談的？"],
      ["Where does this family go for comfort — the pagoda, the village, or someone in particular?",
       "이 가족은 어디에서 위로를 얻습니까 — 사원입니까, 마을입니까, 아니면 특정한 누구입니까?",
       "這個家從何處得到安慰——佛寺、村落，還是某個特定的人？"],
    ],
  },
  {
    id: "jp", label: ["Japan", "일본", "日本"],
    summary: [
      "A family line that runs through ancestors and descendants, a 1947 legal break whose practices did not end, and mass post-war migration to the cities.",
      "조상과 후손까지 이어지는 '집(家)'의 관념, 1947년 법이 바꾸었어도 이어진 상속·동거의 관행, 전후 대도시로의 대규모 이주.",
      "貫穿祖先與後代的「家」之觀念、1947年法律改革後仍延續的繼承與同居慣行，以及戰後大量遷往都市。"],
    /* 이 렌즈를 세운 자료 — 화면에 그대로 밝힌다 */
    basis: ["The Japanese Family System: Change, Continuity, and Regionality over the Twentieth Century (번역본)", "일본의 가족 구조 (완성본)", "일본 3. 일본의 가족구조 — 신탁 가족 구조 유형"],
    lens: {
      D01: ["The ie (家) was one line running from ancestors to descendants, carrying a name, property and often a trade. Trace who took over the house and land: the 1947 reform made inheritance equal, yet a married eldest son living with his parents and inheriting the home stayed common.",
            "집(家)은 조상에서 후손까지 이어지며 이름·재산·가업을 실어 나르는 하나의 줄기로 여겨졌습니다. 누가 집과 땅을 이었는지를 먼저 그리십시오. 1947년 개정으로 상속은 균등해졌지만, 결혼한 장남이 부모와 살며 집을 잇는 관행은 그 뒤에도 흔했습니다.",
            "「家」被視為由祖先延續到後代、承載姓名、財產與家業的一條主線。請先標出誰承接了房屋與土地；1947年修法後繼承雖趨均等，但已婚長子與父母同住並繼承家園的做法仍然常見。"],
      D02: ["A couple living on their own does not by itself mean the couple subsystem is independent. Many start out apart and move back in with a parent ten to fifteen years into the marriage; Harada called this fictional nuclearisation.",
            "부부가 따로 산다고 해서 부부 하위체계가 독립했다고 바로 읽지 않습니다. 결혼 초에는 따로 살다가 10~15년 뒤 부모와 다시 합치는 '지연된 동거'가 흔하며, 하라다는 이를 '허구적 핵가족화'라 불렀습니다.",
            "夫妻分居另立門戶，並不等於夫妻次系統已經獨立。許多人婚初分開住，婚後十至十五年再與父母同住；原田稱之為「虛構的核心家庭化」。"],
      D03: ["Read boundaries by what is passed down and owed — the house, the land, the care of parents — and not only by who shares an address. Ties of property and reciprocity do not weaken with time after a couple moves out.",
            "경계는 주소보다, 집·땅·부모 부양처럼 무엇이 오가고 무엇이 빚으로 남아 있는지로 읽습니다. 집과 땅의 이전, 세대 간 주고받음의 영향은 결혼 뒤 시간이 지나도 약해지지 않습니다.",
            "界線不只看同不同住，更要看什麼在傳承、什麼是虧欠——房屋、土地與奉養父母。財產移轉與世代互惠的影響，不會隨婚後時間而減弱。"],
      D04: ["Rank was framed by Confucian ethics: children under parents, younger under elder siblings, wife under husband, and the household head decided marriage, occupation and residence. The postwar model of an equal, 'democratic' father lies over this, so ask each generation which one they were raised under.",
            "서열은 유교 윤리로 규범화되었습니다. 자녀는 부모에게, 동생은 형에게, 아내는 남편에게 따르고, 가주는 결혼·직업·거주지를 정할 권한을 가졌습니다. 전후에는 평등하고 '민주적'인 아버지상이 그 위에 겹쳤으므로, 세대마다 어느 쪽에서 자랐는지를 따로 묻습니다.",
            "階序由儒家倫理規範：子女從屬父母、弟從屬兄、妻從屬夫，家長掌有婚姻、職業與居所的決定權。戰後「民主」而平等的父親形象疊加其上，請逐代詢問其成長於哪一種模式。"],
      D06: ["A mother who keeps in touch with a son, even sending him money, while the father knows and does not say so, is a described pattern. Read it first as a family that keeps some things unspoken, before reading it as a coalition against the father.",
            "어머니가 아들과 연락을 이어 가고 돈까지 보내는데 아버지가 알면서도 입 밖에 내지 않는 모습이 보고되어 있습니다. 아버지에 맞선 연합으로 읽기 전에, 말하지 않는 것이 방식인 가족으로 먼저 봅니다.",
            "母親與兒子保持聯繫、甚至匯錢給他，父親知情卻不明說——文獻中描述過這種模式。請先視為「有些事不說出口」的家庭方式，再考慮是否為對抗父親的聯盟。"],
      D09: ["The order of succession is the spine of transmission: who inherited the house and who left. Those who moved to Tokyo, Osaka and Nagoya between 1955 and 1974 were mostly second and third children who would not inherit, from sibling groups averaging 4.5 to 5.7.",
            "전이의 줄기는 잇는 순서입니다. 누가 집을 이었고 누가 떠났는가를 봅니다. 1955~74년 도쿄·오사카·나고야로 간 사람들은 대개 집을 잇지 않는 둘째·셋째였고, 형제자매가 평균 4.5~5.7명인 세대였습니다.",
            "傳遞的主軸是承接的順序——誰繼承了家、誰離開。1955至1974年遷往東京、大阪、名古屋的人，多為不繼承家業的次子女、三子女，且來自手足平均4.5至5.7人的世代。"],
      D10: ["Look past whether the couple lived with parents at the wedding to the years ten to fifteen after it: in the later cohort, more than three in ten couples were living with a parent by then.",
            "결혼식 때 부모와 살았는지보다, 결혼 뒤 10~15년 무렵을 봅니다. 뒷 세대에서는 이 무렵 부부의 30% 넘게 부모와 함께 살고 있었습니다.",
            "比起婚禮當時是否與父母同住，更應看婚後十至十五年：較晚世代此時已有三成以上夫妻與父母同住。"],
      D11: ["Visible authority and private reliance can diverge: fathers who seemed stern are described as possibly depending on their wives emotionally behind the scenes. Ask what each person shows and what each is believed to feel.",
            "겉으로 보이는 권위와 속의 의존은 다를 수 있습니다. 엄격해 보이던 아버지가 무대 뒤에서는 아내에게 정서적으로 기댔을 가능성이 서술되어 있습니다. 각 사람이 보여 주는 것과 속으로 느낀다고 여겨지는 것을 나누어 묻습니다.",
            "外顯的權威與私下的依賴可能不同：文獻描述看似嚴厲的父親，私下可能在情感上依賴妻子。請分別詢問各人表現出的，以及被認為內心所感的。"],
      D12: ["Read the 1947 abolition of the ie system, the 1955–74 growth years and a thin social safety net together: care of parents and inheritance stayed family duties. Regions differ — coresidence at marriage is about twice as likely in Tohoku, northern Kanto and Chubu as in southern Kanto, and lower in Kinki.",
            "1947년 家 제도 폐지, 1955~74년 고도성장, 얇았던 사회 안전망을 함께 읽습니다. 부모 부양과 상속은 계속 가족의 몫이었습니다. 지역차도 큽니다. 결혼 때 동거할 가능성은 도호쿠·북부 간토·주부가 남부 간토의 두 배이고, 긴키는 낮습니다.",
            "請一併理解1947年廢除「家」制度、1955至1974年的高度成長，以及當時薄弱的社會安全網：奉養父母與繼承仍是家庭的責任。地區差異大——婚時同住的可能性，東北、北關東與中部約為南關東的兩倍，近畿則較低。"],
      D13: ["Sons who do not inherit often set up households close to the family home; that nearby network of siblings and parents is a resource. In the south-west the heir could be the youngest child rather than the eldest son.",
            "집을 잇지 않는 아들은 본가 가까이에 따로 살림을 차리는 일이 많습니다. 그렇게 가까이 사는 형제·부모 연결망이 자원입니다. 남서부에서는 장남이 아니라 막내가 잇는 관행도 있었습니다.",
            "不繼承家業的兒子常在本家附近另立門戶，這個就近的手足與父母網絡是一項資源。西南部也有由么子女而非長子繼承的做法。"],
    },
    qs: [
      ["Who took over the house, the land or the family trade, and where did the other brothers and sisters go?",
       "집과 땅, 가업은 누가 이어받았고, 다른 형제자매는 어디로 가서 무엇을 하며 살았습니까?",
       "房屋、土地或家業由誰接手？其他兄弟姊妹去了哪裡、做什麼？"],
      ["If you lived apart at first, when did you begin living with or near a parent, and what led to it?",
       "처음에 따로 살았다면, 언제부터 부모와 함께 또는 가까이 살게 되었고, 그 계기는 무엇이었습니까?",
       "若一開始分開住，何時開始與父母同住或住在附近？契機是什麼？"],
      ["Is the care of the parents and the passing on of the house settled in words, or does everyone simply know?",
       "부모 부양과 집의 이전은 말로 정해져 있습니까, 아니면 말하지 않아도 모두가 알고 있습니까?",
       "奉養父母與房屋的傳承，是用言語說定的，還是大家心照不宣？"],
    ],
  },
];
const CULT = Object.fromEntries(CULTURES.map((c) => [c.id, c]));
const CULTURE_CAUTION = [
  "These are general tendencies recorded in the literature, not an explanation of the family in front of you. Use them to ask a better question, never to fill in an answer.",
  "여기 적힌 것은 문헌에 기록된 일반적 경향이지, 지금 앞에 앉은 가족에 대한 설명이 아닙니다. 답을 채우는 데 쓰지 말고, 더 나은 질문을 던지는 데 쓰십시오.",
  "此處所記為文獻中的一般傾向，而非對眼前這個家庭的解釋。請用以提出更好的提問，而非填補答案。",
];

/* 개별 규칙. id는 감사와 보고서 인용(예: "D03-R18")을 위한 고정 식별자다.
   ternary로 갈리던 조건은 서로 다른 규칙 두 개로 나누었다. */
const RULES = [
  // ── D01 · 가족 구조와 구성 ──────────────────────────────────────
  { id: "R01", domain: "D01", source: ["S1", "S2"], grade: "observed",
    when: (o) => o.genCount >= 3,
    text: (o, li) => tr(["The chart covers {n} generations, enough to read patterns across time.", "가계도에는 {n}세대가 나옵니다. 세대마다 무엇이 되풀이되는지 살펴볼 수 있습니다.", "圖中涵蓋 {n} 代，足以閱讀跨時間的模式。"], li).replace("{n}", o.genCount) },
  { id: "R02", domain: "D01", source: ["S1", "S2"], grade: "explore",
    when: (o) => o.genCount < 3,
    text: (o, li) => tr(["Only {n} generation(s) are drawn. Three generations are the working minimum for pattern reading.", "{n}세대만 그려져 있습니다. 패턴을 읽으려면 3세대가 최소한입니다.", "僅繪出 {n} 代。閱讀模式至少需要三代。"], li).replace("{n}", o.genCount) },
  { id: "R03", domain: "D01", source: ["S1", "S2"], grade: "observed",
    when: (o) => (o.unionsByType.divorced || 0) + (o.unionsByType.sepFact || 0) + (o.unionsByType.sepLegal || 0) > 0,
    text: (o, li) => { const div = (o.unionsByType.divorced || 0) + (o.unionsByType.sepFact || 0) + (o.unionsByType.sepLegal || 0);
      return tr(["{n} partnership(s) ended or are in separation. Note who moved, who stayed, and how the households re-formed.", "{n}건의 관계가 끝났거나 별거 중입니다. 누가 떠나고 누가 남았는지, 가구가 어떻게 다시 짜였는지를 함께 보십시오.", "有 {n} 段關係已結束或處於分居。請一併看誰離開、誰留下，家戶如何重組。"], li).replace("{n}", div); } },
  { id: "R04", domain: "D01", source: ["S1", "S2"], grade: "observed",
    when: (o) => o.households.length > 1,
    text: (o, li) => tr(["{n} households are marked. A family living in more than one household carries more than one set of rules.", "가구가 {n}개 표시되어 있습니다. 두 가구 이상에 걸친 가족은 규칙도 두 벌을 안고 삽니다.", "已標示 {n} 個家戶。跨兩個以上家戶的家庭，也同時承載兩套規則。"], li).replace("{n}", o.households.length) },

  // ── D02 · 가족 하위체계 ─────────────────────────────────────────
  { id: "R05", domain: "D02", source: ["S1", "S3", "S7"], grade: "observed",
    when: (o) => (o.unionsByType.married || 0) > 0,
    text: (o, li) => tr(["{n} marital subsystem(s) are drawn. Ask what each couple decides together and what they decide apart.", "가계도에는 부부 {n}쌍이 나옵니다. 무엇을 함께 정하고 무엇을 각자 정하는지 부부마다 물어보세요.", "已繪出 {n} 個夫妻次系統。請詢問每對夫妻共同決定什麼、各自決定什麼。"], li).replace("{n}", o.unionsByType.married || 0) },
  { id: "R06", domain: "D02", source: ["S1", "S3", "S7"], grade: "observed",
    when: (o) => { const sib = {}; o.real.forEach((p) => { if (p.puid) (sib[p.puid] = sib[p.puid] || []).push(p); }); return Object.values(sib).some((g) => g.length > 1); },
    text: (o, li) => { const sib = {}; o.real.forEach((p) => { if (p.puid) (sib[p.puid] = sib[p.puid] || []).push(p); });
      const n = Object.values(sib).filter((g) => g.length > 1).length;
      return tr(["{n} sibling group(s) appear. Sibling position shapes what each person expects of the others.", "형제 하위체계가 {n}개 나타납니다. 형제 순위는 서로에게 무엇을 기대하는지를 만듭니다.", "出現 {n} 個手足次系統。手足位置形塑彼此的期待。"], li).replace("{n}", n); } },
  { id: "R07", domain: "D02", source: ["S1", "S5", "S7"], grade: "supported",
    when: (o) => o.crossGen.length > 0,
    text: (o, li) => tr(["{n} relationship line(s) skip a generation. Look at whether a grandparent has taken a parental place.", "{n}개의 관계선이 한 세대를 건너뜁니다. 조부모가 부모 자리를 대신 맡고 있지 않은지 살펴보십시오.", "有 {n} 條關係線跨越一個世代。請留意祖父母是否代行父母之職。"], li).replace("{n}", o.crossGen.length) },

  // ── D03 · 경계와 자아분화 ───────────────────────────────────────
  { id: "R08", domain: "D03", source: ["S1", "S4", "S6", "S7"], grade: "supported",
    when: (o) => o.fused.length > 0,
    text: (o, li) => tr(["{n} fused relationship line(s) are drawn — a sign of blurred boundaries where two people function as one.", "융합 관계선이 {n}개 그려져 있습니다. 두 사람이 하나처럼 움직이는, 경계가 흐려진 자리의 표시입니다.", "已繪出 {n} 條融合關係線 — 界線模糊、兩人如一體運作的徵象。"], li).replace("{n}", o.fused.length) },
  { id: "R09", domain: "D03", source: ["S1", "S4", "S6"], grade: "supported",
    when: (o) => o.cutoffs.length > 0,
    text: (o, li) => tr(["{n} cut-off or estranged line(s) are drawn. Bowen reads cut-off as the other face of fusion, not as its opposite.", "단절·소원 관계선이 {n}개 있습니다. 보웬은 단절을 융합의 반대가 아니라 그 다른 얼굴로 읽습니다.", "有 {n} 條斷絕或疏遠關係線。Bowen 視斷絕為融合的另一面，而非其反面。"], li).replace("{n}", o.cutoffs.length) },
  { id: "R10", domain: "D03", source: ["S4", "S6"], grade: "supported",
    when: (o) => o.fused.length > 0 && o.cutoffs.length > 0,
    text: (o, li) => tr(["Fusion and cut-off both appear in this family. Check whether they sit at opposite ends of the same tension.", "융합과 단절이 한 가족 안에 함께 나타납니다. 이 둘이 같은 긴장의 양 끝에 있는지 확인해 보십시오.", "融合與斷絕同時出現於此家庭。請確認兩者是否位於同一張力的兩端。"], li) },
  { id: "R11", domain: "D03", source: ["S1"], grade: "explore",
    when: (o) => o.fused.length === 0 && o.cutoffs.length === 0 && !o.history.some((h) => h.segs.some((sg) => ["connect", "distance", "abuse"].includes(sg.cat) && (sg.cat !== "connect" || sg.type === "fused" || sg.type === "fusedConflict"))),
    text: (o, li) => tr(["No fusion or cut-off lines are drawn yet. Boundaries cannot be read from structure alone.", "융합·단절 관계선이 아직 없습니다. 지금 가계도만으로는 가족이 서로 얼마나 가깝거나 멀리 지내는지 알기 어렵습니다.", "尚未繪出融合或斷絕線。界線無法僅由結構判讀。"], li) },
  { id: "R44", domain: "D03", source: ["S1"], grade: "supported",
    when: (o) => (o.fused.length > 0 || o.cutoffs.length > 0) === false
      && o.history.some((h) => h.segs.some((sg) => sg.cat === "distance" || sg.type === "fused" || sg.type === "fusedConflict")),
    text: (o, li) => { const h = o.history.find((h) => h.segs.some((sg) => sg.cat === "distance" || sg.type === "fused" || sg.type === "fusedConflict"));
      return tr(["No fusion or cut-off is present now, but the relationship between {a} and {b} passed through one earlier. The current picture is a recovery, not an absence of the issue.", "지금은 융합·단절이 없지만, {a}와(과) {b} 사이의 관계는 한때 그것을 지나왔습니다. 지금의 모습은 문제가 없었던 것이 아니라 회복된 것입니다.", "目前雖無融合或斷絕，但{a}與{b}之間的關係曾經歷過。現況是復原後的樣貌，而非從未有過問題。"], li)
        .replace("{a}", personName(o.byId[h.a], li)).replace("{b}", personName(o.byId[h.b], li)); } },
  { id: "R12", domain: "D03", source: ["S1"], grade: "supported",
    when: (o) => o.history.some((h) => h.transitions.some((t) => t.dir === "worsen" && ["distance", "abuse"].includes((BOND_TYPES[t.toType] || {}).cat) && t.year)),
    text: (o, li) => { const h = o.history.find((h) => h.transitions.some((t) => t.dir === "worsen" && ["distance", "abuse"].includes((BOND_TYPES[t.toType] || {}).cat) && t.year));
      const t = h.transitions.find((t) => t.dir === "worsen" && ["distance", "abuse"].includes((BOND_TYPES[t.toType] || {}).cat) && t.year);
      return tr(["A relationship between {a} and {b} moved toward distance or cut-off in {y}{e}.", "{a}와(과) {b} 사이의 관계가 {y}년 거리·단절 쪽으로 옮겨 갔습니다{e}.", "{a}與{b}之間的關係於 {y} 年轉向疏離或斷絕{e}。"], li)
        .replace("{a}", personName(o.byId[h.a], li)).replace("{b}", personName(o.byId[h.b], li)).replace("{y}", t.year)
        .replace("{e}", t.coincidesWithEvent ? tr([" — the same year as a recorded family event", " — 같은 해에 가족 사건이 기록되어 있습니다", " — 與已記錄的家庭事件同年"], li) : ""); } },
  { id: "R13", domain: "D03", source: ["S1"], grade: "supported",
    when: (o) => o.history.some((h) => h.cycles),
    text: (o, li) => { const n = o.history.filter((h) => h.cycles).length;
      return tr(["{n} relationship(s) have both worsened and later eased at different times. Ask what was different between the two periods.", "{n}개의 관계가 시기를 달리하여 나빠지기도, 나아지기도 했습니다. 그 두 시기 사이에 무엇이 달랐는지 물어보십시오.", "{n} 段關係曾在不同時期惡化又緩解。請詢問這兩個時期之間有何不同。"], li).replace("{n}", n); } },

  // ── D04 · 위계와 권력, 역할과 책임 ────────────────────────────────
  { id: "R14", domain: "D04", source: ["S1", "S3"], grade: "observed",
    when: (o) => o.flagged.roles.length > 0,
    text: (o, li) => tr(["{n} person(s) carry a named role. A role that never rotates tends to become an obligation.", "역할이 적힌 인물이 {n}명입니다. 돌아가지 않는 역할은 의무가 되기 쉽습니다.", "有 {n} 人被標註角色。從不輪替的角色容易變成義務。"], li).replace("{n}", o.flagged.roles.length) },
  { id: "R15", domain: "D04", source: ["S1", "S5", "S7"], grade: "explore",
    when: (o) => o.crossGen.length > 0,
    text: (o, li) => tr(["A relationship crossing two generations may mean a child holds adult responsibility. Check before naming it role reversal.", "두 세대를 가로지르는 관계는 자녀가 어른의 책임을 지고 있다는 뜻일 수 있습니다. 역할 역전이라 부르기 전에 확인하십시오.", "跨兩代的關係可能意味子女承擔成人責任。稱之為角色倒置前請先確認。"], li) },

  // ── D05 · 동맹과 연합 ───────────────────────────────────────────
  { id: "R16", domain: "D05", source: ["S1", "S2", "S7"], grade: "explore",
    when: (o) => o.conflict.length > 0 && (o.bondCat.connect || 0) > 0,
    text: (o, li) => tr(["Conflict and closeness lines appear side by side. Where a close pair stands against a third person, look for a coalition rather than simple closeness.", "갈등선과 친밀선이 나란히 나타납니다. 가까운 두 사람이 제3자를 사이에 두고 맞서 있다면, 단순한 친밀함이 아니라 연합일 수 있습니다.", "衝突線與親近線並存。若親近的兩人共同對抗第三人，宜視為聯盟而非單純親近。"], li) },
  { id: "R17", domain: "D05", source: ["S1", "S2"], grade: "withheld",
    when: (o) => o.conflict.length === 0,
    text: (o, li) => tr(["No conflict lines are drawn, so coalitions cannot be read yet.", "갈등 관계선이 없습니다. 다툴 때 누가 누구 편에 서는지 아직 알 수 없습니다.", "尚未繪出衝突線，暫無法判讀聯盟。"], li) },

  // ── D06 · 삼각관계 ──────────────────────────────────────────────
  { id: "R18", domain: "D06", source: ["S1", "S4", "S6"], grade: "supported",
    when: (o) => o.triangles.length > 0,
    text: (o, li) => tr(["{n} triangle(s) are marked. A triangle needs three things together: a standing tension in the pair, a repeated third-party function, and a drop in tension after that person steps in.", "삼각관계가 {n}개 표시되어 있습니다. 삼각관계로 보려면 세 가지가 함께 있어야 합니다 — 두 사람 사이의 지속된 긴장, 제3자의 되풀이되는 기능, 그가 끼어든 뒤 긴장이 잠시 가라앉는 것.", "已標示 {n} 個三角關係。判定需三者俱備：兩人間持續的張力、第三者反覆的功能、其介入後張力暫時下降。"], li).replace("{n}", o.triangles.length) },
  { id: "R19", domain: "D06", source: ["S1", "S4", "S6"], grade: "explore",
    when: (o) => o.triangles.length === 0 && o.conflict.length > 0,
    text: (o, li) => tr(["Conflict is drawn but no triangle is marked yet. Ask who steps in when that conflict rises.", "갈등은 그려져 있으나 삼각관계는 아직 표시되지 않았습니다. 그 갈등이 높아질 때 누가 끼어드는지 물어보십시오.", "已畫出衝突但尚未標示三角關係。請詢問衝突升高時誰會介入。"], li) },
  { id: "R20", domain: "D06", source: ["S1"], grade: "withheld",
    when: (o) => o.triangles.length === 0 && o.conflict.length === 0,
    text: (o, li) => tr(["Not enough relationship data to consider triangles.", "누가 누구와 어떻게 지내는지 아직 충분히 적지 않았습니다. 누가 두 사람 사이에 자주 끼어드는지도 알기 어렵습니다.", "關係資料尚不足以考慮三角關係。"], li) },

  // ── D07 · 정서 조절과 불안의 흐름, 가족 항상성 ──────────────────
  { id: "R21", domain: "D07", source: ["S1", "S4"], grade: "observed",
    when: (o) => o.changed.length > 0,
    text: (o, li) => tr(["{n} relationship(s) changed type over time. The year a relationship changed is often the year the family's anxiety moved.", "{n}개의 관계가 시기에 따라 유형이 바뀌었습니다. 관계가 바뀐 해는 대개 가족의 불안이 옮겨 간 해입니다.", "有 {n} 段關係隨時間改變類型。關係改變之年，往往是家庭焦慮移動之年。"], li).replace("{n}", o.changed.length) },
  { id: "R22", domain: "D07", source: ["S1", "S4"], grade: "explore",
    when: (o) => o.flagged.addi.length > 0 || o.flagged.ment.length > 0,
    text: (o, li) => tr(["Symptoms are marked on {n} person(s). Ask what the family does differently when the symptom is worse.", "{n}명에게 증상이 표시되어 있습니다. 증상이 심해질 때 가족이 무엇을 달리 하는지 물어보십시오.", "有 {n} 人被標註症狀。請詢問症狀加重時家庭有何不同作為。"], li).replace("{n}", o.flagged.addi.length + o.flagged.ment.length) },
  { id: "R23", domain: "D07", source: ["S1"], grade: "observed",
    when: (o) => o.history.some((h) => h.transitions.some((t) => t.coincidesWithEvent)),
    text: (o, li) => { const hits = []; o.history.forEach((h) => h.transitions.forEach((t) => { if (t.coincidesWithEvent) hits.push({ h, t }); }));
      const { h, t } = hits[0];
      return tr(["A change in the relationship between {a} and {b} in {y} falls in the same year as a recorded family event.", "{a}와(과) {b} 사이 관계의 변화가 {y}년에 있었고, 같은 해에 가족 사건이 기록되어 있습니다.", "{a}與{b}之間的關係於 {y} 年發生變化，與已記錄的家庭事件同年。"], li)
        .replace("{a}", personName(o.byId[h.a], li)).replace("{b}", personName(o.byId[h.b], li)).replace("{y}", t.year); } },

  // ── D08 · 가족 기능과 역기능의 균형 ─────────────────────────────
  { id: "R24", domain: "D08", source: ["S2", "S3"], grade: "observed",
    when: () => true,
    text: (o, li) => { const hard = o.abuse.length + o.cutoffs.length + o.conflict.length;
      return tr(["{a} strained and {b} supportive relationship line(s) are drawn. Read both columns before drawing any conclusion.", "긴장된 관계선 {a}개와 지지적인 관계선 {b}개가 그려져 있습니다. 어느 쪽으로도 결론짓기 전에 두 칸을 함께 보십시오.", "已繪出 {a} 條緊張關係線與 {b} 條支持性關係線。下任何結論前請同時閱讀兩欄。"], li).replace("{a}", hard).replace("{b}", o.supportive); } },
  { id: "R25", domain: "D08", source: ["S2", "S3"], grade: "explore",
    when: (o) => o.supportive === 0 && (o.abuse.length + o.cutoffs.length + o.conflict.length) > 0,
    text: (o, li) => tr(["Only strained relationships are recorded. A chart with no supportive line is usually an incomplete chart, not a family without support.", "긴장된 관계만 기록되어 있습니다. 지지선이 하나도 없는 가계도는 대개 지지가 없는 가족이 아니라 덜 그려진 가계도입니다.", "僅記錄了緊張關係。沒有任何支持線的圖，通常是尚未畫完的圖，而非沒有支持的家庭。"], li) },

  // ── D09 · 세대 간 전이와 반복 패턴 ──────────────────────────────
  { id: "R26", domain: "D09", source: ["S1", "S4"], grade: "supported",
    when: (o) => o.repeated.length > 0,
    text: (o, li) => tr(["These relationship categories appear in more than one generation: {x}. Repetition across generations is what the genogram is built to show.", "다음 관계 범주가 한 세대를 넘어 나타납니다 — {x}. 세대를 건너 되풀이되는 것이야말로 가계도가 보여 주려는 것입니다.", "下列關係類別出現於一代以上：{x}。跨世代的重複正是家系圖所要呈現的。"], li).replace("{x}", o.repeated.map((c) => tr(BOND_CATS[c].label, li)).join(" · ")) },
  { id: "R27", domain: "D09", source: ["S1", "S4"], grade: "supported",
    when: (o) => !!o.flagSpread.phys,
    text: (o, li) => tr(["{x} is marked in {n} different generations. This is the vertical axis the genogram exists to make visible.", "{x} — 서로 다른 {n}개 세대에 표시되어 있습니다. 가계도가 드러내려는 수직축이 바로 이것입니다.", "{x}標註於 {n} 個不同世代。這正是家系圖欲呈現的縱軸。"], li).replace("{x}", tr(["Physical illness", "신체 질환", "身體疾病"], li)).replace("{n}", o.flagSpread.phys) },
  { id: "R28", domain: "D09", source: ["S1", "S4"], grade: "supported",
    when: (o) => !!o.flagSpread.ment,
    text: (o, li) => tr(["{x} is marked in {n} different generations. This is the vertical axis the genogram exists to make visible.", "{x} — 서로 다른 {n}개 세대에 표시되어 있습니다. 가계도가 드러내려는 수직축이 바로 이것입니다.", "{x}標註於 {n} 個不同世代。這正是家系圖欲呈現的縱軸。"], li).replace("{x}", tr(["Mental health difficulty", "정신건강 어려움", "心理健康困難"], li)).replace("{n}", o.flagSpread.ment) },
  { id: "R29", domain: "D09", source: ["S1", "S4"], grade: "supported",
    when: (o) => !!o.flagSpread.addi,
    text: (o, li) => tr(["{x} is marked in {n} different generations. This is the vertical axis the genogram exists to make visible.", "{x} — 서로 다른 {n}개 세대에 표시되어 있습니다. 가계도가 드러내려는 수직축이 바로 이것입니다.", "{x}標註於 {n} 個不同世代。這正是家系圖欲呈現的縱軸。"], li).replace("{x}", tr(["Addiction", "중독", "成癮"], li)).replace("{n}", o.flagSpread.addi) },
  { id: "R30", domain: "D09", source: ["S1"], grade: "explore",
    when: (o) => o.repeated.length === 0 && !o.flagSpread.phys && !o.flagSpread.ment && !o.flagSpread.addi,
    text: (o, li) => tr(["No pattern yet repeats across generations in the drawn data. More relationship lines in the grandparent generation would test this.", "지금까지 그린 내용만으로는 여러 세대에서 무엇이 되풀이되는지 찾기 어렵습니다. 조부모 세대의 관계를 더 그려 보면 알 수 있습니다.", "現有資料尚未出現跨世代重複的模式。補畫祖父母世代的關係線可供檢驗。"], li) },
  { id: "R31", domain: "D09", source: ["S1"], grade: "supported",
    when: (o) => o.repeatedSequences.length > 0,
    text: (o, li) => { const seq = o.repeatedSequences[0].split(">").map((c) => tr((BOND_CATS[c] || BOND_CATS.connect).label, li)).join(" → ");
      return tr(["The same order of relationship change ({x}) appears in more than one relationship in this family.", "같은 순서의 관계 변화({x})가 이 가족의 두 관계 이상에서 나타납니다.", "相同的關係變化順序（{x}）出現於這個家庭的兩段以上關係中。"], li).replace("{x}", seq); } },

  // ── D10 · 생애주기와 중대한 사건의 시기 ──────────────────────────
  { id: "R32", domain: "D10", source: ["S1", "S2"], grade: "observed",
    when: (o) => o.events.length > 0,
    text: (o, li) => tr(["{n} event(s) are recorded. Read across the chart at the year the problem began — coincidence in time is the point of the time-line.", "사건이 {n}개 기록되어 있습니다. 문제가 시작된 해에서 가로로 읽어 보십시오 — 시간의 겹침이 타임라인의 요점입니다.", "已記錄 {n} 個事件。請在問題開始之年橫向閱讀 — 時間上的巧合正是時間軸的重點。"], li).replace("{n}", o.events.length) },
  { id: "R33", domain: "D10", source: ["S1", "S2"], grade: "observed",
    when: (o) => o.transitions.length > 0,
    text: (o, li) => tr(["{n} family transition(s) are grouped. Events clustered in one transition often explain each other.", "가족 전환기가 {n}개 묶여 있습니다. 한 전환기에 몰린 사건들은 서로를 설명하는 일이 많습니다.", "已群組 {n} 個家庭轉換期。聚集於同一轉換期的事件常能互相說明。"], li).replace("{n}", o.transitions.length) },
  { id: "R34", domain: "D10", source: ["S1", "S2", "S6"], grade: "explore",
    when: (o) => o.losses.length >= 2,
    text: (o, li) => tr(["More than one loss is recorded. Check what followed each one within the next two years.", "상실이 둘 이상 기록되어 있습니다. 각 상실 뒤 2년 안에 무엇이 이어졌는지 확인해 보십시오.", "記錄了一次以上的失落。請確認每次失落後兩年內接續發生了什麼。"], li) },
  { id: "R35", domain: "D10", source: ["S1"], grade: "withheld",
    when: (o) => o.events.length === 0,
    text: (o, li) => tr(["No events are recorded yet, so timing cannot be read.", "가계도에 사건을 아직 적지 않았습니다. 같은 때에 어떤 일들이 겹쳤는지 알 수 없습니다.", "尚未記錄事件，無法判讀時間關聯。"], li) },

  // ── D11 · 의사소통과 가족의 정서적 분위기 ───────────────────────
  { id: "R36", domain: "D11", source: ["S3"], grade: "explore",
    when: () => true,
    text: (o, li) => tr(["Communication cannot be read from a chart. It is read from what you watch in the room: who speaks first, who is interrupted, whether messages travel directly or through someone.", "의사소통은 가계도로 읽히지 않습니다. 상담실에서 보는 것으로 읽습니다 — 누가 먼저 말하는지, 누가 말을 끊기는지, 메시지가 곧장 가는지 누구를 거쳐 가는지.", "溝通無法由圖判讀，須由室內觀察而得：誰先開口、誰被打斷、訊息直達或經由他人傳遞。"], li) },

  // ── D12 · 문화·사회·역사적 맥락 ─────────────────────────────────
  { id: "R37", domain: "D12", source: ["S1"], grade: "observed",
    when: (o) => o.moves.length > 0,
    text: (o, li) => tr(["{n} move or migration is recorded. Migration re-sorts who is near, who is reachable, and which language the family argues in.", "이주가 {n}건 기록되어 있습니다. 이주는 누가 가까이 있는지, 누구에게 닿을 수 있는지, 어느 말로 다투는지를 다시 짭니다.", "記錄了 {n} 次遷徙。遷徙重新排列誰在身邊、誰可聯繫、家庭以何種語言爭執。"], li).replace("{n}", o.moves.length) },
  { id: "R38", domain: "D12", source: ["S1", "S4"], grade: "explore",
    when: () => true,
    text: (o, li) => tr(["Read this family's difficulty as an adaptation to larger forces — war, migration, poverty, gendered expectation — before reading it as personal failure.", "이 가족의 어려움을 개인의 실패로 읽기 전에, 전쟁·이주·가난·성별 기대 같은 더 큰 힘에 대한 적응으로 읽으십시오.", "在將此家庭的困難視為個人失敗之前，先視之為對戰爭、遷徙、貧窮、性別期待等更大力量的適應。"], li) },

  // ── D13 · 강점과 회복력, 자원 ────────────────────────────────────
  { id: "R39", domain: "D13", source: ["S2", "S3"], grade: "observed",
    when: (o) => o.supportive > 0,
    text: (o, li) => tr(["{n} supportive relationship line(s) are drawn. These are the family's working resources, not decoration on the chart.", "지지적인 관계선이 {n}개 그려져 있습니다. 이것은 가계도의 장식이 아니라 이 가족이 실제로 쓰는 자원입니다.", "已繪出 {n} 條支持性關係線。這些是家庭實際運用的資源，而非圖上的裝飾。"], li).replace("{n}", o.supportive) },
  { id: "R40", domain: "D13", source: ["S2"], grade: "supported",
    when: (o) => o.history.some((h) => h.lastType && (BOND_TYPES[h.lastType] || {}).cat === "connect" && h.changeCount > 0),
    text: (o, li) => tr(["At least one relationship moved toward closeness over time. A family that has repaired once has done it before and can name how.", "적어도 하나의 관계가 시간이 지나며 가까워지는 쪽으로 옮겨 갔습니다. 한 번 회복해 본 가족은 그 방법을 이미 알고 있습니다.", "至少有一段關係隨時間趨向親近。曾修復過一次的家庭，已知其方法。"], li) },
  { id: "R41", domain: "D13", source: ["S2", "S3"], grade: "explore",
    when: (o) => o.supportive === 0,
    text: (o, li) => tr(["No supportive line is recorded yet. Ask who this family turns to when things are hard — the answer usually exists.", "지지 관계선이 아직 없습니다. 힘들 때 누구를 찾는지 물어보세요. 가족이 누구에게 기대고 도움을 받는지 알 수 있습니다.", "尚未記錄支持線。請詢問困難時這個家庭會找誰 — 通常是有答案的。"], li) },

  // ── D14 · 정보의 품질과 면담·해석 윤리 ────────────────────────────
  { id: "R42", domain: "D14", source: ["S1", "S3"], grade: "observed",
    when: (o) => o.missing.birth > 0 || o.missing.marriage > 0 || o.missing.noBond > 0 || o.missing.household,
    text: (o, li) => { const gaps = [];
      if (o.missing.birth) gaps.push(tr(["{n} without a birth year", "출생연도 없는 인물 {n}명", "{n} 人無出生年"], li).replace("{n}", o.missing.birth));
      if (o.missing.marriage) gaps.push(tr(["{n} partnership(s) without a year", "연도 없는 관계 {n}건", "{n} 段關係無年份"], li).replace("{n}", o.missing.marriage));
      if (o.missing.noBond) gaps.push(tr(["{n} with no relationship line", "관계선이 없는 인물 {n}명", "{n} 人無關係線"], li).replace("{n}", o.missing.noBond));
      if (o.missing.household) gaps.push(tr(["no household marked", "가구 표시 없음", "未標示家戶"], li));
      return tr(["Gaps in the record: {x}. What is missing shapes the reading as much as what is present.", "기록의 빈자리 — {x}. 없는 것은 있는 것만큼이나 해석을 좌우합니다.", "記錄的空缺：{x}。缺少的部分與存在的部分同等左右詮釋。"], li).replace("{x}", gaps.join(", ")); } },
  { id: "R43", domain: "D14", source: ["S1", "S3"], grade: "withheld",
    when: () => true,
    text: (o, li) => tr(["Everything above is a provisional hypothesis for a professional to weigh with the family, not a finding about them.", "아래 내용은 가족을 판정한 결과가 아닙니다. 전문가와 가족이 함께 확인해 볼 가설입니다.", "以上皆為供專業人員與家庭共同斟酌的暫定假設，而非對其所下的判定。"], li) },
];

/* domainId가 실제로 인용하는 자료 — RULES에서 동적으로 모은다.
   더 이상 도메인마다 손으로 적어 둔 src 문자열을 유지할 필요가 없다. */
function domainSources(domainId) {
  const set = new Set();
  RULES.filter((r) => r.domain === domainId).forEach((r) => r.source.forEach((s) => set.add(s)));
  return [...set].sort().join("·");
}

/* domainId에 속한 규칙 중 지금 이 가계도에서 조건을 만족하는 것만 골라
   실행한다. 결과에는 규칙 id가 그대로 남아, 보고서 문장이 어느 규칙에서
   나왔는지 항상 되짚을 수 있다. */
function runDomain(domainId, o, li) {
  return RULES.filter((r) => r.domain === domainId && r.when(o))
    .map((r) => ({ id: r.id, source: r.source.join("·"), grade: r.grade, t: r.text(o, li) }));
}

/* ══════════════════════════════════════════════════════════════════
   면담 질문 가이드 — 상담사가 제공한 "가계도 구성을 위한 면담 질문"
   원문에는 강점·규칙·상징·유산 항목이 여러 절에 걸쳐 되풀이되어 있어,
   여기서는 겹치는 것을 하나로 모아 정리했다. 그림을 그리며 옆에 두고
   참고하는 자료이므로, 처음 열었을 때는 범주 제목만 보이고 필요한
   범주만 펼쳐서 본다.                                                */
const IV_CATS = [
  {
    id: "basic",
    title: ["General information", "기본 정보", "基本資訊"],
    items: [
      { q: ["Family members — names, birth dates, and gender", "가족 구성원 — 이름·출생일·성별", "家庭成員 — 姓名、出生日期、性別"],
        why: ["The foundation for the chart's basic structure.", "가계도의 기본 구조를 세우는 토대입니다.", "建構家系圖基本結構的基礎。"] },
      { q: ["Marriage and divorce — when, and any divorces along the way", "부모(조부모)의 결혼 시기와 이혼 경험", "父母（祖父母）的結婚時間與離婚經驗"],
        why: ["Marital events reshape family dynamics; timing matters.", "혼인 사건은 가족 역동을 바꾸며, 그 시점이 중요합니다.", "婚姻事件重塑家庭動力，時間點至關重要。"] },
      { q: ["Birth order and the age gap between siblings", "형제자매 사이의 출생 순서와 나이 차이", "手足間的出生順序與年齡差距"],
        why: ["Birth order shapes role and personality.", "출생 순서는 역할과 성격 형성에 영향을 줍니다.", "出生順序影響角色與性格形成。"] },
      { q: ["Where the family has lived, past and present", "가족이 과거와 현재에 살아온 곳", "家庭過去與現在的居住地"],
        why: ["Residence history hints at socioeconomic and cultural context.", "거주 이력은 사회경제적·문화적 맥락의 단서가 됩니다.", "居住歷史透露社會經濟與文化脈絡。"] },
      { q: ["Occupation and education of family members", "가족 구성원의 직업과 학력", "家庭成員的職業與學歷"],
        why: ["Reveals social class and each person's role.", "사회적 계층과 각자의 역할을 이해하게 합니다.", "有助理解社會階層與各成員角色。"] },
      { q: ["Religious affiliation and how actively it's practised", "종교와 신앙생활의 활발한 정도", "宗教信仰及其實踐程度"],
        why: ["Religion shapes values and can be a source of support or conflict.", "종교는 가치관을 형성하며 지지나 갈등의 원천이 됩니다.", "宗教形塑價值觀，可能是支持或衝突的來源。"] },
      { q: ["Pets the family has had", "가족이 길러 온 반려동물", "家庭飼養過的寵物"],
        why: ["Pets often carry real emotional attachment within the family.", "반려동물은 가족 안의 정서적 유대를 보여 줍니다.", "寵物往往承載家庭中真實的情感依附。"] },
    ],
  },
  {
    id: "relations",
    title: ["Family relationships", "가족 관계", "家庭關係"],
    items: [
      { q: ["The relationship between the parents — communication and conflict style", "부모 사이의 관계, 의사소통과 갈등 방식", "父母之間的關係、溝通與衝突方式"],
        why: ["Parental interaction shapes a child's emotional development.", "부모의 상호작용은 자녀의 정서 발달에 큰 영향을 줍니다.", "父母互動深深影響子女的情緒發展。"] },
      { q: ["A moment of feeling closest to a parent", "부모와 가장 가까웠던 순간", "與父母最親近的時刻"],
        why: ["Closeness reveals the quality of attachment.", "친밀함의 순간은 애착의 질을 보여 줍니다.", "親近的時刻反映依附的品質。"] },
      { q: ["A most cherished memory with a parent", "부모와의 가장 소중한 기억", "與父母最珍貴的回憶"],
        why: ["Positive memories point to relational strengths.", "긍정적 기억은 관계의 강점을 가리킵니다.", "正向回憶指出關係中的優勢。"] },
      { q: ["Praise, criticism, or reprimand received from parents", "부모에게 받은 칭찬·비판·꾸중", "從父母那裡得到的稱讚、批評或責備"],
        why: ["Shapes self-esteem and reflects parenting style.", "자존감 형성에 영향을 주며 양육 방식을 반영합니다.", "影響自尊，也反映教養方式。"] },
      { q: ["Witnessing parents argue, and how that felt", "부모의 다툼을 지켜본 경험과 그때의 감정", "目睹父母爭吵的經驗及當時的感受"],
        why: ["Exposure to conflict can leave anxiety, fear, or guilt.", "갈등을 지켜본 경험은 불안·두려움·죄책감을 남길 수 있습니다.", "目睹衝突可能留下焦慮、恐懼或罪惡感。"] },
      { q: ["The role taken during parental conflict — mediator, avoider, observer", "부모의 다툼에서 자신이 맡았던 역할 — 중재자·회피자·관찰자", "在父母衝突中所扮演的角色 — 調解者、迴避者、旁觀者"],
        why: ["Reveals coping style and an internalised family role.", "대처 방식과 내면화된 가족 역할을 보여 줍니다.", "揭示因應方式與內化的家庭角色。"] },
      { q: ["How relationships among family members would be described", "가족 구성원 사이의 관계를 어떻게 표현할지", "如何描述家庭成員之間的關係"],
        why: ["A direct read of the family's emotional dynamics.", "가족의 정서적 역동을 직접적으로 보여 줍니다.", "直接呈現家庭的情緒動力。"] },
      { q: ["Who feels closest, who feels most distant, and when the distance began", "가장 가깝게 느끼는 사람과 가장 먼 사람, 그 거리가 시작된 시점", "感覺最親近與最疏遠的人，以及疏遠開始的時間點"],
        why: ["Emotional proximity maps patterns of intimacy and boundary.", "정서적 거리는 친밀함과 경계의 패턴을 보여 줍니다.", "情感距離映照出親密與界線的模式。"] },
      { q: ["Ever feeling caught between two family members in conflict — a messenger or buffer", "두 사람의 갈등 사이에 낀 경험 — 전달자나 완충 역할", "曾被夾在兩人衝突之間 — 擔任傳話者或緩衝角色"],
        why: ["A direct question about triangulation.", "삼각관계를 직접 묻는 질문입니다.", "直接詢問三角關係的問題。"] },
      { q: ["Roles family members play — scapegoat, hero, lost child", "가족 구성원이 맡은 역할 — 희생양·영웅·잃어버린 아이", "家庭成員扮演的角色 — 代罪羔羊、英雄、迷失的孩子"],
        why: ["Role imbalance can point to dysfunction.", "역할의 불균형은 역기능의 단서가 될 수 있습니다.", "角色失衡可能是失功能的線索。"] },
      { q: ["Parents' parenting style in childhood", "어린 시절 부모의 양육 방식", "童年時期父母的教養方式"],
        why: ["Shapes emotional development and resilience.", "정서 발달과 회복력 형성에 영향을 줍니다.", "影響情緒發展與復原力。"] },
      { q: ["The general atmosphere of home during childhood", "어린 시절 가정의 전반적인 분위기", "童年時期家庭的整體氛圍"],
        why: ["Home climate strongly affects psychological wellbeing.", "가정의 정서적 분위기는 심리적 안녕에 큰 영향을 줍니다.", "家庭氛圍深刻影響心理健康。"] },
      { q: ["Attachment to parents — secure, anxious, distant, or over-involved", "부모와의 애착 유형 — 안정·불안·거리감·과잉 개입", "與父母的依附型態 — 安全、焦慮、疏離或過度涉入"],
        why: ["Early attachment shapes emotional regulation for life.", "초기 애착은 평생의 정서 조절 방식을 형성합니다.", "早期依附形塑一生的情緒調節方式。"] },
      { q: ["How one's own personality would be described", "자신의 성격을 어떻게 표현할지", "如何描述自己的性格"],
        why: ["Personality shapes both individual and family interaction.", "성격은 개인 및 가족 상호작용 모두에 영향을 줍니다.", "性格影響個人與家庭互動。"] },
      { q: ["Personal strengths and weaknesses", "자신이 생각하는 강점과 약점", "自己認為的優點與缺點"],
        why: ["Reflection clarifies one's role within the family system.", "성찰은 가족체계 안에서 자신의 역할을 분명히 합니다.", "反思有助於釐清在家庭系統中的角色。"] },
    ],
  },
  {
    id: "comm",
    title: ["Communication and interaction", "의사소통과 상호작용", "溝通與互動"],
    items: [
      { q: ["How often family members talk, and about what", "가족이 대화하는 빈도와 주제", "家庭成員交談的頻率與話題"],
        why: ["Frequency is a key marker of emotional connection.", "대화 빈도는 정서적 연결의 핵심 지표입니다.", "交談頻率是情感連結的關鍵指標。"] },
      { q: ["The family's usual way of communicating — in person, text, phone", "가족의 주된 소통 방식 — 대면·문자·전화", "家庭主要的溝通方式 — 面對面、簡訊、電話"],
        why: ["Reveals relational preference and generational difference.", "관계 선호와 세대 차이를 드러냅니다.", "顯示關係偏好與世代差異。"] },
      { q: ["How conflict is handled in conversation — compromise, silence, raised voices", "갈등이 대화에서 다뤄지는 방식 — 타협·침묵·언성", "衝突在對話中如何被處理 — 妥協、沉默、提高音量"],
        why: ["Conflict style reflects emotional regulation ability.", "갈등 방식은 정서 조절 능력을 반영합니다.", "衝突方式反映情緒調節能力。"] },
      { q: ["Whether family members share secrets, and what kind", "가족이 서로 비밀을 나누는지, 어떤 비밀인지", "家庭成員是否彼此分享祕密，是什麼樣的祕密"],
        why: ["Secrecy can build trust or blur boundaries.", "비밀은 신뢰를 쌓기도, 경계를 흐리기도 합니다.", "祕密可能建立信任，也可能模糊界線。"] },
      { q: ["The emotional tone of family conversation — open, controlling, critical", "가족 대화의 정서적 톤 — 개방적·통제적·비판적", "家庭對話的情緒基調 — 開放、控制、批判"],
        why: ["Conversational climate shapes psychological safety.", "대화의 분위기는 심리적 안전감을 좌우합니다.", "對話氛圍影響心理安全感。"] },
      { q: ["Participation in family gatherings — birthdays, holidays", "가족 행사 참여 정도 — 생일·명절", "參與家庭聚會的程度 — 生日、節慶"],
        why: ["Ritual participation reflects a sense of belonging.", "의례 참여는 소속감을 반영합니다.", "參與儀式反映歸屬感。"] },
    ],
  },
  {
    id: "events",
    title: ["Significant events", "중요한 사건과 경험", "重大事件與經歷"],
    items: [
      { q: ["Major life events that shaped the family — marriage, divorce, death, relocation", "가족을 만들어 온 주요 사건 — 결혼·이혼·죽음·이주", "形塑家庭的重大事件 — 結婚、離婚、死亡、遷居"],
        why: ["Transitions leave lasting marks on family dynamics.", "생애 전환은 가족 역동에 지속적인 흔적을 남깁니다.", "生命轉換在家庭動力上留下持久印記。"] },
      { q: ["Any experience of trauma, and its ripple into the next generation", "트라우마 경험과 그것이 다음 세대로 이어졌는지", "創傷經驗及其是否延續至下一代"],
        why: ["Trauma can have intergenerational psychological effects.", "트라우마는 세대를 넘어 심리적 영향을 미칠 수 있습니다.", "創傷可能產生跨世代的心理影響。"] },
      { q: ["A history of serious illness in the family", "가족의 심각한 질병 이력", "家族中嚴重疾病的病史"],
        why: ["Supports awareness of hereditary and environmental risk.", "유전적·환경적 위험을 인식하는 데 도움이 됩니다.", "有助於認識遺傳與環境風險。"] },
      { q: ["Mental health challenges within the family", "가족의 정신건강 어려움", "家族中的心理健康困難"],
        why: ["Affects both individual functioning and family pattern.", "개인 기능과 가족 패턴 모두에 영향을 줍니다.", "同時影響個人功能與家庭模式。"] },
      { q: ["Addiction within the family — alcohol, drugs, gambling", "가족의 중독 문제 — 술·약물·도박", "家族中的成癮問題 — 酒精、藥物、賭博"],
        why: ["Addiction can severely disrupt family relationships.", "중독은 가족관계를 심각하게 무너뜨릴 수 있습니다.", "成癮可能嚴重破壞家庭關係。"] },
    ],
  },
  {
    id: "personal",
    title: ["Personal experience and emotion", "개인적 경험과 감정", "個人經歷與情感"],
    items: [
      { q: ["The most memorable positive and negative experiences in the family", "가족 안에서 가장 기억에 남는 긍정적·부정적 경험", "家庭中最難忘的正面與負面經驗"],
        why: ["Personal experience shapes personality and emotional growth.", "개인적 경험은 성격과 정서 발달에 영향을 줍니다.", "個人經歷影響性格與情緒成長。"] },
      { q: ["The emotion felt toward each family member — love, anger, resentment", "각 가족 구성원에게 느끼는 감정 — 사랑·분노·서운함", "對每位家庭成員的感受 — 愛、憤怒、怨懟"],
        why: ["Offers direct clues to relational dynamics.", "관계 역동을 이해하는 직접적인 단서가 됩니다.", "提供理解關係動力的直接線索。"] },
      { q: ["How relationships with family have changed over time", "가족과의 관계가 시간이 지나며 어떻게 달라졌는지", "與家人的關係隨時間如何改變"],
        why: ["Relationships are dynamic; change points to current issues.", "관계는 변화하며, 그 변화는 현재의 쟁점을 가리킵니다.", "關係是動態的，其變化指向當前的議題。"] },
      { q: ["What is hoped for from the family — more support, understanding", "가족에게 바라는 것 — 더 많은 지지와 이해", "對家庭的期望 — 更多支持與理解"],
        why: ["Clarifying hopes helps set goals for the work ahead.", "바라는 바를 분명히 하면 상담 목표를 세우는 데 도움이 됩니다.", "釐清期望有助於設定後續目標。"] },
      { q: ["What is hoped for from working with a genogram", "가계도 작업을 통해 얻고자 하는 것", "希望透過家系圖工作獲得什麼"],
        why: ["Defining purpose guides analysis and interpretation.", "목적을 분명히 하면 분석과 해석의 방향이 잡힙니다.", "明確目的有助於引導分析與詮釋。"] },
      { q: ["An object or place that symbolises the family", "가족을 상징하는 물건이나 장소", "象徵家庭的物品或地點"],
        why: ["Symbols carry meaning and reflect family history.", "상징은 의미를 담고 가족의 역사를 비춥니다.", "象徵承載意義，映照家族歷史。"] },
      { q: ["An experience of reconciling with a family member", "가족 구성원과 화해했던 경험", "與家人和解的經驗"],
        why: ["Reconciliation shows the family's capacity for repair.", "화해의 경험은 가족의 회복 능력을 보여 줍니다.", "和解經驗顯示家庭的修復能力。"] },
      { q: ["Goals or dreams the family hopes to achieve together", "가족이 함께 이루고 싶은 목표나 꿈", "家庭希望共同達成的目標或夢想"],
        why: ["Shared goals can unify and motivate a family.", "공유된 목표는 가족을 하나로 모으는 힘이 됩니다.", "共同目標能凝聚並激勵家庭。"] },
      { q: ["What legacy — material or emotional — one hopes to leave", "남기고 싶은 유산 — 물질적·정서적", "希望留下的傳承 — 物質或情感層面"],
        why: ["A legacy carries values into the next generation.", "유산은 다음 세대로 가치를 전합니다.", "傳承將價值觀帶入下一代。"] },
      { q: ["Rules or taboos in the family — what may not be said or done", "가족의 규칙이나 금기 — 해서는 안 되는 말이나 행동", "家庭的規則或禁忌 — 不能說或不能做的事"],
        why: ["Family rules regulate behaviour and maintain order.", "가족규칙은 행동을 규제하고 질서를 유지합니다.", "家庭規則規範行為並維持秩序。"] },
      { q: ["Rituals the family keeps — birthdays, holidays, trips", "가족이 지켜 온 의례 — 생일·명절·여행", "家庭遵循的儀式 — 生日、節慶、旅行"],
        why: ["Rituals strengthen bonds and a sense of belonging.", "의례는 유대와 소속감을 강화합니다.", "儀式強化情感連結與歸屬感。"] },
      { q: ["Beliefs or stories passed down as family myth", "대대로 전해지는 가족의 이야기나 믿음", "代代相傳的家族故事或信念"],
        why: ["Family myths shape identity and relational pattern.", "가족의 이야기는 정체성과 관계 패턴을 만듭니다.", "家族故事形塑身分認同與關係模式。"] },
    ],
  },
  {
    id: "strengths",
    title: ["Strengths and resources", "강점과 자원", "優勢與資源"],
    items: [
      { q: ["The family's greatest strength", "이 가족의 가장 큰 강점", "這個家庭最大的優勢"],
        why: ["Naming strengths fosters resilience and pride.", "강점을 짚어 내는 것은 회복력과 자긍심을 키웁니다.", "指出優勢能培養復原力與自豪感。"] },
      { q: ["Challenges the family still needs to work through", "가족이 함께 풀어야 할 어려움", "家庭仍需共同面對的挑戰"],
        why: ["Naming a difficulty is the first step toward change.", "어려움을 짚는 것이 변화의 첫걸음입니다.", "指認困難是改變的第一步。"] },
      { q: ["Values or beliefs important to the family — education, harmony, success", "가족에게 중요한 가치나 신념 — 교육·화목·성공", "對家庭重要的價值觀或信念 — 教育、和諧、成功"],
        why: ["Values shape decisions and pass across generations.", "가치관은 의사결정을 이끌고 세대로 이어집니다.", "價值觀引導決策，並代代相傳。"] },
      { q: ["The family's economic background, past and present", "가족의 경제적 배경, 과거와 현재", "家庭的經濟背景，過去與現在"],
        why: ["Gives context for stress and stability.", "스트레스와 안정의 맥락을 이해하게 합니다.", "有助理解壓力與穩定的脈絡。"] },
      { q: ["The general health of family members", "가족 구성원의 전반적 건강 상태", "家庭成員的整體健康狀況"],
        why: ["Supports planning around hereditary risk and care.", "유전적 위험과 돌봄 계획에 도움이 됩니다.", "有助規劃遺傳風險與照護。"] },
      { q: ["Hobbies or talents family members enjoy or share", "가족이 함께 즐기는 취미나 재능", "家庭成員共同享受的興趣或才能"],
        why: ["Shared interests strengthen bonds.", "공유된 관심사는 유대를 강화합니다.", "共同的興趣強化情感連結。"] },
      { q: ["A family member once admired, or one not wished to become", "본받고 싶었던, 또는 닮고 싶지 않았던 가족 구성원", "曾經敬佩、或不想成為的家庭成員"],
        why: ["Role models shape values and life goals.", "역할 모델은 가치관과 삶의 목표를 형성합니다.", "榜樣形塑價值觀與人生目標。"] },
      { q: ["How conflict was typically resolved growing up", "성장 과정에서 갈등이 해결되던 방식", "成長過程中衝突通常如何被解決"],
        why: ["Conflict resolution style reflects emotional maturity.", "갈등 해결 방식은 정서적 성숙도를 보여 줍니다.", "衝突解決方式反映情緒成熟度。"] },
      { q: ["External support available to the family — relatives, community, counselling", "가족이 기댈 수 있는 외부 자원 — 친지·공동체·상담", "家庭可依靠的外部資源 — 親屬、社群、諮商服務"],
        why: ["Naming support systems opens access to real resources.", "지지체계를 확인하면 실제 자원에 닿을 수 있습니다.", "指認支持系統有助取得實際資源。"] },
    ],
  },
];

const CHECKS = [
  ["Three generations or more", "3세대 이상 포함", "涵蓋三代以上"],
  ["Index person marked", "본인(내담자) 표시", "標記案主"],
  ["Birth years recorded", "출생연도 기록", "記錄出生年"],
  ["Marriage and separation years recorded", "결혼·별거 연도 기록", "記錄結婚與分居年"],
  ["Relationship lines drawn", "관계선 표시", "已畫出關係線"],
  ["Households marked", "가구 표시", "已標示家戶"],
  ["Events, illnesses and migrations noted", "사건·질병·이주 메모", "記錄事件、疾病與遷徙"],
];
/* 각 질문 끝의 표는 그 질문이 어느 분석자료에서 온 것인지를 가리킨다. */
const QUESTIONS = [
  ["Which patterns repeat across the three generations?", "세 세대에서 무엇이 되풀이되고 있나요?", "哪些模式在三代之間重複出現？", "S1"],
  ["Who carries the family's anxiety, and through which triangle?", "가족이 불안해질 때 누가 그 불안을 가장 많이 떠안나요? 그 사람은 누구와 누구 사이에 끼어 있나요?", "誰承載家庭的焦慮？經由哪個三角關係？", "S1·S4"],
  ["Where are the cut-offs, and what happened just before each one?", "누구와 누구의 연락이 끊겼나요? 연락이 끊기기 전에는 무슨 일이 있었나요?", "斷絕出現在何處？其發生之前又發生了什麼？", "S1·S4"],
  ["What was happening in the family in the year the symptom began?", "증상이 시작된 해에 가족에게 무슨 일이 있었나요?", "症狀開始的那一年，家中正發生什麼？", "S1·S2"],
  ["Which strengths and resources has this family already used?", "이 가족의 강점은 무엇인가요? 힘들 때 누구에게 도움을 청하나요?", "這個家庭已經運用過哪些優勢與資源？", "S2·S3"],
  ["What would change if one person stepped out of the triangle?", "삼각관계에서 한 사람이 빠지면 남은 두 사람은 어떻게 달라질까요?", "若有一人退出三角關係，會有什麼改變？", "S2·S4"],
  /* S3 — 면접을 통한 사정기법 */
  ["When did the problem begin, and how often does it happen?", "문제는 언제 시작됐나요? 얼마나 자주 일어나나요?", "問題何時開始？多久發生一次？", "S3"],
  ["What has the family already tried, and what did each attempt change?", "가족은 지금까지 어떤 방법을 써 봤나요? 그때 무엇이 달라졌나요?", "家庭已嘗試過什麼？每次嘗試改變了什麼？", "S3"],
  ["Who wants change the most, and who has the least room to move?", "지금 가장 변화를 바라는 사람은 누구인가요? 움직이기 가장 어려운 사람은 누구인가요?", "誰最想改變？誰的迴旋空間最小？", "S3"],
  ["Who is closest to whom, and who is left outside?", "누가 누구와 가장 가까운가요? 가족 안에서 혼자 떨어져 있는 사람은 누구인가요?", "誰與誰最親近？誰被排除在外？", "S3"],
  ["Whose opinion settles a decision in this family?", "이 가족에서는 누가 마지막 결정을 내리나요?", "在這個家庭中，誰的意見能定案？", "S3"],
  ["Which family rules are still in force, and which could be revised?", "가족이 지금도 지키는 규칙은 무엇인가요? 그중 바꿀 수 있는 규칙은 무엇인가요?", "哪些家庭規則仍在運作？其中哪些可以修改？", "S3"],
  ["What does this family treat as a secret, and who keeps it?", "가족이 숨기고 있는 일은 무엇인가요? 누가 그 비밀을 지키고 있나요?", "這個家庭把什麼當作祕密？由誰守著？", "S3"],
  /* S4 — 보웬의 여덟 개념 */
  ["Where does this family sit between togetherness and individuality?", "가족은 서로 얼마나 가까이 지내나요? 각자는 자기 생각을 얼마나 편하게 말하고 행동할 수 있나요?", "這個家庭位於一體性與個體性之間的何處？", "S4"],
  ["Which child received the most of the family projection process?", "부모는 어느 자녀에게 걱정과 기대를 가장 많이 쏟나요?", "家庭投射最多指向哪一個子女？", "S4"],
  ["How does sibling position shape what each person expects of the others?", "첫째·둘째·막내라는 자리는 서로에게 무엇을 기대하게 하나요?", "手足位置如何形塑彼此的期待？", "S4"],
];
const ANALYSIS_SOURCES = [
  ["S1", "1. Genogram - MacGoldrick.docx", [
    "McGoldrick — Genograms: Mapping Family Systems. Core theory, construction, the genogram interview, tracking patterns through time, interpretation",
    "McGoldrick 『Genograms: Mapping Family Systems』 — 핵심 이론·작성법·가계도 면담·시간에 따른 패턴 추적·해석 원칙",
    "McGoldrick《Genograms: Mapping Family Systems》— 核心理論・繪製・家系圖訪談・時間軸模式追蹤・詮釋原則"]],
  ["S2", "가계도 책 최종본(5월 1일).docx", [
    "Understanding the Genogram — applied Korean framework, vertical and horizontal axes, cases, questions, change and recovery, reporting",
    "『가계도의 이해』 — 한국어 적용 틀·수직축과 수평축·사례·질문·변화와 회복·보고서 표현",
    "《家系圖的理解》— 韓語應用架構・縱軸與橫軸・案例・提問・改變與復原・報告書寫"]],
  ["S3", "7-1. 부부 및 가족사정 (김영희)", [
    "Couple and family assessment — hypothesis building, interview technique, observation technique, genogram and family-of-origin chart as assessment tools",
    "「부부 및 가족사정」 — 가설 설정·면접 사정기법·관찰 사정기법·도구를 활용하는 사정(가계도·원가족도표)",
    "〈夫妻與家庭評估〉— 假設建立・訪談評估技法・觀察評估技法・工具評估（家系圖・原生家庭圖）"]],
  ["S4", "9. Family Therapy: An Overview (Goldenberg)", [
    "Goldenberg & Goldenberg — Bowen's approach: the eight interlocking concepts, the evaluation interview, the genogram, intervention technique",
    "Goldenberg & Goldenberg — 보웬 이론과 실제: 서로 맞물린 8개 개념·평가 면담·가계도·개입 기법",
    "Goldenberg & Goldenberg — Bowen 理論與實務：八個互鎖概念・評估訪談・家系圖・介入技法"]],
  ["S5", "질문지.docx — Interview Questions for Genogram Construction", [
    "A structured interview question set covering family structure, relational patterns, communication, significant events, and strengths, with the rationale for each question",
    "가계도 구성을 위한 면담 질문지 — 가족 구조·관계 패턴·의사소통·중요한 사건·강점을 아우르는 질문과 각 질문의 취지",
    "家系圖建構訪談問卷 — 涵蓋家庭結構、關係模式、溝通、重大事件與優勢的提問及其用意"]],
  ["S6", "The Genogram Casebook: A Clinical Companion to Genograms (McGoldrick, 2016)", [
    "A clinical companion to the genogram — introducing genograms to clients, resistance, fusion and cutoff, triangles and detriangling, legacies of loss, couples, family play genograms, siblings, the therapist's own family",
    "McGoldrick의 가계도 임상 안내서 — 내담자에게 가계도 소개·가계도에 대한 저항·융합과 단절·삼각관계와 탈삼각화·상실의 유산과 애도·부부·아동 가족놀이 가계도·형제 문제·상담자 자신의 가족",
    "McGoldrick《家系圖個案手冊》— 向案主介紹家系圖・對家系圖的抗拒・融合與截斷・三角關係與去三角化・失落的遺產與哀悼・伴侶・兒童家庭遊戲家系圖・手足問題・治療者自身的家庭"]],
  ["S7", "가족심리상담사 과정 강의교안 (박인숙 교안 모음)", [
    "Twenty lecture sessions on family counselling — the family life cycle, the major schools (Bowen, structural, strategic, experiential, solution-focused …), Korean family culture and the counselling process. Used for the structural-therapy terms: subsystems, boundaries, and alignment (coalition versus alliance).",
    "가족상담 20차시 강의교안 — 가족주기, 주요 학파(보웬·구조적·전략적·경험적·해결중심 등), 한국 가족문화, 상담 과정. 구조적 가족치료의 하위체계·경계선·제휴(연합과 동맹의 구분)에 활용",
    "家族諮商 20 講教材 — 家庭週期、主要學派（鮑文、結構、策略、經驗、焦點解決等）、韓國家庭文化與諮商過程；用於結構式家族治療的次系統、界線、聯結（聯盟與結盟的區分）"]],
];

/* S4 — 보웬의 여덟 개념. 서로 맞물려 있어 하나만 떼어 읽지 않는다. */
const BOWEN_CONCEPTS = [
  ["Differentiation of self", "자아분화", "自我分化"],
  ["Triangles", "삼각관계", "三角關係"],
  ["Nuclear family emotional system", "핵가족 정서체계", "核心家庭情緒系統"],
  ["Family projection process", "가족투사 과정", "家庭投射歷程"],
  ["Emotional cutoff", "정서적 단절", "情緒截斷"],
  ["Multigenerational transmission process", "다세대 전수 과정", "多世代傳遞歷程"],
  ["Sibling position", "형제 순위", "手足位置"],
  ["Societal emotional process", "사회 정서과정", "社會情緒歷程"],
];

const bookFrag = (b) => (<>{b[0] ? `${b[0]}${/\.$/.test(b[0]) ? "" : "."} ` : ""}<i>{b[1]}</i>{b[2] ? `. ${b[2]}${/\.$/.test(b[2]) ? "" : "."}` : "."}</>);
const BOOKS = [
  ["McGoldrick, M., Gerson, R. & Petry, S.", "Genograms: Assessment and Intervention", "W. W. Norton"],
  ["McGoldrick, M.", "The Genogram Casebook: A Clinical Companion to Genograms", "W. W. Norton, 2016"],
  ["Friedman, H., Rohrbaugh, M. & Krakauer, S.", "The Time-Line Genogram: Highlighting Temporal Aspects of Family Relationships", "Family Process 27, 293–303, 1988"],
  ["Bowen, M.", "Family Therapy in Clinical Practice", "Jason Aronson, 1978"],
  ["Carter, B. & McGoldrick, M.", "The Expanded Family Life Cycle", "Allyn & Bacon"],
  ["McGoldrick, M. & Hardy, K. V.", "Re-Visioning Family Therapy: Race, Culture and Gender", "Guilford, 2008"],
  ["Minuchin, S.", "Families and Family Therapy", "Harvard University Press, 1974"],
  ["Goldenberg, I. & Goldenberg, H.", "Family Therapy: An Overview", "Cengage"],
  ["Duhl, F. J.", "The use of the chronological chart in general systems family therapy", "JMFT 7, 361–373, 1981"],
  ["Hartman, A.", "Diagrammatic assessment of family relationships", "Social Casework 59, 465–476, 1978"],
  ["Walsh, F.", "Strengthening Family Resilience", "Guilford"],
  ["황종철 Hwang, J.", "The Genogram Journey · 가계도 이해 워크북", "Family Communication"],
  /* 문화 렌즈·분석 자료로 올린 문헌. 서지 정보가 파일에 없는 것은 제목만 적는다. */
  ["김미애", "가족치료에서의 가계도 활용에 대한 사례연구: Bowen 이론을 중심으로", "한국심리학회 학술대회 자료집 2006(1), 484–485, 2006"],
  ["정태연", "한국사회의 집단주의적 성격에 대한 역사·문화적 분석", "한국심리학회지: 사회 및 성격 24(3), 53–76, 2010"],
  ["Dommaraju, P. & Wong, S.", "Transition to First Marriage in Thailand: Cohort and Educational Changes", "Journal of Population Research, 2023, doi:10.1007/s12546-023-09302-1"],
  ["Klasen, S., Lechtenfeld, T. & Povel, F.", "What about the Women? Female Headship, Poverty and Vulnerability in Thailand and Vietnam", "Discussion Papers No. 76, Courant Research Centre PEG, Georg-August-Universität Göttingen, 2011"],
  ["Wongmonta, S.", "Consumption Insurance and Household Vulnerability: Evidence from Thailand", "Southeast Asian Journal of Economics 7(1), 2019"],
  ["East-West Population Institute", "Households and Their Characteristics in the Kingdom of Thailand: Projections from 1980 to 2015 Using HOMES (HOMES Research Report No. 1)", "East-West Center, Honolulu"],
  ["Hasanzadeh, S.", "Factors of Family Strengthening in Islamic Culture [عوامل تحکیم خانواده در فرهنگ اسلامی]", "Allameh Tabataba'i University, Tehran (in Persian)"],
  ["", "The Japanese Family System: Change, Continuity, and Regionality over the Twentieth Century (번역본)", ""],
  ["", "일본의 가족 구조 (완성본)", ""],
  ["", "일본 3. 일본의 가족구조 — 신탁 가족 구조 유형", ""],
  ["", "태국 가족학 연구", ""],
  ["", "한국 가족의 유교적 특징과 신탁 가족 구조의 비교 요약", ""],
  ["", "가족심리상담사 과정 강의교안 (박인숙 교안 모음, 20차시)", ""],
];

/* ══════════════════════════════════════════════════════════════════
   펜으로 덧쓰기 — 아이패드 애플 펜슬, 화이트보드의 형광펜처럼

   다 그린 가계도 위에 색을 얹어 가며 읽는 방식은 상담실에서 이미 하던
   일이다. 그것을 화면에서도 하도록 덧쓰기 층을 하나 얹었다.

   손바닥이 눌려도 선이 그어지지 않아야 한다. 아이패드 Safari는 애플
   펜슬을 pointerType "pen"으로, 손가락과 손바닥을 "touch"로 넘겨준다.
   그래서 펜 모드에서는 "pen"만 받고 "touch"는 흘려보낸다. 그러면 손을
   화면에 얹고 편하게 그릴 수 있고, 손가락으로는 그대로 화면을 밀어
   옮길 수 있다. 마우스로도 그릴 수 있게 "mouse"는 함께 받는다.

   필압(e.pressure)은 굵기에 반영한다. 애플 펜슬은 0~1 사이로 들어오고,
   필압을 못 주는 기기는 0.5로 들어오므로 그 경우 굵기가 일정해진다. */
const INK_COLORS = [
  { id: "yellow", label: ["Yellow", "노랑", "黃"], c: "#F2C230" },
  { id: "pink", label: ["Pink", "분홍", "粉紅"], c: "#E4557F" },
  { id: "green", label: ["Green", "초록", "綠"], c: "#3FA66B" },
  { id: "blue", label: ["Blue", "파랑", "藍"], c: "#3B82C4" },
  { id: "ink", label: ["Ink", "먹", "墨"], c: "#1F2937" },
  { id: "red", label: ["Red", "빨강", "紅"], c: "#D14836" },
];

/* 점을 부드러운 곡선으로 잇는다. 점을 그대로 직선으로 이으면
   펜슬로 그은 선이 각져 보인다. */
function inkPath(pts) {
  if (!pts.length) return "";
  if (pts.length < 3) return `M ${pts.map((q) => `${q[0]} ${q[1]}`).join(" L ")}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}

/* 한 줄에 담을 글자 수. 가계도 위에 얹는 메모라 너무 길게 늘어지면
   기호와 관계선을 가린다. 한글은 글자가 넓어 영문보다 적게 끊는다. */
const NOTE_WRAP = 18;
/* 줄마다 그 줄의 글자에 맞춰 줄을 바꾼다. 한글 줄은 좁게, 영어 줄은 넓게 — 전체를 한 기준으로 자르면
   한글이 섞인 박스에서 영어가 몇 글자마다 끊겨 보기 어렵다. */
const noteLines = text => {
  return String(text||"").replace(/\u200B/g,"").split('\n').flatMap(line=>{
    const n=/[가-힣\u3400-\u9fff]/.test(line) ? NOTE_WRAP : /[\u1780-\u17FF]/.test(line) ? 20 : /[\u0E00-\u0E7F]/.test(line) ? 28 : Math.round(NOTE_WRAP*1.7);
    const w=wrapText(line,n); return w.length?w:[""];
  });
};
function noteBounds(n) {
  const size=n.size||12, lines=noteLines(n.text);
  const widthOf=line=>(TK_RE.test(line)?graphemes(line):[...line]).reduce((sum,ch)=>sum+(/[가-힣\u3400-\u9fff]/.test(ch)?1:/[\u1780-\u17FF]/.test(ch)?.85:/[\u0E00-\u0E7F]/.test(ch)?.65:.62)*size,0);
  const width=Math.max(64,...lines.map(widthOf))+24;
  const steps=lines.map(line=>TK_RE.test(line)?1.75:1.4);          // 태국어·크메르어 줄은 부호가 쌓이므로 줄 간격을 넓힌다
  const height=(steps.length?steps.reduce((a,b)=>a+b,0):1.4)*size+18;
  return {x:n.x-12,y:n.y-size-10,w:width,h:height,lines,size,steps};
}
function unionAnchor(doc,id,t=.5,detail=true) {
  const u=doc.unions.find(v=>v.id===id);if(!u)return null;
  const a=doc.people.find(p=>p.id===u.a),b=doc.people.find(p=>p.id===u.b);if(!a||!b)return null;
  /* 층 계산은 화면에 실제로 그리는 규칙(unionLevel)과 같아야 한다.
     다르면 설명 박스나 관계선이 선에서 비껴 붙는다. */
  const pos=Object.fromEntries(doc.people.map(p=>[p.id,p.y]));
  const posX=Object.fromEntries(doc.people.map(p=>[p.id,p.x]));
  const levels={},placed=[];
  const ordered=[...doc.unions].sort((u1,u2)=>
    Math.max(pos[u1.a]??0,pos[u1.b]??0)-Math.max(pos[u2.a]??0,pos[u2.b]??0));
  ordered.forEach(v=>{
    const base=Math.max(pos[v.a]??0,pos[v.b]??0);
    const vx1=posX[v.a]??0,vx2=posX[v.b]??0;
    const lo=Math.min(vx1,vx2),hi=Math.max(vx1,vx2);
    let k=0;
    for(let guard=0;guard<12;guard++){
      const clash=placed.some(e=>e.lvl===k&&Math.abs(e.base-base)<30
        &&(e.a===v.a||e.a===v.b||e.b===v.a||e.b===v.b||(lo<e.hi+24&&hi>e.lo-24)));
      if(!clash)break;
      k+=1;
    }
    levels[v.id]=k;
    placed.push({base,lvl:k,lo,hi,a:v.a,b:v.b});
  });
  return {x:a.x+(b.x-a.x)*t,y:Math.max(a.y+personClearance(a,detail),b.y+personClearance(b,detail))+(levels[id]||0)*34};
}
/* 설명 박스 하나에 연결선이 여럿일 수 있다. 한 사건이 부부와
   자녀에게 동시에 걸리는 일은 흔하다. anchor는 첫 연결(예전
   자료와의 호환), anchors는 그 뒤에 더한 것들이다. */
const noteAnchorList=n=>[n.anchor,...(n.anchors||[])].filter(Boolean);
function resolveNoteAnchor(note,doc,detail=true,override=null) {
  const a=override||note.anchor;if(!a)return null;
  const rect=noteBounds(note),centre={x:rect.x+rect.w/2,y:rect.y+rect.h/2};
  if(a.kind==='person'){
    const p=doc.people.find(p=>p.id===a.id);
    if(p){
      /* 설명 박스가 여러 개 한 사람에 몰리면, 저마다 그 사람 쪽으로
         가장 가까운 자리를 잡으려 하다 보니 연결선이 한 점에서 겹쳐
         나왔다. 몰려 있는 박스끼리는 각도를 최소 간격만큼 벌려서,
         선이 사람 둘레에 부채처럼 펼쳐지게 한다. */
      const sibs=(doc.notes||[]).filter(n2=>n2.anchor?.kind==='person'&&n2.anchor.id===p.id);
      if(sibs.length>1){
        const angleOf=n2=>{const r=n2.id===note.id?rect:noteBounds(n2);return Math.atan2((r.y+r.h/2)-p.y,(r.x+r.w/2)-p.x);};
        const withAngles=sibs.map(n2=>({id:n2.id,ang:angleOf(n2)})).sort((x,y)=>x.ang-y.ang);
        const MIN_GAP=0.34;
        for(let i=1;i<withAngles.length;i++){
          if(withAngles[i].ang-withAngles[i-1].ang<MIN_GAP) withAngles[i].ang=withAngles[i-1].ang+MIN_GAP;
        }
        const mine=withAngles.find(w=>w.id===note.id);
        const ang=mine?mine.ang:angleOf(note);
        const far={x:p.x+Math.cos(ang)*1000,y:p.y+Math.sin(ang)*1000};
        return edgePtShape(p,far,3);
      }
      return edgePtShape(p,centre,3);
    }
  }
  if(a.kind==='bond'){
    const bd=doc.bonds.find(b=>b.id===a.id);
    if(bd){const p=doc.people.find(p=>p.id===bd.a),q=doc.people.find(p=>p.id===bd.b);
      if(p&&q){const segs=sortedSegments(bd),i=Math.max(0,segs.findIndex(s=>s.id===a.seg));
        const g=bondSegmentGeometry(bd,p,q,doc.people,i,doc.bonds);
        return glyphPoint(BOND_TYPES[segs[i].type]||BOND_TYPES.harmony,g.p1,g.p2,g.bow,a.t??.5);}}
  }
  if(a.kind==='union'){const p=unionAnchor(doc,a.id,a.t??.5,detail);if(p)return p;}
  return Number.isFinite(a.x)&&Number.isFinite(a.y)?{x:a.x,y:a.y}:null;
}
function noteRoute(n,doc,detail=true,override=null) {
  const start=resolveNoteAnchor(n,doc,detail,override);if(!start)return null;
  const b=noteBounds(n),cx=b.x+b.w/2,cy=b.y+b.h/2,config=n.connector||{};
  let side=config.side||'auto';
  if(side==='auto')side=Math.abs(start.x-cx)/(b.w/2)>Math.abs(start.y-cy)/(b.h/2)?(start.x<cx?'left':'right'):(start.y<cy?'top':'bottom');
  const end={x:side==='left'?b.x-4:side==='right'?b.x+b.w+4:cx,y:side==='top'?b.y-4:side==='bottom'?b.y+b.h+4:cy};
  const horizontal=side==='left'||side==='right';
  const axis=config.axis==='auto'||!config.axis?(horizontal?'horizontal':'vertical'):config.axis;
  const inset=12;
  const pre={x:end.x+(side==='left'?-inset:side==='right'?inset:0),y:end.y+(side==='top'?-inset:side==='bottom'?inset:0)};
  const offset=Number(config.offset)||0;
  const mid=axis==='horizontal'?(start.x+pre.x)/2+offset:(start.y+pre.y)/2+offset;
  const pts=axis==='horizontal'?[start,{x:mid,y:start.y},{x:mid,y:pre.y},pre,end]:[start,{x:start.x,y:mid},{x:pre.x,y:mid},pre,end];
  const clean=pts.filter((p,i)=>i===0||Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y)>.01);
  const stemEnd={x:end.x+(side==='left'?-9:side==='right'?9:0),y:end.y+(side==='top'?-9:side==='bottom'?9:0)};
  const dx=(end.x-pre.x)/inset,dy=(end.y-pre.y)/inset;
  const d=clean.slice(0,-1).map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+` L ${stemEnd.x} ${stemEnd.y}`;
  const head=`M ${end.x} ${end.y} L ${stemEnd.x-dy*4.5} ${stemEnd.y+dx*4.5} L ${stemEnd.x+dy*4.5} ${stemEnd.y-dx*4.5} Z`;
  return {start,end,pre,axis,side,mid,points:clean,d,head,handle:axis==='horizontal'?{x:mid,y:(start.y+pre.y)/2}:{x:(start.x+pre.x)/2,y:mid}};
}
function pickNoteAnchor(point,doc,detail=true,threshold=16,vis=ALL_ON) {
  let best=null,distance=threshold;
  for(const p of doc.people){if(Math.hypot(point.x-p.x,point.y-p.y)<=rOf(p)+12)return {kind:'person',id:p.id,x:p.x,y:p.y};}
  if(vis.bond!==false)for(const bd of doc.bonds){
    const a=doc.people.find(p=>p.id===bd.a),b=doc.people.find(p=>p.id===bd.b);if(!a||!b)continue;
    sortedSegments(bd).forEach((sg,i)=>{const g=bondSegmentGeometry(bd,a,b,doc.people,i,doc.bonds);
      for(let k=0;k<=100;k++){const t=k/100,p=glyphPoint(BOND_TYPES[sg.type]||BOND_TYPES.harmony,g.p1,g.p2,g.bow,t),d=Math.hypot(point.x-p.x,point.y-p.y);
        if(d<distance){distance=d;best={kind:'bond',id:bd.id,seg:sg.id,t,x:p.x,y:p.y};}}
    });
  }
  for(const u of doc.unions){for(let k=0;k<=40;k++){const t=k/40,p=unionAnchor(doc,u.id,t,detail);if(!p)continue;
    const d=Math.hypot(point.x-p.x,point.y-p.y);if(d<distance){distance=d;best={kind:'union',id:u.id,t,x:p.x,y:p.y};}}}
  return best||{kind:'point',x:point.x,y:point.y};
}
function retainOrphanNotes(next,previous) {
  if(!(next.notes||[]).some(n=>noteAnchorList(n).length))return next;
  /* 연결 대상이 지워지면 그 연결만 '지정한 위치'로 굳힌다 —
     연결이 여럿이어도 나머지는 그대로 둔다. */
  const fix=(n,a)=>{
    if(!a||a.kind==='point')return a;
    const list=a.kind==='person'?next.people:a.kind==='bond'?next.bonds:next.unions;
    const target=list?.find(v=>v.id===a.id);
    const missing=!target||(a.kind==='bond'&&a.seg&&!sortedSegments(target).some(s=>s.id===a.seg));
    if(!missing)return a;
    const point=resolveNoteAnchor(n,previous,true,a);
    return point?{kind:'point',...point}:null;
  };
  return {...next,notes:next.notes.map(n=>({
    ...n,
    anchor:fix(n,n.anchor),
    anchors:(n.anchors||[]).map(a=>fix(n,a)).filter(Boolean),
  }))};
}
function NoteLayer({notes,doc,hideId,selected,detail=true,onDown,onEdit,onBend,vis=ALL_ON}) {
  return <g data-note-layer="true">
    {notes.filter(n=>n.id!==hideId).map(n=>{
      const b=noteBounds(n),isSelected=selected===n.id,col=n.color||T.ink2;
      /* 연결이 여럿이면 저마다 선을 낸다. 관계선에 붙은 연결은
         관계선 레이어를 끄면 함께 감춘다. */
      const routes=noteAnchorList(n)
        .filter(a=>a.kind!=='bond'||vis.bond!==false)
        .map((a,ai)=>({a,ai,r:noteRoute(n,doc,detail,a)}))
        .filter(x=>x.r);
      const r=routes[0]?.r||null;
      return <g key={n.id} data-note-id={n.id}>
        {routes.map(({r:rr,ai})=><g key={ai} pointerEvents="none">
          <path d={rr.d} fill="none" stroke={col} strokeWidth={1.6} strokeDasharray="6 4" strokeLinejoin="round"/>
          <circle cx={rr.start.x} cy={rr.start.y} r={3.5} fill="#fff" stroke={col} strokeWidth={1.8}/>
          <path d={rr.head} fill="#fff" stroke={col} strokeWidth={1.7} strokeLinejoin="round"/>
        </g>)}
        <g tabIndex={onDown?0:undefined} role={onDown?'button':undefined}
          aria-label={n.text} onPointerDown={e=>onDown?.(e,n)} onDoubleClick={e=>{e.stopPropagation();onEdit?.(n);}}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onEdit?.(n);}}}
          style={{cursor:onDown?'grab':'default',touchAction:'none'}} pointerEvents={onDown?'auto':'none'}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="#fff" fillOpacity={.97}
            stroke={isSelected?T.pine:col} strokeWidth={isSelected?2:1.2} strokeDasharray={isSelected?undefined:'5 3'}/>
          <text x={n.x} y={n.y} fontSize={b.size} fontFamily={FB} fontWeight={500} fill={col} pointerEvents="none">
            {b.lines.map((line,i)=><tspan key={i} x={n.x} dy={i?b.size*b.steps[i]:0}>{line}</tspan>)}
          </text>
        </g>
        {isSelected&&r&&onBend&&<g data-noprint="true" onPointerDown={e=>onBend(e,n,r)} style={{cursor:r.axis==='horizontal'?'ew-resize':'ns-resize'}}>
          <circle cx={r.handle.x} cy={r.handle.y} r={12} fill="transparent"/>
          <rect x={r.handle.x-5} y={r.handle.y-5} width={10} height={10} rx={2} fill="#fff" stroke={T.pine} strokeWidth={1.8}/>
        </g>}
      </g>;
    })}
  </g>;
}

function InkLayer({ strokes, live }) {
  const draw = (st, key) => (
    <path key={key} d={inkPath(st.pts)} fill="none" stroke={st.color}
      strokeWidth={st.w} strokeLinecap={st.hi&&st.inkStyle===2?'butt':'round'} strokeLinejoin="round"
      opacity={st.inkStyle===2?(st.hi?.28:1):(st.hi?.42:.95)}
      style={st.hi ? { mixBlendMode: "multiply" } : undefined} />
  );
  return (
    <g pointerEvents="none">
      {strokes.map((st, i) => draw(st, st.id || i))}
      {live && live.pts.length > 1 && draw(live, "live")}
    </g>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DeepL 번역 — Netlify 서버 함수를 통해 안전하게 호출한다
   API 키는 서버에만 있어 브라우저에 노출되지 않는다.

   언어 코드 매핑: 앱은 0(한)·1(영)·2(중), DeepL은 KO·EN·ZH
   DeepL Free는 중국어 간체(ZH)만 지원하므로 번체가 필요하면 후처리한다.
   ══════════════════════════════════════════════════════════════════ */
const DEEPL_LANG = ["KO", "EN", "ZH"];

async function deepl(texts, targetLi) {
  if (!texts || texts.every((t) => !t)) return texts;
  const target_lang = DEEPL_LANG[targetLi] || "EN";
  try {
    const resp = await fetch("/.netlify/functions/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target_lang }),
    });
    if (!resp.ok) return texts;
    const { translations } = await resp.json();
    return translations || texts;
  } catch { return texts; }
}

/* 단일 문자열 번역 — 빈 문자열은 API를 부르지 않는다 */
async function tr1(text, targetLi) {
  if (!text || !text.trim()) return text;
  const [result] = await deepl([text], targetLi);
  return result || text;
}

/* ══ 번역·음성 헬퍼 ═══════════════════════════════════════════════
   선생님과 내담자가 서로 다른 언어로 대화할 수 있게 한다.
   텍스트 번역(DeepL/GPT), 음성 인식(Whisper), 음성 출력(TTS)을
   Netlify 서버 함수를 통해 안전하게 호출한다.            */

const LANG_CODE  = ["ko", "zh", "en", "th", "km", "fr"];   // 기존 언어 번호를 유지하도록 프랑스어는 맨 뒤
const LANG_LABEL = ["한국어", "中文", "English", "ภาษาไทย", "ភាសាខ្មែរ", "Français"];
const DEEPL_CODE = ["KO", "ZH", "EN", "ID", "ID", "FR"];   // DeepL 코드 (태국·크메르 미지원 → 영어 대체)

/* GPT 번역 (DeepL 미지원 언어 포함) */
/* ── 통역판 함수 호출 ───────────────────────────────────────────────
   함수 주소는 누구나 부를 수 있고 요청은 내 API 키로 청구된다. 그래서 통역판 함수에는
   접근 코드(ACCESS_CODE)를 걸 수 있다. 코드가 걸려 있으면 401이 오므로 한 번 입력받아
   이 기기에 저장하고 다시 보낸다. 여러 요청이 동시에 401을 받아도 입력창은 한 번만 뜬다. */
let _codeAsk = null;
async function aiFetch(url, init = {}) {
  const send = () => {
    let code = "";
    try { code = localStorage.getItem("gs:code") || ""; } catch {}
    return fetch(url, { ...init, headers: { ...(init.headers || {}), ...(code ? { "x-access-code": code } : {}) } });
  };
  let resp = await send();
  if (resp.status !== 401) return resp;
  if (!_codeAsk) {
    _codeAsk = Promise.resolve()
      .then(() => (typeof window !== "undefined" && window.prompt ? window.prompt("접근 코드를 입력하세요 · Enter the access code") : null))
      .finally(() => { setTimeout(() => { _codeAsk = null; }, 0); });
  }
  const code = await _codeAsk;
  if (!code || !String(code).trim()) return resp;
  try { localStorage.setItem("gs:code", String(code).trim()); } catch {}
  resp = await send();
  if (resp.status === 401) { try { localStorage.removeItem("gs:code"); } catch {} }   // 틀린 코드는 지운다
  return resp;
}

/* 사용자마다 다른 접근 코드를 쓸 때(⚙ 사용자 코드 변경), 기기에 저장된 코드를 지우고 새 코드를 받는다.
   같은 기기를 여러 사람이 돌아가며 쓰는 경우를 위한 것 — 저장된 가계도나 다른 설정은 건드리지 않는다. */
async function changeUserCode() {
  try { localStorage.removeItem("gs:code"); } catch {}
  const code = typeof window !== "undefined" && window.prompt ? window.prompt("새 사용자 코드를 입력하세요 · Enter your access code") : null;
  if (!code || !String(code).trim()) return false;
  try { localStorage.setItem("gs:code", String(code).trim()); } catch {}
  return true;
}

/* ── 번역 등급 · 내 용어집 · 예열 · 응답 시간 ─────────────────────────────
   등급: 사용자에게는 [자동 | 일반 | 정밀]만 보이고, 실제 모델 이름은 서버가 정한다.
     일반 = 빠르고 저렴(기본 Terra) · 정밀 = 가장 정확(기본 Sol)
     자동 = 쓰는 '장면'으로 정한다 — 번역 띠·통역(실시간)은 일반, 글칸의 긴 글은 정밀.
   글 내용을 보고 판단하지 않는다: 어디서 부르는지는 앱이 이미 알고, 내용을 분류하려면 호출이 하나 더 든다. */
const TIER_KEY = "gs:tier";
const getTier = () => { try { const v = localStorage.getItem(TIER_KEY); return v === "auto" || v === "std" || v === "pro" ? v : "pro"; } catch { return "pro"; } };
const setTierPref = (v) => { try { localStorage.setItem(TIER_KEY, v); } catch {} };
const effTier = (use, pref = getTier()) => (pref === "auto" ? (use === "field" ? "pro" : "std") : pref);

/* 내 용어집 — ⚙에 '한국어 = 영어 = 中文' 한 줄씩. 비운 언어가 있어도 된다(둘 이상 있으면 됨). */
const GLOSS_KEY = "gs:glossary";
function parseGlossary(text) {
  return String(text || "").split(/\n/).map((ln) => ln.split(/\s*[=＝]\s*/).map((x) => x.trim()))
    .filter((p) => p.length >= 2 && p.length <= 3 && p.filter(Boolean).length >= 2).slice(0, 60);
}
const getUserGlossary = () => { try { return parseGlossary(localStorage.getItem(GLOSS_KEY) || ""); } catch { return []; } };

/* 예열 — 첫 문장이 함수 시작(콜드 스타트) 때문에 늦지 않게, 띠를 열 때 함수만 미리 깨운다.
   OpenAI를 부르지 않으므로 비용이 없고, 4분에 한 번만 보낸다. */
const _warmAt = {};
function warmUp(names) {
  names.forEach((n) => {
    if (Date.now() - (_warmAt[n] || 0) < 240000) return;
    _warmAt[n] = Date.now();
    try { fetch("/.netlify/functions/" + n, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warm: true }) }).catch(() => {}); } catch {}
  });
}
/* 마지막 번역의 모델과 걸린 시간 — 번역 띠에 작게 보여 준다(어디가 느린지, 모델이 내려갔는지 직접 확인) */
function reportMeta(m) { try { window.dispatchEvent(new CustomEvent("gs-trans-meta", { detail: m })); } catch {} }
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/* GPT에 넘기는 언어 이름. 중국어는 앱이 번체를 쓰므로 그렇게 못 박는다. */
const GPT_LANG = ["한국어", "繁體中文", "English", "ภาษาไทย", "ភាសាខ្មែរ", "Français"];

/* 번역 한 번. 실패하면 예외를 던진다 — 원문이 영어·중국어 칸에 들어가 버리지 않게 화면이 '실패'로 알린다.
   opts.use: "strip" | "interp" | "field"(자동 등급 판단용) · opts.tier: 등급을 직접 지정 · opts.silent: 시간 표시 안 함 */
async function gptTranslateRaw(text, fromLabel, toLabel, ctx = "", opts = {}) {
  const tier = opts.tier || effTier(opts.use || "strip");
  const gl = getUserGlossary();
  const t0 = nowMs();
  const resp = await aiFetch("/.netlify/functions/gpt-translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from: fromLabel, to: toLabel, context: ctx, tier, ...(gl.length ? { glossary: gl } : {}) }),
  });
  if (!resp.ok) throw new Error("gpt-translate " + resp.status);
  const data = await resp.json();
  if (!data.result) throw new Error("gpt-translate: empty result");
  const meta = { ms: Math.round(nowMs() - t0), sms: data.ms, model: data.model || "", tier: data.tier || tier, fast: !!data.fast };
  if (!opts.silent) reportMeta(meta);
  return { text: data.result, ...meta };
}
async function gptTranslateStrict(text, fromLabel, toLabel, ctx = "", opts = {}) {
  return (await gptTranslateRaw(text, fromLabel, toLabel, ctx, opts)).text;
}

/* DeepL 번역 (한·영·중 — 품질 최고) */
async function deeplTranslate(text, toLi) {
  if (!text) return text;
  const target = DEEPL_CODE[toLi];
  try {
    const resp = await fetch("/.netlify/functions/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text], target_lang: target }),
    });
    if (!resp.ok) return text;
    const { translations } = await resp.json();
    return translations?.[0] || text;
  } catch { return text; }
}

/* 음성 인식 — MediaRecorder로 녹음 후 Whisper로 전송 */
async function whisperSTT(blob, langCode) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  /* String.fromCharCode(...bytes)는 몇십 KB만 넘어도 스택이 넘쳐 긴 발화에서 실패했다 — 나눠서 변환한다 */
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  const resp = await aiFetch("/.netlify/functions/whisper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: b64, lang: langCode, mime: blob.type || "audio/webm" }),
  });
  if (!resp.ok) throw new Error("STT failed");
  const { text } = await resp.json();
  return text;
}

/* ── 문장 나누기 ─────────────────────────────────────────────────────
   글을 '끝난 문장'들과 '아직 쓰는 중인 조각'으로 가른다.
   문장의 끝: . ! ? … 뒤에 공백이 오거나 글이 끝날 때, 전각 。！？, 그리고 줄바꿈.
   숫자 사이의 점(4.5)은 뒤에 공백이 없으므로 자르지 않는다. */
function splitSentences(text) {
  const done = [];
  let tail = "";
  const lines = String(text || "").split(/\n/);
  lines.forEach((line, li) => {
    const re = /[.!?…]+["')\]」』”’]*(?=\s|$)|[。！？។៕]+["')\]」』”’]*/g;
    let m, last = 0;
    while ((m = re.exec(line))) {
      const end = m.index + m[0].length;
      const piece = line.slice(last, end).trim();
      if (piece) done.push(piece);
      last = end;
    }
    const rest = line.slice(last).trim();
    if (rest) { if (li === lines.length - 1) tail = rest; else done.push(rest); }
  });
  return { done, tail };
}
const ENDS_SENTENCE = /[.!?…。！？]["')\]」』”’]*$/;

/* ── 재생기 ─────────────────────────────────────────────────────────
   · 소리 나는 요소를 하나만 만들어 두고, 사용자가 누른 순간에 한 번 '잠금 해제'한다
     (아이패드 Safari는 사용자 조작 없이는 소리를 못 내게 막는다).
   · 여러 문장이 오면 순서대로 읽는다. 다음 문장의 음성은 앞 문장이 재생되는 동안 미리 받아 둔다.
   · 서버 음성(고품질)이 안 되면 그 문장만 기기 음성으로 대신 읽는다. */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const BCP47 = { ko: "ko-KR", zh: "zh-TW", en: "en-US", th: "th-TH", km: "km-KH", fr: "fr-FR" };
const Speaker = /*#__PURE__*/ (() => {
  let el = null, unlocked = false, playing = false, token = 0, resolveCur = null;
  let queue = [];
  let phase = "idle";
  let opts = { engine: "openai", speed: 1 };
  const subs = new Set();
  const emit = () => { const st = { playing, phase, pending: queue.length + (playing ? 1 : 0) }; subs.forEach((f) => f(st)); };
  const audioEl = () => { if (!el) { el = new Audio(); el.preload = "auto"; } return el; };
  const fetchAudio = async (text, lang, settings) => {
    try {
      const resp = await aiFetch("/.netlify/functions/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, speed: settings.speed }),
      });
      if (!resp.ok) return null;
      return URL.createObjectURL(await resp.blob());
    } catch { return null; }
  };
  const deviceSay = (text, lang, settings) => new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = BCP47[lang] || "en-US"; u.rate = settings.speed;
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === settings.voices?.[lang]);
      if (voice) u.voice = voice;
      u.onend = u.onerror = () => resolve();
      resolveCur = resolve;
      window.speechSynthesis.speak(u);
    } catch { resolve(); }
  });
  const playUrl = (url) => new Promise((resolve) => {
    const a = audioEl();
    const fin = () => { a.onended = a.onerror = null; resolve(); };
    resolveCur = fin;
    a.onended = fin; a.onerror = fin;
    a.src = url;
    try { const p = a.play(); if (p && p.catch) p.catch(fin); } catch { fin(); }
  });
  const pump = async () => {
    if (playing) return;
    const job = queue.shift();
    if (!job) { phase = "idle"; emit(); return; }
    playing = true; phase = job.settings.engine === "device" ? "playing" : "preparing"; const my = token; emit();
    try {
      if (job.settings.engine === "device") await deviceSay(job.text, job.lang, job.settings);
      else {
        const url = await job.audio;
        if (my !== token) { if (url) URL.revokeObjectURL(url); }
        else if (url) { phase = "playing"; emit(); await playUrl(url); URL.revokeObjectURL(url); }
        else { phase = "playing"; emit(); await deviceSay(job.text, job.lang, job.settings); }
      }
    } catch {}
    resolveCur = null; playing = false;
    pump();
  };
  return {
    unlock() {
      try {
        if (!unlocked) {
          const a = audioEl(); a.src = SILENT_WAV;
          const p = a.play();
          if (p && p.then) p.then(() => { unlocked = true; }).catch(() => {}); else unlocked = true;
        }
        if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      } catch {}
    },
    configure(o) { opts = { ...opts, ...o }; },
    say(text, lang, { interrupt = false, ...settings } = {}) {
      text = String(text || "").trim();
      if (!text) return;
      if (interrupt) this.stop();
      const snapshot = { ...opts, ...settings };
      queue.push({ text, lang, settings: snapshot, audio: snapshot.engine === "device" ? null : fetchAudio(text, lang, snapshot) });
      emit(); pump();
    },
    stop() {
      token++;
      queue.forEach((j) => j.audio && j.audio.then((u) => u && URL.revokeObjectURL(u)));
      queue = [];
      try { if (el) el.pause(); } catch {}
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
      if (resolveCur) resolveCur();
      emit();
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
})();
function useSpeaker() {
  const [st, setSt] = useState({ playing: false, pending: 0 });
  useEffect(() => Speaker.subscribe(setSt), []);
  return st;
}
/* 눌러서 듣기(🔊) — 지금 나오던 소리는 끊고 이것부터 */
function speakTTS(text, langCode, settings = {}) { Speaker.unlock(); Speaker.say(text, langCode, { ...settings, interrupt: true }); }

/* ── 긴 글을 문장 단위로 번역 ────────────────────────────────────────
   앞 문장부터 차례로 결과를 알려 주므로 첫 문장이 먼저 보이고 먼저 읽힌다.
   앞의 두 문장은 맥락으로 함께 보낸다(한국어는 주어를 자주 생략한다). */
async function translateSeq(text, fromLabel, toLabel, { concurrency = 3, onSentence, use = "strip" } = {}) {
  const { done, tail } = splitSentences(text);
  const sents = tail ? [...done, tail] : done;
  if (!sents.length) return [];
  const out = new Array(sents.length).fill(undefined);
  let next = 0, emitted = 0;
  const flush = () => { while (emitted < out.length && out[emitted] !== undefined) { onSentence && onSentence(emitted, out[emitted].text, out[emitted].failed); emitted++; } };
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= sents.length) return;
      const ctx = sents.slice(Math.max(0, i - 2), i).join(" ");
      try { out[i] = { text: await gptTranslateStrict(sents[i], fromLabel, toLabel, ctx, { use }), failed: false }; }
      catch { out[i] = { text: sents[i], failed: true }; }
      flush();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, sents.length) }, worker));
  return out.map((o) => o.text);
}

/* 예전에 저장한 파일에는 새로 생긴 칸이 없다. 열 때 기본값을 채워
   넣어, 오래된 사례가 열리지 않는 일이 없게 한다. */
const withDefaults = (d) => ({
  ...emptyDoc(), ...d,
  attrLayers: (d && d.attrLayers && d.attrLayers.length)
    ? d.attrLayers : emptyDoc().attrLayers,
});
const emptyDoc = () => ({
  v: 2, title: "", people: [], unions: [], bonds: [], households: [], triangles: [], events: [], transitions: [], tlgPos: {}, ink: [], notes: [],
  story: { problem: "", history: "", strengths: "", note: "" },
  context: { vert: [], horiz: [], ring: "", note: "" },
  /* 척도 이름은 결국 사용자가 짓는다. 영적 성숙도는 보웬 이론에 없는
     개념이고, 세속 상담 현장에서는 쓸 수 없다. 다만 빈 칸 세 개만
     던져두면 이 기능이 있는지조차 모르고 지나치기 쉬워, 새 가계도는
     예시 이름을 채운 채로 시작한다 — 마음에 안 들면 지우거나 고쳐
     쓰면 된다. */
  attrLayers: [{ id: "a1", name: "" }, { id: "a2", name: "" }, { id: "a3", name: "" }],
});
/* 자아분화는 보웬의 0–100 척도를 넷으로 나눠 읽는다 */
const DIFF_BAND = (v) => (v < 25 ? 0 : v < 50 ? 1 : v < 75 ? 2 : 3);

/* 화면이 까맣게 꺼지는 대신 무엇이 잘못됐는지 보여 준다.
   작업 중이던 자료는 자동 보관본에 남아 있으므로 새로고침하면 되살아난다. */
class Guard extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: "" }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    this.setState({ info: (info && info.componentStack ? info.componentStack : "").split("\n").slice(0, 6).join("\n") });
    try { console.error("Genogram Studio error:", err, info); } catch { /* 무시 */ }
  }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String(this.state.err && (this.state.err.stack || this.state.err.message) || this.state.err);
    return (
      <div style={{ minHeight: "100vh", background: "#FBFAF5", padding: "42px 26px", fontFamily: FB, color: T.ink }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 14, padding: 26 }}>
          <div style={{ fontFamily: FD, fontSize: 21, fontWeight: 600, marginBottom: 6 }}>
            화면을 그리는 중 문제가 생겼습니다 · Something went wrong · 畫面繪製時發生問題
          </div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, marginBottom: 16 }}>
            작업 중이던 자료는 이 기기에 자동으로 보관되어 있습니다. 새로고침하면 홈 화면에서 이어서 열 수 있습니다.
            아래 내용을 그대로 알려 주시면 원인을 바로 찾을 수 있습니다.
          </div>
          <pre style={{ fontFamily: FM, fontSize: 11, lineHeight: 1.45, background: "#F4F7FA", border: `1px solid ${T.rule}`,
            borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", color: T.red, maxHeight: 260, overflow: "auto" }}>
            {msg}{this.state.info ? "\n" + this.state.info : ""}
          </pre>
          <div className="flex" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" onClick={() => window.location.reload()}
              style={{ background: T.pine, color: "#fff", border: "none", borderRadius: 18, padding: "9px 16px",
                fontSize: 13, fontFamily: FB, fontWeight: 600, cursor: "pointer" }}>새로고침 · Reload</button>
            <button type="button" onClick={() => { try { navigator.clipboard.writeText(msg + "\n" + this.state.info); } catch { /* 무시 */ } }}
              style={{ background: "#fff", color: T.ink2, border: `1px solid ${T.rule}`, borderRadius: 18, padding: "9px 16px",
                fontSize: 13, fontFamily: FB, cursor: "pointer" }}>내용 복사 · Copy</button>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return <Guard><AppInner /></Guard>;
}

function AppInner() {
  const [li, setLi] = useState(()=>{try{const i=langIndexOf(localStorage.getItem('gs:lang')||'');if(i>=0)return i;const n=Number(localStorage.getItem('gs:language')??1);return Number.isInteger(n)&&n>=0&&n<BASE_LANG_COUNT?n:1;}catch{return 1;}});
  useEffect(()=>{const L=LANGS[li]||LANGS[1];document.documentElement.lang=L.htmlLang;document.documentElement.dataset.ui=L.id;try{localStorage.setItem('gs:lang',L.id);localStorage.setItem('gs:language',li<BASE_LANG_COUNT?li:0);}catch{}},[li]);
  const [screen, setScreen] = useState("home");
  /* 도구 막대 접기 — 헤더의 버튼과 Editor 안의 도구 막대가 함께 쓰므로
     여기(공통 조상)에 둔다. */
  const [toolHidden, setToolHidden] = useState(false);
  const [cases, setCases] = useState([]);
  const [docEpoch,setDocEpoch]=useState(0);
  const [storageOK, setStorageOK] = useState(false);
  /* 자동 임시저장 사용 여부 — 기본은 켜짐. 끄면 새 초안을 남기지 않고
     기존 초안도 지운다. 이 기기에만 적용되는 설정이다. */
  const [autosaveOn, setAutosaveOn] = useState(true);
  const [interpOpen, setInterpOpen] = useState(false);
  const [transDocked, setTransDocked] = useDockPreference("gs:dock-translation");
  const [interpDocked, setInterpDocked] = useDockPreference("gs:interpreter-docked");
  const [transOpen, setTransOpen] = useState(false);     // 번역 띠
  const [teaserOpen, setTeaserOpen] = useState(false);   // 기본판의 번역·통역 안내창
  const noteBridge = useRef(null);                       // 번역 띠 → 설명 박스 (Editor가 채운다)
  const [saveDlg, setSaveDlg] = useState(false);
  /* 헤더의 '종료 및 저장'은 저장한 뒤 홈으로 나가야 한다. 반면 Ctrl+S나
     편집기 안의 '저장'은 계속 그리던 걸 이어 그려야 하므로 나가지
     않는다. 같은 대화상자를 열되, 어느 쪽에서 열었는지만 구분해 둔다. */
  const [exitAfterSave, setExitAfterSave] = useState(false);
  /* '기본 가계도'는 사례당 한 번 쓰는 일이라 파란 줄에 두었는데, 그 일을
     하는 함수는 Editor 안에 있다. Editor가 자기 함수를 여기 걸어 두고
     파란 줄이 그것을 부른다. */
  const templateRef = useRef(null);
  const panelRef = useRef(null);   // 헤더의 "저장한 가계도" 단추 → Editor 패널을 그 탭으로 연다
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);
  const t = (k) => tr(S[k], li);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  /* ── undo / redo history ──────────────────────────────────────
     Every change to the document is pushed onto `past`. Rapid changes
     that share a tag (dragging a node, typing in one field) collapse
     into a single step so one Undo feels like one action.            */
  const HIST_MAX = 100;
  const [hist, setHist] = useState(() => ({ past: [], present: emptyDoc(), future: [] }));
  const doc = hist.present;
  const lastTag = useRef({ tag: null, at: 0 });

  const setDoc = useCallback((updater, tag) => {
    const now = Date.now();
    const merge = !!tag && lastTag.current.tag === tag && now - lastTag.current.at < 1500;
    lastTag.current = { tag: tag || null, at: now };
    setHist((h) => {
      const changed = typeof updater === "function" ? updater(h.present) : updater;
      const next = retainOrphanNotes(changed,h.present);
      if (next === h.present) return h;
      if (merge && h.past.length) return { past: h.past, present: next, future: [] };
      return { past: [...h.past, h.present].slice(-HIST_MAX), present: next, future: [] };
    });
  }, []);
  /* replaces the document without leaving an undo step (open / import) */
  /* "저장하지 않고 남은 작업" 안내는 지금 그리고 있는 내용이 마지막
     저장 시점과 실제로 달라야만 떠야 한다. 새 가계도를 만들거나,
     불러오거나, 저장을 마칠 때마다 그 순간의 내용을 스냅샷으로
     남겨 두고, 홈 화면에서는 지금 내용과 이 스냅샷을 비교한다. */
  const cleanRef = useRef("");
  const resetDoc = useCallback((d) => {
    setDocEpoch(v=>v+1);
    lastTag.current = { tag: null, at: 0 };
    cleanRef.current = JSON.stringify(d);
    setHist({ past: [], present: d, future: [] });
  }, []);
  /* silent patch — used when saving stamps an id, not a user edit */
  const patchDoc = useCallback((d) => {
    lastTag.current = { tag: null, at: 0 };
    cleanRef.current = JSON.stringify(d);
    setHist((h) => ({ ...h, present: d }));
  }, []);
  const undo = useCallback(() => {
    lastTag.current = { tag: null, at: 0 };
    setHist((h) => (h.past.length
      ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future].slice(0, HIST_MAX) }
      : h));
  }, []);
  const redo = useCallback(() => {
    lastTag.current = { tag: null, at: 0 };
    setHist((h) => (h.future.length
      ? { past: [...h.past, h.present].slice(-HIST_MAX), present: h.future[0], future: h.future.slice(1) }
      : h));
  }, []);
  const canUndo = hist.past.length > 0, canRedo = hist.future.length > 0;

  /* ── automatic draft keeping ──────────────────────────────────
     The working document is written to local storage a moment after
     each change, so closing the tab mid-session loses nothing.      */
  const [draft, setDraft] = useState(null);
  const booted = useRef(false);

  useEffect(() => {
    (async () => {
      if (!storage) { booted.current = true; return; }
      let idx = [];
      try { const r = await storage.get("gs:index"); setStorageOK(true); if (r?.value) idx = JSON.parse(r.value) || []; }
      catch { setStorageOK(true); }
      /* 색인이 덮어써지거나 사라져도 gs:case:* 원본은 남아 있으므로, 색인에 없는 사례를 다시 찾아 목록에 넣는다 */
      try {
        const r = storage.list ? await storage.list("gs:case:") : null;
        const known = new Set(idx.map((c) => c.id));
        const found = [];
        for (const k of r?.keys || []) {
          const id = k.slice("gs:case:".length);
          if (!id || known.has(id)) continue;
          try {
            const v = await storage.get(k);
            const d = v?.value ? JSON.parse(v.value) : null;
            if (d) found.push({ id, title: d.title || "", savedAt: d.savedAt || "" });
          } catch {}
        }
        if (found.length) {
          idx = [...idx, ...found].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
          await storage.set("gs:index", JSON.stringify(idx)).catch(() => {});
        }
      } catch {}
      setCases(idx);
      try {
        const r = await storage.get("gs:autosave");
        if (r?.value === "off") setAutosaveOn(false);
      } catch {}
      try {
        const r = await storage.get("gs:draft");
        if (r?.value) { const d = JSON.parse(r.value); if (d?.doc?.people?.length) setDraft(d); }
      } catch {}
      booted.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!storage || !booted.current) return;
    if (!autosaveOn) return;   // 꺼져 있으면 아예 쓰지 않는다
    const id = setTimeout(() => {
      const empty = !doc.people.length && !doc.title;
      if (empty) { storage.delete("gs:draft").catch(() => {}); return; }
      storage.set("gs:draft", JSON.stringify({ savedAt: new Date().toISOString(), doc })).catch(() => {});
    }, 900);
    return () => clearTimeout(id);
  }, [doc, autosaveOn]);

  const resumeDraft = () => {
    if (!draft?.doc) return;
    resetDoc(withDefaults(draft.doc));
    setDraft(null); setScreen("draw"); flash(t("restored"));
  };
  const dropDraft = () => { setDraft(null); storage?.delete("gs:draft").catch(() => {}); };
  const setAutosave = (on) => {
    setAutosaveOn(on);
    storage?.set("gs:autosave", on ? "on" : "off").catch(() => {});
    if (!on) { setDraft(null); storage?.delete("gs:draft").catch(() => {}); }
  };
  /* 이 기기에 남아 있는 모든 것을 지운다 — 저장한 가계도, 임시저장, 색인.
     서버에는 원래 아무것도 없으므로, 이것으로 이 기기의 흔적이 전부 사라진다. */
  const deleteAllOnDevice = async () => {
    if (!storage) return;
    try {
      for (const c of cases) await storage.delete(`gs:case:${c.id}`).catch(() => {});
      await storage.delete("gs:index").catch(() => {});
      await storage.delete("gs:draft").catch(() => {});
      setCases([]); setDraft(null);
      flash(t("clearedDevice"));
    } catch {}
  };
  const saveCase = async (name, dest) => {
    const title = (name ?? doc.title ?? "").trim();
    if (dest === "file") {
      const withTitle = { ...doc, title };
      patchDoc(withTitle);
      const blob = new Blob([JSON.stringify(withTitle, null, 2)], { type: "application/json" });
      const res = await saveAs(blob, `${title || "genogram"}.genogram.json`, "application/json", "Genogram data (JSON)");
      if (res !== "cancelled") flash(t("saved"));
      return res;
    }
    if (!storage) { exportJSON(); return; }
    const id = doc.id || uid();
    const next = { ...doc, id, title, savedAt: new Date().toISOString() };
    try {
      await storage.set(`gs:case:${id}`, JSON.stringify(next));
      const idx = [{ id, title: next.title, savedAt: next.savedAt }, ...cases.filter((c) => c.id !== id)];
      await storage.set("gs:index", JSON.stringify(idx));
      setCases(idx); patchDoc(next); flash(t("saved"));
    } catch { flash("!"); }
  };
  /* 저장하지 않은 작업(지금 그리는 것, 지난번에 남은 임시저장)을 새로 시작하거나 다른 가계도를 열 때 조용히 잃지 않도록,
     그 자리에서 '저장한 가계도'에 (자동 보관)으로 저장해 둔다. 저장이 안 되면(저장소 없음·실패) 아무것도 지우지 않고 그대로 둔다. */
  const keepUnsaved = async () => {
    if (!storage) return;
    const live = doc.people.length && JSON.stringify(doc) !== cleanRef.current ? doc : null;
    const boot = draft?.doc?.people?.length && !draft.live ? draft.doc : null;
    const list = [live, boot].filter(Boolean).filter((d, i, a) => a.findIndex((x) => JSON.stringify(x) === JSON.stringify(d)) === i);
    if (!list.length) return;
    let idx = cases, kept = 0;
    for (const d of list) {
      const id = "auto-" + uid();
      const next = { ...d, id, title: tr(S.autoKept, li) + (d.title || tr(S.untitledCase, li)), savedAt: new Date().toISOString() };
      try {
        await storage.set(`gs:case:${id}`, JSON.stringify(next));
        idx = [{ id, title: next.title, savedAt: next.savedAt }, ...idx];
        await storage.set("gs:index", JSON.stringify(idx)); setCases(idx); kept++;
      } catch {}
    }
    if (boot && kept) setDraft(null);
    if (kept) flash(tr(S.autoKeptMsg, li));
  };
  const loadCase = async (id) => {
    await keepUnsaved();
    try { const r = await storage.get(`gs:case:${id}`); if (r?.value) { resetDoc(withDefaults(JSON.parse(r.value))); flash(t("open")); } } catch {}
  };
  const deleteCase = async (id) => {
    try {
      await storage.delete(`gs:case:${id}`);
      const idx = cases.filter((c) => c.id !== id);
      await storage.set("gs:index", JSON.stringify(idx)); setCases(idx);
    } catch {}
  };
  const exportJSON = async () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    await saveAs(blob, `${doc.title || "genogram"}.genogram.json`, "application/json", "Genogram data (JSON)");
  };
  const importJSON = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fr = new FileReader();
    fr.onload = async () => { try { const d = withDefaults(JSON.parse(fr.result)); await keepUnsaved(); resetDoc(d); setScreen("draw"); flash(t("open")); } catch { flash("!"); } };
    fr.readAsText(f); e.target.value = "";
  };

  return (
    <LangCtx.Provider value={li}>
      <div className="gs-app" style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.paper, color: T.ink, fontFamily: FB, overflow: "hidden" }}>
        <style>{FONTS}</style>

        {screen !== "home" && (
          <header className="gs-app-header" style={{ display: "flex", alignItems: "center", height: 54, padding: "0 14px",
            background: `linear-gradient(180deg, #2C4A6E 0%, ${T.pine} 100%)`, color: "#fff", gap: 12, flexShrink: 0,
            boxShadow: "0 1px 0 rgba(255,255,255,.08) inset, 0 2px 10px rgba(22,32,42,.14)" }}>
            <button type="button" onClick={() => setScreen("home")}
              style={{ display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", cursor: "pointer", color: "#fff", padding: 0 }}>
              <Logo size={30} mono />
              <span style={{ fontFamily: FT, fontSize: 14, fontWeight: 700, letterSpacing: ".01em" }}>{t("app")}</span>
            </button>
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,.25)" }} />
            {screen === "draw" && (
              <input value={doc.title} onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))} placeholder={t("caseName")}
                style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.22)", color: "#fff",
                  borderRadius: 15, padding: "6px 12px", fontSize: 13, fontFamily: FB, width: 190, minWidth: 0 }} />
            )}
            <div style={{ flex: 1 }} />
            {/* 사례당 한 번 쓰는 일들 — 새로 시작하고, 저장하고, 분석한다 */}

            {HAS_AI && screen === "draw" && <TopChip onClick={() => setTransOpen((v) => !v)}>🌐 {tr(["Translate","번역","翻譯"], li)}</TopChip>}
            {HAS_AI && screen === "draw" && <TopChip onClick={() => { setInterpOpen((v) => !v); }}>🎤 {tr(["Interpret","통역","口譯"], li)}</TopChip>}
            {!HAS_AI && screen === "draw" && <TopChip faded onClick={() => setTeaserOpen(true)}>🌐 {tr(["Translate","번역","翻譯"], li)}</TopChip>}
            {!HAS_AI && screen === "draw" && <TopChip faded onClick={() => setTeaserOpen(true)}>🎤 {tr(["Interpret","통역","口譯"], li)}</TopChip>}
            {screen === "draw" && <TopChip onClick={() => { setExitAfterSave(true); setSaveDlg(true); }}>{t("exitSave")}</TopChip>}
            {screen === "draw" && <TopChip onClick={() => fileRef.current?.click()}>{t("open")}</TopChip>}
            {screen === "draw" && <TopChip onClick={() => panelRef.current?.openTab("saved")}>{t("tabSaved")}</TopChip>}
            {screen === "draw" && <TopChip onClick={() => setScreen("export")}>{t("m3")}</TopChip>}
            {/* 분석·자료 화면에서 그리던 가계도로 돌아가는 길.
                없으면 홈을 거쳐야 해서 하던 작업이 끊긴다. */}
            {screen !== "draw" && <TopChip onClick={() => setScreen("draw")}>← {t("m2")}</TopChip>}

            <select value={li} onChange={(e) => setLi(+e.target.value)}
              style={{ background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.22)",
                borderRadius: 15, padding: "6px 10px", fontSize: 12.5, fontFamily: FB }}>
              {LANGS.map((l, i) => <option key={l.id} value={i} style={{ color: T.ink }}>{l.label}</option>)}
            </select>
            <input ref={fileRef} type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
            {/* 도구 막대 접기 — 그림에 집중하고 싶을 때 도구 막대를 통째로
                치워 캔버스를 넓게 쓴다. 헤더 줄 안에 제 자리를 두어 다른
                아이콘과 겹치지 않게 한다. 데스크톱에서는 CSS로 숨긴다.
                오른쪽 패널의 '가리기/보기' 단추와 같은 말투로, 글자를
                함께 붙여 삼각형만으로는 뜻이 안 보이던 문제를 없앤다. */}
            {screen === "draw" && (
              <button type="button" className="gs-tool-collapse-btn" onClick={() => setToolHidden((v) => !v)}
                title={toolHidden ? t("toolbarShow") : t("toolbarHide")}
                style={{ display: "none", flexShrink: 0, alignItems: "center", justifyContent: "center", gap: 5,
                  height: 32, padding: "0 11px", borderRadius: 9, border: "1px solid rgba(255,255,255,.25)",
                  whiteSpace: "nowrap",
                  background: toolHidden ? "#fff" : "rgba(255,255,255,.12)", color: toolHidden ? T.pine : "#fff",
                  fontSize: 12, fontFamily: FB, fontWeight: 700, cursor: "pointer" }}>
                <span style={{ fontSize: 13, transform: toolHidden ? "rotate(180deg)" : "none", display: "inline-block" }}>▴</span>
                {toolHidden ? t("toolbarShow") : t("toolbarHide")}
              </button>
            )}
          </header>
        )}

        <style>{`
          .gs-workspace { flex: 1; min-height: 0; display: flex; overflow: hidden; }
          .gs-workspace-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
          .gs-language-dock { width: 410px; flex-shrink: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 8px; background: #eef2f6; overflow: auto; border-left: 1px solid #ccd5df; }
          .gs-language-dock > .gs-docked { min-height: 230px; flex: 1; }
          .gs-docked button { min-height: 30px; }
          @media (max-width: 1200px) {
            .gs-workspace { flex-direction: column; }
            .gs-language-dock { width: auto; height: 44dvh; flex-shrink: 0; flex-direction: row; border-left: 0; border-top: 1px solid #ccd5df; }
            .gs-language-dock > .gs-docked { min-width: 0; }
          }
          @media (max-width: 600px) {
            .gs-language-dock { flex-direction: column; }
            .gs-language-dock > .gs-docked { flex: 0 0 300px; }
          }
        `}</style>
        <div className="gs-workspace">
        <div className="gs-workspace-main">
          {screen === "home" && <Home li={li} setLi={setLi} go={setScreen}
            onNew={async () => { await keepUnsaved(); resetDoc(emptyDoc()); setScreen("draw"); }}
            onOpenFile={() => fileRef.current?.click()} fileRef={fileRef} onImport={importJSON} cases={cases} loadCase={loadCase} storageOK={storageOK}
            /* 새로고침 없이 '홈'으로 돌아온 경우, doc은 이미 이번 세션에서
               그리던 내용을 그대로 들고 있다. 그때는 storage에서 다시
               읽어 온 draft(재시작 이후용)가 아니라, 지금 메모리에 있는
               doc 자체를 '이어서 할 작업'으로 보여 준다 — 단, 마지막
               불러오기·저장 이후로 실제로 바뀐 게 있을 때만이다. 방금
               저장을 마쳤다면 스냅샷이 지금 내용과 같아지므로 뜨지
               않는다. */
            draft={(doc.people.length && JSON.stringify(doc) !== cleanRef.current) ? { doc, savedAt: null, live: true } : draft}
            resumeDraft={doc.people.length ? () => setScreen("draw") : resumeDraft}
            dropDraft={doc.people.length ? () => { resetDoc(emptyDoc()); storage?.delete("gs:draft").catch(() => {}); } : dropDraft}
            autosaveOn={autosaveOn} setAutosave={setAutosave} deleteAllOnDevice={deleteAllOnDevice} />}
          {screen === "draw" && <Editor key={docEpoch} doc={doc} setDoc={setDoc} li={li} cases={cases} storageOK={storageOK} openSave={() => setSaveDlg(true)} loadCase={loadCase} deleteCase={deleteCase} flash={flash} templateRef={templateRef} panelRef={panelRef} noteBridge={noteBridge} toolHidden={toolHidden}
            undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />}
          {screen === "export" && <ExportScreen doc={doc} setDoc={setDoc} li={li} exportJSON={exportJSON} flash={flash} onBackToDraw={() => setScreen("draw")} />}
          {screen === "ref" && <RefScreen li={li} />}
        </div>

        <aside className="gs-language-dock" aria-label={tr(["Translation and interpretation", "번역·통역 고정칸", "翻譯與口譯"], li)} style={!(HAS_AI && screen === "draw" && ((transOpen && transDocked) || (interpOpen && interpDocked))) ? { display: "contents" } : undefined}>
          {HAS_AI && <TranslateDock li={li} open={transOpen && screen === "draw"} docked={transDocked} onToggleDock={() => setTransDocked(v => !v)} onClose={() => setTransOpen(false)} noteBridge={noteBridge} flash={flash} />}
          {HAS_AI && <InterpreterWindow li={li} open={interpOpen && screen === "draw"} docked={interpDocked} onToggleDock={() => setInterpDocked(v => !v)} onClose={() => setInterpOpen(false)} />}
        </aside>
        </div>

        {toast && (
          <div style={{ position: "fixed", left: "50%", bottom: 26, transform: "translateX(-50%)", background: T.ink,
            color: "#fff", padding: "9px 16px", borderRadius: 20, fontSize: 12.5, zIndex: 99 }}>{toast}</div>
        )}
        {/* 늘 붙여 두고 보이기만 켠다 — 화면을 오가도 번역 기록이 남는다 */}

        {HAS_AI && <TransAssist li={li} />}
        {!HAS_AI && teaserOpen && <LiteTeaser li={li} onClose={() => setTeaserOpen(false)} />}
        {/* 어느 사이트(판)이고 어느 빌드인지 — 두 사이트의 버전이 같은지 알아보려고 구석에 작게 */}
        <div className="gs-edition" data-noprint style={{ position: "fixed", left: 8, bottom: 3, zIndex: 2, fontSize: 10, color: "#5b6b7b", opacity: 0.55, pointerEvents: "none", fontFamily: FM }}>
          {HAS_AI ? tr(["Interpreter edition", "통역판", "口譯版"], li) : tr(["Basic edition", "기본판", "基本版"], li)} · {BUILD}
        </div>
        {saveDlg && (
          <SaveDialog li={li} initialName={doc.title} storageOK={storageOK}
            onSave={async (name, dest) => { await saveCase(name, dest); setSaveDlg(false);
              if (exitAfterSave) { setExitAfterSave(false); setScreen("home"); } }}
            onClose={() => { setSaveDlg(false); setExitAfterSave(false); }} />
        )}
      </div>
    </LangCtx.Provider>
  );
}

/* ── home ─────────────────────────────────────────────────────── */
/* ── 저장소와 개인정보 ─────────────────────────────────────────────
   상담 자료는 민감정보다. 자동 임시저장이 무엇을, 어디에 남기는지를
   숨기지 않고 밝히고, 끄고 켜는 선택권과 기기 내 전체 삭제, 공용
   컴퓨터 경고를 함께 둔다. 접어 둔 채로 시작해 첫 화면을 덮지 않는다. */
/* ── 저장 대화상자 ─────────────────────────────────────────────────
   이름을 물어보고, 이 기기(빠른 재열람)와 파일(직접 폴더 선택) 가운데
   저장할 곳을 고르게 한다. 이름은 비워 둘 수 없다. */
function SaveDialog({ li, initialName, storageOK, onSave, onClose }) {
  const t = (k) => tr(S[k], li);
  const [name, setName] = useState(initialName || "");
  /* 기본값을 '파일로'로 바꾼다. 브라우저에 저장하면 캐시를 지울 때
     함께 날아갈 수 있어서, 실제로 자료를 잃는 사례가 생겼다. 파일로
     내보내면 어떤 업데이트를 해도 안전하다. */
  const [dest, setDest] = useState("file");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const confirm = async () => {
    if (!name.trim()) { setErr(true); return; }
    setBusy(true);
    await onSave(name.trim(), dest);
    setBusy(false);
  };

  const Option = ({ id, label, note }) => (
    <button type="button" onClick={() => setDest(id)} className="flex flex-col"
      style={{ flex: 1, textAlign: "left", padding: "11px 13px", borderRadius: 10, cursor: "pointer",
        border: `1.5px solid ${dest === id ? T.pine : T.rule}`, background: dest === id ? "#F4F7FA" : "#fff" }}>
      <div className="flex items-center" style={{ gap: 7 }}>
        <span style={{ width: 15, height: 15, borderRadius: 8, flexShrink: 0,
          border: `1.5px solid ${dest === id ? T.pine : T.faint}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {dest === id && <span style={{ width: 7, height: 7, borderRadius: 4, background: T.pine }} />}
        </span>
        <span style={{ fontSize: 12.5, fontFamily: FB, fontWeight: 600, color: T.ink }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: T.mute, marginTop: 3, lineHeight: 1.5, paddingLeft: 22 }}>{note}</div>
    </button>
  );

  return (
    <div onPointerDown={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(22,32,42,.32)", zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onPointerDown={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: 22, width: 380, maxWidth: "100%",
          boxShadow: "0 20px 48px rgba(22,32,42,.28)" }}>
        <div style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, marginBottom: 14 }}>{t("saveDlgTitle")}</div>

        <div style={{ fontSize: 11.5, fontFamily: FB, fontWeight: 600, color: T.ink2, marginBottom: 5 }}>{t("saveNameLabel")}</div>
        <input ref={inputRef} value={name} placeholder={t("saveNamePh")}
          onChange={(e) => { setName(e.target.value); if (err) setErr(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          style={{ ...inputStyle, width: "100%", fontSize: 13.5, padding: "9px 11px",
            border: `1.5px solid ${err ? T.red : T.rule}` }} />
        {err && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{t("saveNameRequired")}</div>}

        <div style={{ fontSize: 11.5, fontFamily: FB, fontWeight: 600, color: T.ink2, margin: "16px 0 7px" }}>{t("saveWhere")}</div>
        <div style={{ fontSize: 11.5, color: "#7C5C2A", background: "#FDF6EC", border: "1px solid #F0D9B0",
          borderRadius: 8, padding: "8px 11px", marginBottom: 8, lineHeight: 1.5 }}>
          {tr(["💡 Recommended: save as a file. Browser storage can be wiped when you clear cache — files are always safe.",
            "💡 파일로 저장을 권장합니다. 브라우저 캐시를 지우면 기기 저장 자료가 함께 사라질 수 있습니다. 파일로 저장하면 어떤 업데이트에도 안전합니다.",
            "💡 建議儲存為檔案。清除瀏覽器快取可能導致裝置上的資料遺失，檔案儲存則永遠安全。"], li)}
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {storageOK && <Option id="device" label={t("saveOnDevice")} note={t("saveOnDeviceNote")} />}
          <Option id="file" label={t("saveAsFile")} note={t("saveAsFileNote")} />
        </div>

        <div className="flex items-center" style={{ gap: 8, marginTop: 20 }}>
          <div style={{ flex: 1 }} />
          <Btn onClick={onClose}>{t("saveCancel")}</Btn>
          <Btn tone="solid" onClick={confirm} disabled={busy}>{t("saveConfirm")}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ══ 통역 패널 ══════════════════════════════════════════════════════
   선생님과 내담자가 각자 자기 언어로 말하면 상대방 언어로 번역해
   보여 주고 읽어 준다. 문자와 음성이 동시에 작동한다.        */
/* ══ 기본판의 번역·통역 안내창 ═══════════════════════════════════════════
   기본판에는 번역·통역 코드가 없다(비용이 드는 기능이라 별도 사이트로 분리했다). 그래도 이런 기능이
   있다는 것을 알 수 있게, 위쪽 줄에 옅은 단추를 두고 누르면 무엇을 하는 기능인지 보여 준다.
   여기의 예시는 실제 번역이 아니라 화면을 보여 주는 고정된 견본이다 — 네트워크를 쓰지 않는다. */
function LiteTeaser({ li, onClose }) {
  const t = (en, ko, zh) => tr([en, ko, zh], li);
  const samples = [
    ["아버지는 말이 없으셨고, 술을 자주 드셨습니다.", "My father was quiet and drank often.", "父親不太說話，常常喝酒。"],
    ["어머니가 우리를 혼자 키우셨어요.", "My mother raised us on her own.", "母親獨自把我們養大。"],
    ["그때부터 형과 연락을 끊고 지냈습니다.", "Since then, I have stayed out of touch with my older brother.", "從那時起，我就和哥哥斷了聯絡。"],
  ];
  const features = [
    [t("🌐 Translation strip", "🌐 번역 띠", "🌐 翻譯列"), t("Type in Korean and get English and Chinese sentence by sentence; read it aloud; show it in large text to the client.", "한글로 입력하면 영어·중국어(번체)로 문장마다 바로 번역합니다. 읽어 주고, 내담자에게 큰 글씨로 보여 줄 수 있습니다.", "以韓文輸入，逐句即時翻成英文與繁體中文；可朗讀，也能以大字呈現給案主。")],
    [t("▤ Send to an annotation box", "▤ 설명 박스로 보내기", "▤ 存為說明框"), t("Put the translated text into the annotation box of the selected person in one step.", "번역한 글을 선택한 인물의 설명 박스로 한 번에 보냅니다.", "一鍵把翻譯結果放進所選人物的說明框。")],
    [t("🌐 Translate inside text fields", "🌐 글칸 번역", "🌐 文字欄內翻譯"), t("In story, context and memo fields, add the translation under your own text.", "이야기·맥락·메모 같은 글칸에서 쓴 글 아래에 번역을 덧붙입니다.", "在故事、脈絡、備註等欄位，於原文下方加上翻譯。")],
    [t("🎤 Interpreter", "🎤 통역", "🎤 口譯"), t("Counsellor and client each speak their own language; the other side hears it translated.", "상담자와 내담자가 각자의 언어로 말하면 상대의 언어로 번역해 읽어 줍니다.", "諮商者與案主各說自己的語言，對方會聽到翻譯後的內容。")],
  ];
  return (
    <div className="gs-teaser" data-notrans onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(22,32,42,.4)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "min(640px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(22,32,42,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ flex: 1, fontFamily: FD, fontSize: 18, fontWeight: 600, color: T.ink }}>🌐 🎤 {t("Translation and interpreting are in the interpreter edition", "번역·통역은 통역판에서 사용합니다", "翻譯與口譯在口譯版使用")}</span>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: T.mute }}>✕</button>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: T.ink2, fontFamily: FB, padding: "10px 12px", background: T.paper, borderRadius: 10 }}>
          {t("Translation and interpreting cost money every time they are used, so they are provided on a separate site (the interpreter edition). This site (the basic edition) has none of them, so anyone can use it free of charge. Drawing, notes, analysis, culture comparison and saving all work here as usual.",
             "통역·번역 기능은 사용할 때마다 비용이 드는 기능이라 별도 사이트(통역판)로 분리했습니다. 이 사이트(기본판)는 누구나 비용 없이 쓸 수 있도록 번역·통역 기능이 들어 있지 않습니다. 그리기, 필기, 분석, 문화 비교, 저장은 이 사이트에서 그대로 쓰실 수 있습니다.",
             "翻譯與口譯每次使用都會產生費用，因此另設網站（口譯版）提供。本網站（基本版）不含這些功能，讓任何人都能免費使用。繪圖、筆記、分析、文化比較與儲存在這裡都能照常使用。")}
        </div>
        <div style={{ marginTop: 14 }}>
          {features.map(([h, d], i) => (
            <div key={i} style={{ padding: "7px 2px", borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, fontFamily: FB }}>{h}</div>
              <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5, fontFamily: FB }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 11.5, color: T.mute, fontFamily: FB }}>{t("Example (a fixed sample of the screen, not a live translation)", "예시 (실제 번역이 아니라 화면을 보여 주는 고정된 견본입니다)", "範例（僅為畫面示意，並非即時翻譯）")}</div>
        <div className="gs-teaser-sample" style={{ marginTop: 6, border: `1px solid ${T.rule}`, borderRadius: 12, padding: "4px 12px", background: "#fff" }}>
          {samples.map(([ko, en, zh], i) => (
            <div key={i} style={{ padding: "7px 0", borderBottom: i < samples.length - 1 ? `1px solid ${T.rule}` : "none" }}>
              <div style={{ fontSize: 11.5, color: T.mute, fontFamily: FB }}>{ko}</div>
              <div style={{ fontSize: 15, color: T.ink, fontFamily: FB, marginTop: 2 }}><b style={{ fontSize: 10.5, color: T.pine, marginRight: 8 }}>EN</b>{en}</div>
              <div style={{ fontSize: 15, color: T.ink, fontFamily: FB, marginTop: 2 }}><b style={{ fontSize: 10.5, color: T.pine, marginRight: 8 }}>中</b>{zh}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {FULL_URL && (
            <a className="gs-teaser-link" href={FULL_URL} target="_blank" rel="noopener noreferrer"
              style={{ background: T.pine, color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontFamily: FB, fontWeight: 600, textDecoration: "none" }}>
              {t("Open the interpreter edition", "통역판 열기", "開啟口譯版")} ↗
            </a>
          )}
          <span style={{ fontSize: 12, color: T.mute, fontFamily: FB }}>{t("An access code is needed — ask the administrator.", "접근 코드가 필요합니다 — 관리자에게 문의하세요.", "需要存取碼，請向管理者洽詢。")}</span>
        </div>
      </div>
    </div>
  );
}

/* ══ 글칸 안에서 바로 번역 ═══════════════════════════════════════════════
   설명 박스, 인물 메모, 이야기, 맥락, 분석 답변처럼 글을 직접 치는 칸에서, 쓴 글 아래에
   다른 두 언어를 덧붙인다. 한글로 쓰면 영어·중국어, 영어로 쓰면 한글·중국어를 붙인다.
     한글 원문
     (빈 줄)
     EN: English…
     中: 中文…
   · 칸을 누르면 오른쪽 위에 '🌐' 단추가 나타난다. Alt(⌥)+Enter도 같다(Ctrl+T는 브라우저 예약).
   · 다시 누르면 덧붙인 것을 지우고 새로 만든다(중복되지 않는다). '✕ 번역 지우기'로 걷어 낼 수도 있다.
   · 글자가 아닌 곳은 빠진다: 이름·연도 같은 한 줄 칸은 data-trans를 붙인 것만(문장형 칸),
     긴 글칸(textarea)은 모두. 번역 띠·통역 창 안(data-notrans)은 뺀다.
   · 한 줄 칸은 줄바꿈이 안 되므로 '원문 | EN: … | 中: …'로 이어 붙인다. */
/* 덧붙인 번역에는 'EN:' 같은 이름표를 붙이지 않는다(글이 복잡해 보인다). 대신 번역 첫 줄 앞에 눈에 보이지 않는 표지
   (폭 0인 공백 U+200B)를 하나 둬서, 다시 누를 때 '내가 덧붙인 부분'만 찾아 바꾸거나 지울 수 있게 한다.
   예전 방식(EN: / 中: / 한: 이름표)으로 덧붙인 글도 그대로 알아본다. */
const BLOCK_MARK = "\u200B";
const LANG_IDX = { ko: 0, zh: 1, en: 2, th: 3, km: 4, fr: 5 };
const FIELD_LANGUAGES = ["ko", "en", "zh", "fr", "th", "km"];
const FIELD_LABEL = { ko: "한국어", en: "English", zh: "繁體中文", fr: "Français", th: "ภาษาไทย", km: "ភាសាខ្មែរ" };
/* 태국어·크메르어는 모음·성조 부호가 글자 위아래로 쌓여, 줄 간격이 좁으면 앞뒤 줄과 겹친다. 크메르어는 작은 글씨도 읽기 어렵다. */
const TALL_LH = { th: 1.7, km: 1.8 };
const lhOf = (lg, base) => TALL_LH[lg] || base;
const FONT_SCALE = { km: 1.15 };
const scaleOf = (lg, px) => Math.round(px * (FONT_SCALE[lg] || 1) * 10) / 10;
const LATIN_AUTO = "English or French (detect the source language from the text)";
const blockRe = (single) => (single ? / \| (?:\u200B|(?:한|EN|中): )/ : /\n\n(?:\u200B|(?:한|EN|中): )/);
const cutBlock = (text, single) => { const m = blockRe(single).exec(text); return m ? text.slice(0, m.index) : text; };
function detectScript(text) {
  const h = (text.match(/[\u3131-\u318E\uAC00-\uD7A3]/g) || []).length;
  const c = (text.match(/[\u3400-\u9FFF]/g) || []).length;
  const l = (text.match(/[A-Za-zÀ-ÖØ-öø-ÿœŒ]/g) || []).length / 2; // 영어와 프랑스어는 같은 문자군으로 취급한다
  const th = (text.match(/[\u0E01-\u0E3A\u0E40-\u0E4E]/g) || []).length / 2;   // 태국어 글자(숫자·기호 제외). 한글은 음절 하나가 한 글자라 절반으로 맞춘다
  const km = (text.match(/[\u1780-\u17D3\u17DD]/g) || []).length / 2;        // 크메르어 글자(숫자·기호 제외)
  const best = Math.max(h, c, l, th, km);
  if (!best) return null;
  return h === best ? "ko" : c === best ? "zh" : th === best ? "th" : km === best ? "km" : "latin";
}
/* 긴 글은 문단 단위로 잘라 차례로 번역하고 이어 붙인다(한 번에 4000자 제한) */
async function translateLong(text, fromLabel, toLabel) {
  if (text.length <= 1800) return gptTranslateStrict(text, fromLabel, toLabel, "", { use: "field" });
  const paras = text.split(/\n/); const chunks = []; let cur = "";
  paras.forEach((p) => { if ((cur + "\n" + p).length > 1500 && cur) { chunks.push(cur); cur = p; } else cur = cur ? cur + "\n" + p : p; });
  if (cur) chunks.push(cur);
  const out = []; let prev = "";
  for (const ch of chunks) { out.push(await gptTranslateStrict(ch, fromLabel, toLabel, prev, { use: "field" })); prev = ch.slice(-300); }
  return out.join("\n");
}
function setNativeValue(el, v) {
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));       // React의 onChange가 받도록
  try { el.setSelectionRange(v.length, v.length); } catch {}
}
const assistShown = () => { try { return localStorage.getItem("gs:assist") !== "off"; } catch { return true; } };
const transEligible = (el) => {
  if (!el || el.readOnly || el.disabled) return false;
  if (el.closest && el.closest("[data-notrans]")) return false;
  if (el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && el.hasAttribute("data-trans");
};

function TransAssist({ li }) {
  const t = (en, ko, zh) => tr([en, ko, zh], li);
  const [st, setSt] = useState(null);          // { el, top, right, has, src }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sourceChoice, setSourceChoice] = useState("auto");
  const [targetChoice, setTargetChoice] = useState(() => { try { return localStorage.getItem("gs:assistPick") || "en"; } catch { return "en"; } });
  const [on, setOn] = useState(assistShown);                  // 단추 표시 설정(번역 띠 ⚙에서 끈다). Alt+Enter는 꺼도 된다
  useEffect(() => { const f = () => setOn(assistShown()); window.addEventListener("gs-assist-cfg", f); return () => window.removeEventListener("gs-assist-cfg", f); }, []);
  const elRef = useRef(null);
  const measure = (el) => {
    if (!el || !document.contains(el)) { elRef.current = null; setSt(null); return; }
    const r = el.getBoundingClientRect();
    const single = el.tagName === "INPUT";
    const has = blockRe(single).test(el.value);
    const src = detectScript(cutBlock(el.value, single));
    if (!src && !has) { setSt(null); return; }              // 번역할 글이 없으면 단추를 보이지 않는다(빈 칸에서 계속 떠 있으면 거슬린다)
    setSt({ el, top: r.top, bottom: r.bottom, right: r.right, has, src });
  };
  const run = async (mode, elArg, pick) => {
    const el = elArg || elRef.current;
    if (!el || busy) return;
    const single = el.tagName === "INPUT";
    const cur = el.value;
    const orig = cutBlock(cur, single).trimEnd();
    if (mode === "clear") { setNativeValue(el, orig); measure(el); return; }
    const detected = detectScript(orig);
    if (!orig.trim() || !detected) { setMsg(t("Nothing to translate", "번역할 글이 없습니다", "沒有可翻譯的文字")); return; }
    const src = sourceChoice === "auto" ? detected : sourceChoice;
    const available = FIELD_LANGUAGES.filter((l) => l !== src);
    const target = pick || (available.includes(targetChoice) ? targetChoice : available[0]);
    if (!FIELD_LANGUAGES.includes(target) || src === target) {
      setMsg(t("Choose a different output language", "원문과 다른 출력 언어를 고르세요", "請選擇不同的目標語言")); return;
    }
    const from = src === "latin" ? LATIN_AUTO : GPT_LANG[LANG_IDX[src]];
    try { localStorage.setItem("gs:assistPick", target); } catch {}
    setBusy(true); setMsg("");
    try {
      const result = await translateLong(orig, from, GPT_LANG[LANG_IDX[target]]);
      if (el.value !== cur) { setMsg(t("The text changed — press again", "글이 바뀌어 붙이지 않았습니다 — 다시 눌러 주세요", "文字已更動，請再按一次")); }
      else if (result.trim() === orig.trim()) {
        setMsg(t("The text may already be in the output language. Check the source language.", "이미 출력 언어로 쓰였을 수 있습니다. 원문 언어를 확인해 주세요.", "文字可能已是目標語言，請確認原文語言。"));
      }
      else {
        const resultText = single ? result.replace(/\s*\n+\s*/g, " ") : result;
        setNativeValue(el, orig + (single ? " | " + BLOCK_MARK : "\n\n" + BLOCK_MARK) + resultText);
      }
    } catch (e) { console.error(e); setMsg(t("Translation failed", "번역 실패", "翻譯失敗")); }
    setBusy(false); measure(el);
  };

  useEffect(() => {
    const onIn = (e) => {
      if (e.target.closest?.(".gs-assist")) return;
      if (transEligible(e.target)) {
        if (elRef.current !== e.target) setSourceChoice("auto");
        elRef.current = e.target; setMsg(""); measure(e.target);
      }
      else { elRef.current = null; setSt(null); }          // 번역할 수 없는 칸으로 옮겨 가면 바로 거둔다
    };
    const onOut = (e) => { if (e.target === elRef.current) setTimeout(() => { if (document.activeElement !== elRef.current && !document.activeElement?.closest(".gs-assist")) { elRef.current = null; setSt(null); } }, 200); };
    const onInput = (e) => { if (e.target === elRef.current) measure(e.target); };
    const onKey = (e) => {
      if (e.altKey && e.key === "Enter" && !e.isComposing && transEligible(document.activeElement)) {
        e.preventDefault(); e.stopPropagation(); elRef.current = document.activeElement;
        run("add", document.activeElement);
      }
    };
    const again = () => { if (elRef.current) measure(elRef.current); };
    document.addEventListener("focusin", onIn); document.addEventListener("focusout", onOut);
    document.addEventListener("input", onInput); document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", again, true); window.addEventListener("resize", again);
    const iv = setInterval(again, 400);
    return () => {
      document.removeEventListener("focusin", onIn); document.removeEventListener("focusout", onOut);
      document.removeEventListener("input", onInput); document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", again, true); window.removeEventListener("resize", again); clearInterval(iv);
    };
  }, [busy, sourceChoice, targetChoice]);

  if (!st || !on) return null;
  const source = sourceChoice === "auto" ? st.src : sourceChoice;
  const targets = FIELD_LANGUAGES.filter((l) => l !== source);
  const selectedTarget = targets.includes(targetChoice) ? targetChoice : targets[0];
  const top = st.top > 38 ? st.top - 34 : st.bottom + 4;
  const chip = { border: `1px solid ${T.pine}`, background: "#fff", color: T.pine, borderRadius: 12, padding: "1px 8px", fontSize: 10.5, fontFamily: FB, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px rgba(22,32,42,.16)", whiteSpace: "nowrap" };
  const pill = { ...chip, fontWeight: 500, padding: "1px 7px", borderColor: T.rule, color: T.ink2 };
  return (
    <div data-noprint data-notrans className="gs-assist" style={{ position: "fixed", zIndex: 90, top, right: Math.max(6, window.innerWidth - st.right), display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", maxWidth: "calc(100vw - 12px)" }}>
      {msg && <span style={{ fontSize: 11.5, color: T.red, fontFamily: FB, background: "#fff", padding: "2px 6px", borderRadius: 6 }}>{msg}</span>}
      {st.has && <button type="button" className="gs-assist-clear" style={{ ...chip, color: T.mute, borderColor: T.rule }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); run("clear"); }}>✕ {t("Remove translation", "번역 지우기", "移除翻譯")}</button>}
      <label style={pill}>{t("Source", "원문", "原文")} <select aria-label={t("Source language", "원문 언어", "原文語言")} value={sourceChoice} onChange={(e) => setSourceChoice(e.target.value)}>
        <option value="auto">{t("Auto", "자동", "自動")}{st.src === "latin" ? " (EN/FR)" : st.src && st.src !== "latin" ? ` (${FIELD_LABEL[st.src]})` : ""}</option>
        {FIELD_LANGUAGES.map((l) => <option key={l} value={l}>{FIELD_LABEL[l]}</option>)}
      </select></label>
      <label style={pill}>{t("Output", "출력", "輸出")} <select aria-label={t("Output language", "출력 언어", "目標語言")} value={selectedTarget} onChange={(e) => setTargetChoice(e.target.value)}>
        {targets.map((l) => <option key={l} value={l}>{FIELD_LABEL[l]}</option>)}
      </select></label>
      <button type="button" className="gs-assist-go" style={{ ...chip, opacity: busy ? 0.6 : 1 }} title="Alt+Enter"
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); run("add", null, selectedTarget); }}>
        {busy ? "…" : `🌐 ${t("Translate", "번역", "翻譯")}`}{!busy && st.has ? " ↻" : ""}
      </button>
    </div>
  );
}

/* ══ 번역 띠 ═══════════════════════════════════════════════════════════
   상담하면서 한글로 치면 영어·중국어(번체)로 바로 옮겨 보여 주고, 원하면 읽어 준다.
   팝업이 아니라 화면 아래에 붙는 띠라서, 열어 둔 채로 가계도를 그리고 기록할 수 있다.
   · 문장 단위: 끝난 문장만 번역해 저장한다. 앞 문장을 고치면 그 문장만 다시 번역한다.
   · 쓰는 중인 문장은 잠깐 멈추면 번역하고, 더 멈추면 마침표를 붙여 한 문장으로 마친다.
   · 읽기: 번역이 끝난 문장을 순서대로 읽는다(영어 / 중국어 / 둘 다). 아이패드는 처음에
     읽기를 켜는 조작이 소리 잠금을 풀어 준다.
   · 큰 화면: 맞은편에 앉은 내담자가 읽을 수 있게 번역만 크게. 아래에서 계속 입력할 수 있다. */
const TRANS_KEY = "gs:trans";
const TRANS_DEFAULTS = { read: "off", source: "ko", fs: 2, engine: "openai", speed: 1, show: { ko: true, en: true, zh: true, fr: false, th: false, km: false }, secTrans: true, secInterp: false, side: "right" };
/* 번역 글씨 크기 단계(px). 기본은 12 — 가계도를 가리지 않도록 작게 두고, 필요할 때 A+로 키운다. 큰 화면은 3단 더 크게. */
const FS_STEPS = [10, 11, 12, 14, 17, 21, 27, 34];
const TRANS_PAUSE_MS = 500;      // 쓰던 문장을 이만큼 멈추면 번역한다
const TRANS_PERIOD_MS = 2200;    // 이만큼 멈추면 마침표를 붙여 문장을 마친다
const SHOW_NAME = { ko: ["Korean", "한국어", "韓文"], en: ["English", "영어", "英文"], zh: ["Chinese", "중국어", "中文"], fr: ["French", "프랑스어", "法文"], th: ["Thai", "태국어", "泰文"], km: ["Khmer", "크메르어", "高棉文"] };

/* 아이패드 Safari는 화면 키보드가 올라와도 '아래에 고정된' 요소를 위로 밀어 주지 않아, 입력칸이
   키보드 뒤에 가려진다. 실제로 보이는 영역(visualViewport)을 따라 띠를 올려 준다. */
function useDockPreference(key) {
  const [docked, setDocked] = useState(() => { try { return localStorage.getItem(key) !== "false"; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem(key, String(docked)); } catch {} }, [key, docked]);
  return [docked, setDocked];
}
const dockedWindowStyle = { position: "relative", left: "auto", top: "auto", width: "100%", height: "auto", minWidth: 0, zIndex: "auto", boxShadow: "none", overflow: "hidden" };
function DockSwitch({ docked, onClick, li }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 30, cursor: "pointer" }}>{docked ? tr(["Float window", "이동 창으로", "改為浮動視窗"], li) : tr(["Dock window", "고정칸으로", "固定視窗"], li)}</button>;
}
function useKeyboardInset(active) {
  const [vp, setVp] = useState({ gap: 0, top: 0, height: 0 });
  useEffect(() => {
    const v = typeof window !== "undefined" ? window.visualViewport : null;
    if (!v || !active) return undefined;
    const read = () => setVp({ gap: Math.max(0, Math.round(window.innerHeight - (v.height + v.offsetTop))), top: Math.round(v.offsetTop), height: Math.round(v.height) });
    read();
    v.addEventListener("resize", read); v.addEventListener("scroll", read);
    return () => { v.removeEventListener("resize", read); v.removeEventListener("scroll", read); };
  }, [active]);
  return vp;
}

// Space is tracked only while an editor has focus. IME confirmation never submits.
function useMemoKeyboard() {
  const held = useRef(false);
  const space = useRef(null);
  useEffect(() => {
    const reset = () => { held.current = false; space.current = null; };
    const up = (e) => { if (e.code === "Space") reset(); };
    window.addEventListener("keyup", up); window.addEventListener("blur", reset);
    return () => { window.removeEventListener("keyup", up); window.removeEventListener("blur", reset); };
  }, []);
  return {
    onKeyUp: (e) => { if (e.code === "Space") { held.current = false; space.current = null; } },
    onBlur: () => { held.current = false; space.current = null; },
    onKeyDown(e, submit, setText) {
      if (e.code === "Space" && !e.nativeEvent.isComposing) {
        if (!held.current) space.current = { value: e.currentTarget.value, start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
        held.current = true;
        if (e.repeat) e.preventDefault();
      }
      if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (held.current || e.shiftKey) {
        const el = e.currentTarget, mark = held.current && space.current;
        const value = mark ? mark.value : el.value;
        const start = mark ? mark.start : el.selectionStart, end = mark ? mark.end : el.selectionEnd;
        setText(value.slice(0, start) + "\n" + value.slice(end));
        space.current = null;
        requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
      } else if (!e.repeat) submit();
    },
  };
}
let floatingLayer = 70;
function useFloatingPanel(key, initial) {
  const [layer, setLayer] = useState(70);
  const clamp = (r) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.max(Math.min(320, vw), Math.min(r.w, vw));
    const h = Math.max(Math.min(260, vh), Math.min(r.h, vh));
    return { w, h, x: Math.max(0, Math.min(r.x, vw - w)), y: Math.max(0, Math.min(r.y, vh - h)) };
  };
  const [rect, setRect] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && ["x", "y", "w", "h"].every((k) => Number.isFinite(saved[k]))) return clamp(saved); } catch {}
    return clamp(initial);
  });
  const gesture = useRef(null);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(rect)); } catch {} }, [rect, key]);
  useEffect(() => { const resize = () => setRect((r) => clamp(r)); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  const begin = (e, edge) => {
    if (e.button !== 0 || (!edge && e.target.closest("button,select,input,textarea,summary"))) return;
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { rect, x: e.clientX, y: e.clientY, edge };
    const target = e.currentTarget;
    const move = (ev) => {
      const g = gesture.current; if (!g) return;
      const dx = ev.clientX - g.x, dy = ev.clientY - g.y, r = { ...g.rect };
      if (!edge) { r.x += dx; r.y += dy; }
      else {
        const minW = Math.min(320, innerWidth), minH = Math.min(260, innerHeight);
        if (edge.includes("e")) r.w = Math.max(minW, Math.min(g.rect.w + dx, innerWidth - r.x));
        if (edge.includes("s")) r.h = Math.max(minH, Math.min(g.rect.h + dy, innerHeight - r.y));
        if (edge.includes("w")) { r.x = Math.max(0, Math.min(g.rect.x + dx, g.rect.x + g.rect.w - minW)); r.w = g.rect.x + g.rect.w - r.x; }
        if (edge.includes("n")) { r.y = Math.max(0, Math.min(g.rect.y + dy, g.rect.y + g.rect.h - minH)); r.h = g.rect.y + g.rect.h - r.y; }
      }
      setRect(clamp(r));
    };
    const end = () => { gesture.current = null; target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", end); target.removeEventListener("pointercancel", end); };
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", end); target.addEventListener("pointercancel", end);
  };
  return { focus: () => setLayer(++floatingLayer), style: { zIndex: layer, left: rect.x, top: rect.y, width: rect.w, height: rect.h }, move: (e) => begin(e, ""),
    handles: ["n", "s", "e", "w", "nw", "ne", "sw", "se"].map((edge) => <div key={edge} aria-hidden="true" data-resize={edge} onPointerDown={(e) => begin(e, edge)} style={{ position: "absolute", zIndex: 4, touchAction: "none", cursor: edge + "-resize", ...(edge.includes("n") ? { top: -4 } : {}), ...(edge.includes("s") ? { bottom: -4 } : {}), ...(edge.includes("e") ? { right: -4 } : {}), ...(edge.includes("w") ? { left: -4 } : {}), ...(edge.length === 2 ? { width: 14, height: 14 } : edge === "n" || edge === "s" ? { left: 10, right: 10, height: 8 } : { top: 10, bottom: 10, width: 8 }) }} />) };
}

/* 번역창·통역창의 처음 위치 — 둘 다 기본값으로 열면 넓은 화면에서는 나란히,
   좁은 화면(태블릿 세로 등)에서는 위아래로 자동 배치해서 겹치지 않게 한다.
   전에는 두 창의 기본 좌표가 고정값이라, 화면이 좁으면 겹쳐서 매번 손으로 옮겨야 했다.
   한 번이라도 사용자가 옮기면 그 뒤로는 그 위치가 저장되어(useFloatingPanel의 key별 localStorage)
   이 계산은 다시 쓰이지 않는다 — 다시 겹치게 하려면 기기를 초기화해야 한다. */
function dockDefaultRect(which) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const gap = 16, top = Math.min(90, Math.max(60, Math.round(vh * 0.1)));
  const wT = 570, wI = 700; // 번역창·통역창의 원래 폭
  if (vw >= wT + wI + gap * 3) {
    // 넓은 화면: 나란히
    const h = Math.min(650, vh - top - gap);
    return which === "translate" ? { x: gap, y: top, w: wT, h: Math.min(620, h) } : { x: gap * 2 + wT, y: top, w: Math.min(wI, vw - (gap * 2 + wT) - gap), h };
  }
  // 좁은 화면: 위아래로. 번역이 더 자주 쓰이므로 위에 둔다.
  const w = Math.max(320, Math.min(vw - gap * 2, 640));
  const hEach = Math.max(260, Math.floor((vh - top - gap * 3) / 2));
  return which === "translate" ? { x: gap, y: top, w, h: hEach } : { x: gap, y: top + hEach + gap, w, h: Math.max(260, vh - (top + hEach + gap) - gap) };
}
const VOICE_SAMPLE = {
  ko: "안녕하세요. 이야기를 들려주세요.",
  zh: "您好，請告訴我您的故事。",
  en: "Hello. Please tell me your story.",
  fr: "Bonjour. Racontez-moi votre histoire, je vous écoute.",
  th: "สวัสดี เล่าเรื่องของคุณให้ฟังได้เลย",
  km: "សួស្តី សូមរៀបរាប់រឿងរបស់អ្នកឱ្យខ្ញុំស្តាប់",
};
function VoiceChoices({ cfg, setC, langs, li }) {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const synth = window.speechSynthesis; if (!synth) return;
    const update = () => setVoices(synth.getVoices()); update();
    synth.addEventListener("voiceschanged", update); return () => synth.removeEventListener("voiceschanged", update);
  }, []);
  if (cfg.engine !== "device") return null;
  return <div style={{ width: "100%", display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>{[...new Set(langs)].map((lang) => <label key={lang}>
    {lang.toUpperCase()} <select aria-label={`${lang} ${tr(["voice", "목소리", "語音"], li)}`} value={cfg.voices?.[lang] || ""} onChange={(e) => setC({ voices: { ...cfg.voices, [lang]: e.target.value } })} style={{ maxWidth: 190 }}>
      <option value="">{tr(["Device default", "기기 기본 목소리", "裝置預設"], li)}</option>
      {voices.filter((v) => v.lang.toLowerCase().startsWith(lang)).map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
    </select> <button type="button" onClick={() => speakTTS(VOICE_SAMPLE[lang] || VOICE_SAMPLE.en, lang, cfg)}>{tr(["Preview", "미리 듣기", "試聽"], li)}</button>
  </label>)}</div>;
}
function InterpreterWindow({ li, open, onClose, docked, onToggleDock }) {
  const floating = useFloatingPanel("gs:interpreter-window", dockDefaultRect("interpreter"));
  const [full, setFull] = useState(false), [fold, setFold] = useState(false), [fs, setFs] = useState(3);
  const [cfg, setCfg] = useState(() => { try { return { engine: "device", speed: 1, autoRead: true, review: true, ...JSON.parse(localStorage.getItem("gs:interpreter-settings") || "{}") }; } catch { return { engine: "device", speed: 1, autoRead: true, review: true }; } });
  const setC = (patch) => setCfg((c) => { const next = { ...c, ...patch }; try { localStorage.setItem("gs:interpreter-settings", JSON.stringify(next)); } catch {} return next; });
  useEffect(() => { if (open) warmUp(["gpt-translate", "whisper", ...(cfg.engine === "openai" ? ["tts"] : [])]); }, [open, cfg.engine]);
  return <div className={`gs-interpreter-window${docked ? " gs-docked" : ""}`} onPointerDownCapture={floating.focus} data-noprint data-notrans style={{ position: "fixed", ...floating.style, ...(full ? { left: 0, top: 0, width: "100vw", height: "100dvh" } : {}), ...(fold ? { height: "auto" } : {}), display: open ? "flex" : "none", flexDirection: "column", background: "white", border: `1px solid ${T.rule}`, borderRadius: 10, boxShadow: "0 4px 18px #16202a38", ...(docked && !full ? dockedWindowStyle : {}) }}>
    <div onPointerDown={full || docked ? undefined : floating.move} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, padding: 8, cursor: docked ? "default" : "move", touchAction: docked ? "auto" : "none", borderBottom: `1px solid ${T.rule}` }}>
      <DockSwitch docked={docked} onClick={() => { setFull(false); setFold(false); onToggleDock(); }} li={li} />
      <strong style={{ flex: 1 }}>🎤 {tr(["Interpreter", "통역", "口譯"], li)}</strong>
      <button onClick={() => setFs((v) => Math.max(0, v - 1))}>A−</button><button onClick={() => setFs((v) => Math.min(FS_STEPS.length - 1, v + 1))}>A+</button>
      <button onClick={() => setFull((v) => !v)}>{full ? "⤡" : "⤢"}</button><button onClick={() => setFold((v) => !v)}>{fold ? "▴" : "▾"}</button><button onClick={onClose} aria-label={tr(["Close interpreter", "통역창 닫기", "關閉口譯"], li)}>✕</button>
    </div>
    <div style={{ display: fold ? "none" : "flex", flex: 1, minHeight: 0, overflow: "auto", padding: 10 }}>
      <InterpreterSection li={li} px={FS_STEPS[fs]} cfg={cfg} setC={setC} open={open} />
    </div>
    {!docked && !full && !fold && floating.handles}
  </div>;
}

function TranslateDock({ li, open, onClose, noteBridge, flash, docked, onToggleDock }) {
  const t = (en, ko, zh) => tr([en, ko, zh], li);
  const [cfg, setCfg] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(TRANS_KEY) || "{}") || {}; } catch {}
    const { hideKo, noteMode, ...rest } = saved;           // 예전 설정(한글 숨김·설명 박스 내용)은 '표시 언어'로 합쳐졌다
    return { ...TRANS_DEFAULTS, ...rest, source: FIELD_LANGUAGES.includes(rest.source) ? rest.source : "ko", secTrans: true, secInterp: false,
      show: { ...TRANS_DEFAULTS.show, ...(rest.show || {}), ...(hideKo ? { ko: false } : {}) } };
  });
  const setC = (patch) => setCfg((c) => {
    const n = { ...c, ...patch };
    try { localStorage.setItem(TRANS_KEY, JSON.stringify(n)); } catch {}
    return n;
  });
  const [buf, setBuf] = useState("");
  const [history, setHistory] = useState([]);          // 각 메모는 원문 언어와 번역 목표를 함께 기억한다
  const [full, setFull] = useState(false);             // 큰 화면
  const [fold, setFold] = useState(false);             // 접기
  const [showSet, setShowSet] = useState(false);
  const [copied, setCopied] = useState("");
  const [tick, setTick] = useState(0);
  const [tier, setTier] = useState(getTier);           // 자동 | 일반 | 정밀
  const [meta, setMeta] = useState(null);              // 마지막 번역의 모델·걸린 시간
  const [editing, setEditing] = useState(null);        // 번역문을 고치는 중: { key, sent, lg, value }
  const [gloss, setGloss] = useState(() => { try { return localStorage.getItem(GLOSS_KEY) || ""; } catch { return ""; } });
  const [cmp, setCmp] = useState({ text: "", to: "en", busy: false, res: null });   // 번역 비교(일반 vs 정밀)
  const [glOpen, setGlOpen] = useState(false);                                          // 기본 용어집 보기
  const [glQ, setGlQ] = useState("");
  const tm = useRef({});                               // 메모 ID → 언어별 번역과 오류
  const inflight = useRef(new Set());
  const jobs = useRef([]);
  const active = useRef(0);
  const spoken = useRef(new Set());                    // 이미 읽은 메모 ID
  const composing = useRef(false);
  const taRef = useRef(null);
  const listRef = useRef(null);
  const sp = useSpeaker();
  const keyboard = useMemoKeyboard();
  const floating = useFloatingPanel("gs:translation-window", dockDefaultRect("translate"));
  const vp = useKeyboardInset(open);
  const [noteLabel, setNoteLabel] = useState("");                // 설명 박스가 붙을 대상(아버지 …)
  const [noteBusy, setNoteBusy] = useState(false);
  const [assistOn, setAssistOn] = useState(assistShown);
  const [hasBridge, setHasBridge] = useState(false);              // 가계도 화면이 열려 있어 박스를 만들 수 있는가
  useEffect(() => {
    const upd = () => { setNoteLabel(noteBridge && noteBridge.current ? noteBridge.current.label || "" : ""); setHasBridge(!!(noteBridge && noteBridge.current)); };
    upd(); window.addEventListener("gs-note-target", upd);
    return () => window.removeEventListener("gs-note-target", upd);
  }, []);
  useEffect(() => {
    const onMeta = (e) => setMeta(e.detail);
    window.addEventListener("gs-trans-meta", onMeta);
    return () => window.removeEventListener("gs-trans-meta", onMeta);
  }, []);
  /* 띠를 열면 함수를 미리 깨운다(비용 없음) — 첫 문장의 지연을 줄인다 */
  useEffect(() => {
    if (!open) return;
    const names = ["gpt-translate"];
    if (cfg.read !== "off" && cfg.engine === "openai") names.push("tts");
    warmUp(names);
  }, [open, cfg.read, cfg.engine]);

  const tail = "";
  const seq = history;
  const seqKey = seq.map((m) => m.id).join("\u0001");


  useEffect(() => { if (!open) Speaker.stop(); }, [open]);

  /* 한 번 제출한 메모의 언어 쌍은 이후 설정을 바꿔도 그대로 유지한다. */
  const makeMemo = (text) => ({ id: uid(), text, source: cfg.source,
    targets: FIELD_LANGUAGES.filter((l) => l !== cfg.source && cfg.show[l]) });
  const put = (k, patch) => { tm.current = { ...tm.current, [k]: { ...(tm.current[k] || {}), ...patch } }; setTick((x) => x + 1); };
  const pump = () => {
    while (active.current < 6 && jobs.current.length) {
      const job = jobs.current.shift();
      active.current++;
      (async () => { try { await job(); } finally { active.current--; pump(); } })();
    }
  };
  const request = (memo, ctx) => {
    const e = tm.current[memo.id] || {};
    [...memo.targets].sort((a, b) => Number(b === cfg.read) - Number(a === cfg.read)).forEach((lg) => {
      const id = lg + "|" + memo.id;
      if (e[lg] || e[lg + "Err"] || inflight.current.has(id)) return;
      inflight.current.add(id);
      jobs.current.push(async () => {
        try { put(memo.id, { [lg]: await gptTranslateStrict(memo.text, GPT_LANG[LANG_IDX[memo.source]], GPT_LANG[LANG_IDX[lg]], ctx, { use: "strip" }), [lg + "Err"]: false }); }
        catch (err) { console.error(err); put(memo.id, { [lg + "Err"]: true }); }
        finally { inflight.current.delete(id); }
      });
    });
    pump();
  };
  const ctxOf = (i) => seq.slice(Math.max(0, i - 2), i).filter((m) => m.source === seq[i]?.source).map((m) => m.text).join(" ");

  useEffect(() => { seq.forEach((memo, i) => request(memo, ctxOf(i))); }, [seqKey]);
  /* 읽기는 선택한 출력 언어에 한하여 메모마다 한 번씩 시작한다. */
  useEffect(() => {
    if (cfg.read === "off") { seq.forEach((m) => spoken.current.add(m.id)); return; }
    for (const memo of seq) {
      if (spoken.current.has(memo.id)) continue;
      const langs = (cfg.read === "both" ? ["en", "zh"] : [cfg.read]).filter((l) => memo.targets.includes(l));
      const e = tm.current[memo.id] || {};
      if (!langs.every((l) => e[l] || e[l + "Err"])) break;
      langs.forEach((l) => { if (e[l]) { const r = splitSentences(e[l]); [...r.done, ...(r.tail ? [r.tail] : [])].forEach((part) => Speaker.say(part, l, cfg)); } });
      spoken.current.add(memo.id);
    }
  }, [seqKey, tick, cfg.read]);

  /* 새 문장이 생기면 맨 아래로 */
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [seqKey, tail, tick, full]);

  /* 원문과 선택한 번역들을 하나의 설명 박스로 보낸다. */
  const composeNote = (memo) => {
    const lines = memo.targets.map((l) => tm.current[memo.id]?.[l]).filter(Boolean);
    return lines.length ? `${memo.text}\n\n${BLOCK_MARK}${lines.join("\n")}` : memo.text;
  };
  const toNote = async (memo) => {
    if (!noteBridge?.current || !memo || noteBusy) return false;
    setNoteBusy(true);
    request(memo, "");
    const need = () => memo.targets.some((l) => !tm.current[memo.id]?.[l] && !tm.current[memo.id]?.[l + "Err"]);
    for (let n = 0; n < 100 && need(); n++) await new Promise((r) => setTimeout(r, 100));
    if (memo.targets.some((l) => !tm.current[memo.id]?.[l])) {
      setNoteBusy(false);
      flash?.(t("Translation is incomplete. Retry before adding.", "번역이 완료되지 않았습니다. 다시 번역한 뒤 추가해 주세요.", "翻譯尚未完成，請重試後再新增。"));
      return false;
    }
    const okAdd = noteBridge.current.add(composeNote(memo));
    setNoteBusy(false);
    if (flash) flash(okAdd ? t("Added an annotation box", "설명 박스를 만들었습니다", "已新增說明框") : t("Could not add the box", "설명 박스를 만들 수 없습니다", "無法新增說明框"));
    return okAdd;
  };
  const setRead = (v) => {           // 읽을 언어는 화면에도 보이게 켠다(들리는 것은 보이게)
    Speaker.unlock(); seq.forEach((m) => spoken.current.add(m.id));
    const need = v === "both" ? ["en", "zh"] : v === "off" ? [] : [v];
    setC({ read: v, show: { ...cfg.show, ...Object.fromEntries(need.map((l) => [l, true])) } });
  };
  const toggleShow = (l) => {        // 출력 언어는 하나 이상 선택한다
    const on = cfg.show[l];
    if (on && !FIELD_LANGUAGES.some((k) => k !== l && k !== cfg.source && cfg.show[k])) return;
    setC({ show: { ...cfg.show, [l]: !on } });
  };
  const setSource = (source) => {
    const targets = FIELD_LANGUAGES.filter((l) => l !== source && cfg.show[l]);
    const show = targets.length ? cfg.show : { ...cfg.show, [FIELD_LANGUAGES.find((l) => l !== source)]: true };
    setC({ source, show, read: cfg.read === source ? "off" : cfg.read });
  };
  const changeTier = (v) => { setTierPref(v); setTier(v); };
  const onGloss = (v) => { setGloss(v); try { localStorage.setItem(GLOSS_KEY, v); } catch {} };
  const saveEdit = () => {
    if (!editing) return;
    const v = editing.value.trim();
    if (v) put(editing.memo.id, { [editing.lg]: v, [editing.lg + "Edited"]: true });
    setEditing(null);
  };
  const runCompare = async () => {
    const text = cmp.text.trim();
    if (!text) return;
    setCmp((c) => ({ ...c, busy: true, res: null }));
    const target = cmp.to === cfg.source ? FIELD_LANGUAGES.find((l) => l !== cfg.source) : cmp.to;
    const one = async (tr2) => { try { return await gptTranslateRaw(text, GPT_LANG[LANG_IDX[cfg.source]], GPT_LANG[LANG_IDX[target]], "", { tier: tr2, silent: true }); } catch (e) { return { err: true }; } };
    const [a, b] = await Promise.all([one("std"), one("pro")]);
    setCmp((c) => ({ ...c, busy: false, res: { std: a, pro: b } }));
  };
  const sendAll = () => {
    const text = buf.trim();
    if (!text) return;
    Speaker.unlock();
    const memo = makeMemo(text);
    if (!memo.targets.length) { flash?.(t("Select an output language", "출력 언어를 선택해 주세요", "請選擇目標語言")); return; }
    setHistory((h) => [...h, memo].slice(-200));
    setBuf("");
  };
  const sendToNote = async () => {
    const text = buf.trim(); if (!text) return;
    const memo = makeMemo(text);
    if (!memo.targets.length) { flash?.(t("Select an output language", "출력 언어를 선택해 주세요", "請選擇目標語言")); return; }
    if (await toNote(memo)) { setHistory((h) => [...h, memo].slice(-200)); setBuf(""); }
  };
  const onKey = (e) => keyboard.onKeyDown(e, sendAll, setBuf);
  const retry = (memo, lg) => { put(memo.id, { [lg + "Err"]: false }); request(memo, ctxOf(seq.indexOf(memo))); };
  const copy = async (k, text) => { try { await navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(""), 1200); } catch {} };
  const clearAll = () => { Speaker.stop(); setHistory([]); setBuf(""); tm.current = {}; spoken.current = new Set(); setTick((x) => x + 1); };

  const px = FS_STEPS[Math.min(cfg.fs + (full ? 3 : 0), FS_STEPS.length - 1)];
  const rows = seq;
  const tierName = (v) => t(v === "std" ? "Standard" : "Precise", v === "std" ? "일반" : "정밀", v === "std" ? "一般" : "精準");

  /* 번역 결과 한 줄 — 언어가 바뀌어도 메모의 원문 쌍을 유지한다. */
  const line = (lg, e, memo) => {
    const label = { ko: "KO", en: "EN", zh: "中", fr: "FR", th: "TH", km: "KM" }[lg];
    const txt = e[lg];
    const key = lg + "|" + memo.id;
    const isEd = editing && editing.key === key;
    return (
      <div key={lg} className={"gs-trans-" + lg} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginTop: 1 }}>
        <span style={{ flexShrink: 0, minWidth: 16, fontSize: 9, fontWeight: 700, color: T.pine, paddingTop: px * 0.2, fontFamily: FB }}>{label}</span>
        <div style={{ flex: 1, fontSize: scaleOf(lg, px), lineHeight: lhOf(lg, 1.2), fontFamily: FB, color: T.ink, whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: txt ? 1 : 0.55 }}>
          {isEd ? (
            <textarea autoFocus className="gs-trans-edit" value={editing.value} rows={Math.min(4, Math.max(1, Math.ceil(editing.value.length / 40)))}
              onChange={(ev) => setEditing({ ...editing, value: ev.target.value })} onBlur={saveEdit}
              onKeyDown={(ev) => { if (ev.key === "Escape") setEditing(null); else if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) { ev.preventDefault(); saveEdit(); } }}
              style={{ width: "100%", boxSizing: "border-box", fontSize: scaleOf(lg, px), fontFamily: FB, border: `1px solid ${T.pine}`, borderRadius: 6, padding: "1px 5px", resize: "none", outline: "none", lineHeight: lhOf(lg, 1.2) }} />
          ) : (txt || (e[lg + "Err"]
            ? <button type="button" onClick={() => retry(memo, lg)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer", fontSize: 10.5, fontFamily: FB, padding: 0 }}>⚠ {t("Failed — tap to retry", "번역 실패 — 눌러서 다시", "翻譯失敗 — 點此重試")}</button>
            : "…"))}
          {e[lg + "Edited"] && !isEd && <span style={{ fontSize: 9, color: T.mute, marginLeft: 4 }}>{t("(edited)", "(수정함)", "（已修改）")}</span>}
        </div>
        {txt && !isEd && (
          <>
            <button type="button" className="gs-trans-editbtn" title={t("Edit this translation", "이 번역 고치기", "修改此翻譯")} onClick={() => setEditing({ key, memo, lg, value: txt })}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 10.5, color: T.mute, fontFamily: FB, padding: "0 2px" }}>✎</button>
            <button type="button" title={t("Copy", "복사", "複製")} onClick={() => copy(key, txt)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 10.5, color: T.mute, fontFamily: FB, padding: "0 2px" }}>{copied === key ? "✓" : "⧉"}</button>
            <button type="button" title={t("Read aloud", "읽어 주기", "朗讀")} onClick={() => speakTTS(txt, lg, cfg)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: T.pine, padding: "0 2px" }}>🔊</button>
          </>
        )}
      </div>
    );
  };

  const box = { position: "fixed", ...floating.style, ...(full ? { left: 0, top: vp.top || 0, width: "100vw", height: vp.height || "100dvh" } : {}),
    ...(fold ? { height: "auto" } : {}), background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 10,
    boxShadow: "0 4px 18px rgba(22,32,42,.22)", display: "flex", flexDirection: "column" };
  const chip = (on) => ({ border: `1px solid ${on ? T.pine : T.rule}`, background: on ? T.pine : "#fff", color: on ? "#fff" : T.ink2,
    borderRadius: 6, cursor: "pointer", fontSize: 10.5, fontFamily: FB, fontWeight: 600, padding: "1px 6px", whiteSpace: "normal", lineHeight: 1.35 });
  const lab = { fontSize: 10, color: T.mute, fontFamily: FB, marginLeft: 2 };
  const inp = { border: `1px solid ${T.rule}`, borderRadius: 5, fontSize: 10.5, padding: "1px 3px" };
  const metaText = meta ? `⏱ ${t("Last translation", "최근 번역", "最近翻譯")} ${(meta.ms / 1000).toFixed(1)}${t("s", "초", "秒")} · ${meta.model || "?"}${meta.fast ? " · fast" : ""}` : "";
  const glossCount = parseGlossary(gloss).length;

  return (
    <div className={`gs-trans${docked ? " gs-docked" : ""}`} onPointerDownCapture={floating.focus} data-noprint data-notrans style={{ ...box, ...(docked && !full ? dockedWindowStyle : {}), display: open ? box.display : "none" }}>
      <div className="gs-trans-head" onPointerDown={full || docked ? undefined : floating.move} style={{ cursor: full || docked ? "default" : "move", touchAction: docked ? "auto" : "none", ...{ display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", flexWrap: "wrap", borderBottom: fold || (!cfg.secTrans) ? `1px solid ${T.rule}` : "none" } }}>
        <span style={{ fontFamily: FD, fontSize: 12, fontWeight: 600, color: T.ink, marginRight: 1 }}>🌐</span>
        <DockSwitch docked={docked} onClick={() => { setFull(false); setFold(false); onToggleDock(); }} li={li} />
        <span className="gs-sec-btn-trans" style={{ fontWeight: 700 }}>{t("Translate", "번역", "翻譯")}</span>

        <select value={cfg.read} onChange={(e) => setRead(e.target.value)} title={t("Read aloud", "자동 읽기", "自動朗讀")}
          style={{ border: `1px solid ${T.rule}`, borderRadius: 6, padding: "1px 3px", fontSize: 10.5, fontFamily: FB, color: T.ink, background: "#fff" }}>
          <option value="off">🔇 {t("Read: off", "읽기 끔", "不朗讀")}</option>
          {FIELD_LANGUAGES.filter((l) => l !== cfg.source).map((l) => <option key={l} value={l}>🔊 {tr(SHOW_NAME[l], li)}</option>)}
          <option value="both">🔊 {t("Read both", "영어·중국어 읽기", "英文與中文")}</option>
        </select>
        {(sp.playing || sp.pending > 0) && (
          <button type="button" onClick={() => Speaker.stop()} style={{ ...chip(false), color: T.red, borderColor: T.red }}>■ {t("Stop", "멈춤", "停止")}</button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" title={t("Smaller", "작게", "縮小")} onClick={() => setC({ fs: Math.max(0, cfg.fs - 1) })} style={chip(false)}>A−</button>
        <button type="button" title={t("Larger", "크게", "放大")} onClick={() => setC({ fs: Math.min(FS_STEPS.length - 1, cfg.fs + 1) })} style={chip(false)}>A+</button>
        <button type="button" onClick={() => setFull((v) => !v)} style={chip(full)}>{full ? "⤡ " + t("Small", "작게 보기", "縮小檢視") : "⤢ " + t("Big screen", "큰 화면", "大畫面")}</button>

        <button type="button" onClick={() => setShowSet((v) => !v)} style={chip(showSet)}>⚙</button>
        {!full && <button type="button" onClick={() => setFold((v) => !v)} style={chip(false)}>{fold ? "▴" : "▾"}</button>}
        <button type="button" onClick={onClose} style={{ ...chip(false), fontSize: 11, padding: "0 6px" }}>✕</button>
      </div>

      {cfg.secTrans && !fold && (
        <div className="gs-trans-bar" style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", flexWrap: "wrap", borderBottom: `1px solid ${T.rule}`, background: T.paper }}>
          <label style={lab}>{t("Source", "원문", "原文")}{" "}
            <select aria-label={t("Source language", "원문 언어", "原文語言")} value={cfg.source} onChange={(e) => setSource(e.target.value)} style={inp}>
              {FIELD_LANGUAGES.map((l) => <option key={l} value={l}>{tr(SHOW_NAME[l], li)}</option>)}
            </select>
          </label>
          <span style={lab}>{t("Output", "출력", "輸出")}</span>
          {FIELD_LANGUAGES.filter((l) => l !== cfg.source).map((l) => (
            <button key={l} type="button" className={"gs-show-" + l} onClick={() => toggleShow(l)} style={chip(cfg.show[l])}>{tr(SHOW_NAME[l], li)}</button>
          ))}
          <span style={{ ...lab, marginLeft: 6 }}>{t("Quality", "품질", "品質")}</span>
          {[["auto", t("Auto", "자동", "自動"), t("By situation: sentences and interpreting use Standard, long text uses Precise", "장면에 맞게: 문장·통역은 일반, 긴 글은 정밀", "依情境：句子與口譯用一般，長文用精準")],
            ["std", t("Standard", "일반", "一般"), t("Faster and cheaper", "더 빠르고 저렴", "更快、更省")],
            ["pro", t("Precise", "정밀", "精準"), t("Most accurate", "가장 정확", "最精準")]].map(([v, name, tip]) => (
            <button key={v} type="button" className={"gs-tier-" + v} title={tip} onClick={() => changeTier(v)} style={chip(tier === v)}>{name}</button>
          ))}
          <span className="gs-trans-meta" title={t("Time of the last translation and the model that answered", "마지막 번역이 걸린 시간과 답한 모델", "最近一次翻譯的耗時與模型")}
            style={{ marginLeft: "auto", fontSize: 9.5, color: T.mute, fontFamily: FM }}>{metaText}{meta ? ` · ${tierName(meta.tier)}` : ""}</span>
        </div>
      )}


      {!fold && (
        <div className="gs-trans-body" style={{ display: "flex", flexWrap: "wrap", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {cfg.secTrans && (
            <div className="gs-sec-trans" style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div ref={listRef} className="gs-trans-list" style={{ flex: 1, minHeight: 90, maxHeight: "none", overflowY: "auto", padding: "1px 8px" }}>
                {rows.length === 0 && <div style={{ padding: "5px 2px", fontSize: 10.5, color: T.mute, fontFamily: FB }}>{t("Choose source and output languages, then translate the memo.", "원문·출력 언어를 고른 뒤 여러 문장을 한 번에 번역하세요.", "選擇原文與目標語言後，整段翻譯。")}</div>}
                {rows.map((r) => {
                  const e = tm.current[r.id] || {};
                  return (
                    <div key={r.id} className="gs-trans-row" style={{ padding: "2px 2px 3px", borderBottom: `1px solid ${T.rule}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="gs-trans-source" style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: r.source === "km" ? 11.5 : 10, lineHeight: lhOf(r.source, 1.3), color: T.mute, fontFamily: FB }}><b>{tr(SHOW_NAME[r.source], li)}</b> {r.text}</div>
                        {hasBridge && (
                          <button type="button" className="gs-trans-tonote" title={t("Send to an annotation box", "선택한 표시 언어를 가계도에 하나의 설명 박스로 추가합니다", "送到說明框") + (noteLabel ? ` → ${noteLabel}` : "")}
                            onClick={() => toNote(r)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 10, color: T.pine, fontFamily: FB, padding: 0 }}>▤ {t("Add annotation", "설명 박스로 추가", "新增說明框")}{noteLabel ? ` → ${noteLabel}` : ""}</button>
                        )}
                      </div>
                      {r.targets.map((l) => line(l, e, r))}
                    </div>
                  );
                })}
              </div>
              <div style={{ order: -1, padding: "8px 6px", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end", borderTop: `1px solid ${T.rule}` }}>
                <textarea ref={taRef} value={buf} onChange={(e) => setBuf(e.target.value)} onKeyDown={onKey} onKeyUp={keyboard.onKeyUp} onBlur={keyboard.onBlur}
                  onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
                  rows={5}
                  placeholder={t("Enter: translate · Space + Enter: new line", "Enter: 번역 · 스페이스+Enter: 줄바꿈", "Enter：翻譯 · 空白鍵+Enter：換行")}
                  style={{ flex: "1 1 100%", boxSizing: "border-box", border: `1px solid ${T.rule}`, borderRadius: 7, padding: "7px", fontSize: scaleOf(cfg.source, px), lineHeight: lhOf(cfg.source, 1.25), fontFamily: FB, resize: "vertical", outline: "none", minHeight: 100, maxHeight: "40vh" }} />
                {hasBridge && (
                  <button type="button" className="gs-trans-note-all" onClick={sendToNote} disabled={!buf.trim() || noteBusy} title="선택한 표시 언어를 가계도에 하나의 설명 박스로 추가합니다"
                    style={{ border: `1px solid ${T.pine}`, borderRadius: 7, padding: "3px 7px", cursor: "pointer", background: "#fff", color: T.pine, fontSize: 10.5, fontFamily: FB, fontWeight: 600, opacity: buf.trim() ? 1 : 0.4, whiteSpace: "normal" }}>
                    ▤ {t("Add annotation", "설명 박스로 추가", "新增說明框")}{noteLabel ? ` (${noteLabel})` : ""}
                  </button>
                )}
                <button type="button" onClick={sendAll} disabled={!buf.trim()}
                  style={{ border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", background: T.pine, color: "#fff", fontSize: 11, fontFamily: FB, fontWeight: 600, opacity: buf.trim() ? 1 : 0.4 }}>
                  {t("Translate", "번역", "翻譯")}
                </button>
              </div>
            </div>
          )}

        </div>
      )}
      {!fold && (
        <details className="gs-trans-settings" open={showSet} onToggle={(e) => setShowSet(e.currentTarget.open)} style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "4px 8px", background: T.paper, borderBottom: `1px solid ${T.rule}`, fontSize: 10.5, fontFamily: FB, color: T.ink2, alignItems: "center", maxHeight: "40%", flexShrink: 0, overflowY: "auto" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, padding: 5 }}>{t("Reading settings · comparison · glossary", "읽기 설정 · 번역 비교 · 용어집", "朗讀設定 · 翻譯比較 · 詞彙表")}</summary>
          <label style={{ display: "flex", alignItems: "center", gap: 5 }}>{t("Voice", "음성", "語音")}
            <select value={cfg.engine} onChange={(e) => setC({ engine: e.target.value })} style={inp}>
              <option value="openai">{t("High quality (OpenAI)", "고품질 (OpenAI)", "高品質 (OpenAI)")}</option>
              <option value="device">{t("This device", "기기 음성", "裝置語音")}</option>
            </select></label>
          <label style={{ display: "flex", alignItems: "center", gap: 5 }}>{t("Speed", "속도", "速度")}
            <select value={cfg.speed} onChange={(e) => setC({ speed: +e.target.value })} style={inp}>
              <option value={0.85}>{t("Slow", "느리게", "慢")}</option><option value={1}>{t("Normal", "보통", "正常")}</option><option value={1.15}>{t("Fast", "빠르게", "快")}</option>
            </select></label>
          <VoiceChoices cfg={cfg} setC={setC} langs={FIELD_LANGUAGES.filter((l) => l !== cfg.source)} li={li} />
          <label style={{ display: "flex", alignItems: "center", gap: 5 }}><input type="checkbox" checked={assistOn} className="gs-assist-toggle"
            onChange={(e) => { try { localStorage.setItem("gs:assist", e.target.checked ? "on" : "off"); } catch {} setAssistOn(e.target.checked); window.dispatchEvent(new Event("gs-assist-cfg")); }} />
            {t("Show the 🌐 button in text fields (Alt+Enter always works)", "글칸에 🌐 번역 단추 표시 (Alt+Enter는 늘 됨)", "在文字欄顯示 🌐 按鈕（Alt+Enter 隨時可用）")}</label>
          <button type="button" onClick={clearAll} style={{ ...chip(false), marginLeft: "auto" }}>{t("Clear all", "기록 지우기", "清除記錄")}</button>
          {HAS_AI && <button type="button" onClick={changeUserCode} style={chip(false)} title={t("Switch to a different user's access code on this device", "이 기기에서 다른 사용자의 접근 코드로 바꿉니다", "在此裝置切換為其他使用者的存取碼")}>{t("Change user code", "사용자 코드 변경", "更換使用者代碼")}</button>}

          <div style={{ flex: "1 1 100%", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontWeight: 700, color: T.ink }}>{t("My glossary", "내 용어집", "我的詞彙表")} <span style={{ fontWeight: 400, color: T.mute }}>— {t("one per line: Korean = English = Chinese (a blank language keeps the built-in term)", "한 줄에 하나: 한국어 = 영어 = 中文 (비운 언어는 기본 용어집 값을 씀)", "每行一組：韓文 = 英文 = 中文（留空的語言沿用內建詞彙）")} · {glossCount}{t(" applied", "개 적용", "組已套用")}</span></div>
            <textarea className="gs-gloss" value={gloss} onChange={(e) => onGloss(e.target.value)} rows={2}
              placeholder={"전환기 = transition = 轉換期\n원가족 = family of origin = 原生家庭"}
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.rule}`, borderRadius: 6, padding: "3px 6px", fontSize: 10.5, fontFamily: FM, resize: "vertical", outline: "none", lineHeight: 1.25 }} />
          </div>

          <div style={{ flex: "1 1 100%", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button type="button" className="gs-gl-toggle" onClick={() => setGlOpen((v) => !v)} style={chip(glOpen)}>{t("Built-in glossary", "기본 용어집", "內建詞彙表")} · {GLOSSARY.length}</button>
              <span style={{ color: T.mute }}>{t("Terms found in the source are applied automatically; yours override these.", "원문에 있는 용어만 골라 자동으로 적용합니다. 내 용어집이 우선합니다.", "自動套用原文出現的詞彙；我的詞彙表優先。")}</span>
            </div>
            {glOpen && (() => {
              const q = glQ.trim().toLowerCase();
              const rows = GLOSSARY.filter((e) => !q || [e.id, e.ko, e.en, e.zh, e.fr || "", e.th || "", e.km || "", e.desc || "", ...((e.alt && e.alt.ko) || []), ...((e.alt && e.alt.en) || []), ...((e.alt && e.alt.fr) || [])].join(" ").toLowerCase().includes(q));
              const loc = LANGS[li] && li >= BASE_LANG_COUNT ? LANGS[li].id : "";     // 화면 언어가 언어팩 언어이면 그 언어의 용어를 함께 보인다
              return (
                <div className="gs-gl-view" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <input className="gs-gl-q" value={glQ} onChange={(e) => setGlQ(e.target.value)} placeholder={t("Search terms", "용어 검색", "搜尋詞彙")}
                    style={{ border: `1px solid ${T.rule}`, borderRadius: 6, padding: "2px 6px", fontSize: 11, fontFamily: FB, outline: "none" }} />
                  <div style={{ maxHeight: full ? "40vh" : "22vh", overflowY: "auto", border: `1px solid ${T.rule}`, borderRadius: 6, background: "#fff" }}>
                    {rows.map((e) => (
                      <div key={e.id} className="gs-gl-row" style={{ display: "flex", gap: 8, padding: "2px 6px", borderBottom: `1px solid ${T.rule}`, fontSize: 10.5, lineHeight: 1.25, fontFamily: FB }}>
                        <div style={{ flex: "0 0 30%" }}><b style={{ color: T.ink }}>{e.ko}</b>{e.desc ? <div className="gs-gl-desc" style={{ fontSize: 9.5, color: T.mute, fontWeight: 400 }}>{e.desc}</div> : null}</div>
                        <span style={{ flex: "1 1 34%", color: T.ink2 }}>{e.en}{loc && e[loc] ? <div className="gs-gl-local" style={{ color: T.ink, fontWeight: 600, lineHeight: TALL_LH[loc] || 1.25 }}>{e[loc]}{e.review && e.review[loc] === "draft" ? <i style={{ color: T.amber, marginLeft: 3, fontStyle: "normal", fontWeight: 400 }} title={t("Draft — not yet reviewed, so it is only suggested to the translator", "초안 — 검수 전이라 번역 모델에 참고로만 전달됩니다", "草稿——尚未審查，僅供翻譯參考")}>◌</i> : null}</div> : null}</span>
                        <span style={{ flex: "0 0 26%", color: T.ink2 }}>{e.zh}{(e.verify || []).includes("zh") ? <i style={{ color: T.amber, marginLeft: 3, fontStyle: "normal" }} title={t("Chinese term awaiting review", "중국어 검수 필요", "中文待審")}>?</i> : null}{e.ambiguous ? <i style={{ color: T.mute, marginLeft: 3, fontStyle: "normal" }} title={t("Overlaps with everyday words — used with a note", "일상어와 겹침 — 주의사항과 함께 전달", "與日常用語重疊，附註使用")}>≈</i> : null}</span>
                      </div>
                    ))}
                    {rows.length === 0 && <div style={{ padding: "4px 6px", color: T.mute }}>{t("No match", "없음", "無符合")}</div>}
                  </div>
                </div>
              );
            })()}
          </div>

          <details style={{ width: "100%", marginTop: 8 }}><summary style={{ cursor: "pointer" }}>{t("Translation comparison", "번역 비교", "翻譯比較")}</summary>
            <div style={{ fontWeight: 700, color: T.ink }}>{t("Compare Standard and Precise", "번역 비교 (일반 vs 정밀)", "比較一般與精準")} <span style={{ fontWeight: 400, color: T.mute }}>— {t("see both results and their times side by side", "같은 문장을 두 등급으로 번역해 결과와 시간을 나란히 봅니다", "同一句以兩種等級翻譯，並排看結果與耗時")}</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input className="gs-cmp-text" value={cmp.text} onChange={(e) => setCmp({ ...cmp, text: e.target.value })} placeholder={t("A sentence", "비교할 문장", "欲比較的句子")}
                style={{ flex: "1 1 200px", border: `1px solid ${T.rule}`, borderRadius: 6, padding: "2px 6px", fontSize: 11, fontFamily: FB, outline: "none" }} />
              <select value={cmp.to === cfg.source ? FIELD_LANGUAGES.find((l) => l !== cfg.source) : cmp.to} onChange={(e) => setCmp({ ...cmp, to: e.target.value })} style={inp}>
                {FIELD_LANGUAGES.filter((l) => l !== cfg.source).map((l) => <option key={l} value={l}>{tr(SHOW_NAME[l], li)}</option>)}
              </select>
              <button type="button" className="gs-cmp-run" onClick={runCompare} disabled={cmp.busy || !cmp.text.trim()} style={{ ...chip(true), opacity: cmp.busy || !cmp.text.trim() ? 0.5 : 1 }}>{cmp.busy ? "…" : t("Compare", "비교", "比較")}</button>
            </div>
            {cmp.res && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["std", "pro"].map((k) => {
                  const r = cmp.res[k];
                  return (
                    <div key={k} className={"gs-cmp-" + k} style={{ flex: "1 1 200px", border: `1px solid ${T.rule}`, borderRadius: 6, padding: "3px 6px", background: "#fff" }}>
                      <div style={{ fontSize: 9.5, color: T.mute, fontFamily: FM }}>{tierName(k)}{r && !r.err ? ` · ${(r.ms / 1000).toFixed(1)}${t("s", "초", "秒")} · ${r.model}` : ""}</div>
                      <div style={{ fontSize: 11.5, fontFamily: FB, color: r && r.err ? T.red : T.ink, marginTop: 1, lineHeight: 1.25 }}>{r && r.err ? t("Failed", "실패", "失敗") : r.text}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </details>
        </details>
      )}
      {!docked && !full && !fold && floating.handles}
    </div>
  );
}

/* ══ 통역 (번역 띠 안의 한 부분) ═════════════════════════════════════════
   예전에는 화면 전체를 덮는 창이었다. 이제는 번역 띠 안에서 보이고 가릴 수 있어서, 통역하면서
   가계도를 그리고 기록할 수 있다. 상담사와 내담자가 각자 말하면 상대의 언어로 번역해 읽어 준다. */
function InterpreterSection({ li, px, cfg, setC, open }) {
  const LANGS = LANG_LABEL.map((l, i) => ({ label: l, code: LANG_CODE[i], idx: i }));

  /* 앱 언어 번호(0 영어·1 한국어·2 중국어)와 통역 언어 목록 번호(0 한국어·1 중국어·2 영어)는 순서가 다르다. */
  const home = { en: 2, ko: 0, zh: 1, th: 3, km: 4, fr: 5 }[LANGS[li]?.id] ?? 0;   // 화면 언어 → 통역창 언어 번호
  const [myLang, setMyLang] = useState(home);                    // 선생님 언어
  const [theirLang, setTheirLang] = useState(home === 0 ? 2 : 0); // 내담자 언어(한국어면 영어부터)
  const [myText, setMyText] = useState("");
  const [theirText, setTheirText] = useState("");
  const [myTrans, setMyTrans] = useState("");        // 내 말 → 상대방 언어
  const [theirTrans, setTheirTrans] = useState(""); // 상대방 말 → 내 언어
  const [recording, setRecording] = useState(null); // "me" | "them" | null
  const [busy, setBusy] = useState(false);
  const mediaRef = useRef(null);
  const alive = useRef(open);
  const starting = useRef(false);
  const operation = useRef(0);
  const [status, setStatus] = useState("");
  const [inputHeight, setInputHeight] = useState(190);
  const keyboard = useMemoKeyboard();
  const playback = useSpeaker();
  const t = (en, ko, zh) => tr([en, ko, zh], li);
  useEffect(() => {
    alive.current = open;
    if (!open) {
      operation.current++; starting.current = false; setBusy(false); setRecording(null);
      const mr = mediaRef.current;
      if (mr) { mr.onstop = null; if (mr.state !== "inactive") mr.stop(); mr.stream.getTracks().forEach((tk) => tk.stop()); mediaRef.current = null; }
    }
    return () => { alive.current = false; };
  }, [open]);
  const chunksRef = useRef([]);
  useEffect(() => () => { const mr = mediaRef.current; if (mr) { mr.onstop = null; if (mr.state !== "inactive") mr.stop(); mr.stream.getTracks().forEach((tk) => tk.stop()); } }, []);          // 통역 부분을 가리면 읽던 것도 멈춘다

  /* 말한 것(또는 친 것)을 문장 단위로 번역해 보여 주고 읽는다. 긴 말도 첫 문장이 먼저 나오고 먼저 읽힌다. */
  const deliver = async (who, text, id = operation.current) => {
    setStatus(t("Translating…", "번역 중…", "翻譯中…"));
    const fromIdx = who === "me" ? myLang : theirLang;
    const toIdx = who === "me" ? theirLang : myLang;
    const setTr = who === "me" ? setMyTrans : setTheirTrans;
    const parts = [];
    setTr("");
    await translateSeq(text, GPT_LANG[fromIdx], GPT_LANG[toIdx], {
      use: "interp",
      onSentence: (i, tx, failed) => {
        if (!alive.current || id !== operation.current) return;
        parts[i] = failed ? `⚠ ${tx}` : tx;
        setTr(parts.filter((x) => x != null).join(" "));
        if (!failed && cfg.autoRead) Speaker.say(tx, LANG_CODE[toIdx], cfg);   // 번역이 안 된 문장은 읽지 않는다
      },
    });
  };

  const startRec = async (who) => {
    if (recording || busy || starting.current) return;
    starting.current = true;
    const id = ++operation.current;
    setStatus(t("Opening microphone…", "마이크 연결 중…", "正在開啟麥克風…"));
    Speaker.unlock();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || id !== operation.current) { stream.getTracks().forEach((tk) => tk.stop()); return; }
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!alive.current || id !== operation.current) return;
        setRecording(null); setBusy(true); setStatus(t("Recognizing speech…", "음성 인식 중…", "語音辨識中…"));
        try {
          const heard = await whisperSTT(new Blob(chunks, { type: mr.mimeType || "audio/webm" }), LANG_CODE[who === "me" ? myLang : theirLang]);
          if (!alive.current || id !== operation.current) return;
          if (who === "me") setMyText(heard); else setTheirText(heard);
          if (!cfg.review) await deliver(who, heard, id);
          setStatus(cfg.review ? t("Review the recognized text, then translate.", "인식된 말을 확인·수정한 뒤 번역해 주세요.", "確認並修改辨識文字後再翻譯。") : "");
        } catch (e) { if (alive.current) setStatus(t("Speech processing failed. Please retry.", "음성 처리에 실패했습니다. 다시 시도해 주세요.", "語音處理失敗，請重試。")); }
        finally { if (alive.current && id === operation.current) setBusy(false); }
      };
      mr.start(); mediaRef.current = mr; setRecording(who);
      setStatus(t("Recording… Click the microphone to finish.", "녹음 중… 마이크를 다시 누르면 끝납니다.", "錄音中…再按麥克風結束。"));
    } catch (e) {
      stream?.getTracks().forEach((tk) => tk.stop());
      setStatus(t("Microphone unavailable. Check browser permission.", "마이크를 사용할 수 없습니다. 브라우저 권한을 확인해 주세요.", "無法使用麥克風，請確認瀏覽器權限。"));
    } finally { starting.current = false; }
  };
  const stopRec = () => {
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mediaRef.current = null; setRecording(null);
  };
  const sendText = async (who) => {
    const text = who === "me" ? myText : theirText;
    if (!text.trim() || busy || recording || starting.current) return;
    const id = ++operation.current;
    Speaker.unlock(); setBusy(true);
    try { await deliver(who, text, id); if (alive.current) setStatus(""); }
    catch { if (alive.current) setStatus(t("Translation failed. Please retry.", "번역에 실패했습니다. 다시 시도해 주세요.", "翻譯失敗，請重試。")); }
    finally { if (alive.current && id === operation.current) setBusy(false); }
  };

  /* 아래 둘은 컴포넌트가 아니라 '그려 주는 함수'다. 컴포넌트로 만들면 글자를 칠 때마다 새 컴포넌트로 취급되어
     입력칸이 통째로 교체되고 커서가 사라진다. */
  const renderMic = (who) => {
    const isRec = recording === who;
    return (
      <button type="button"
        onClick={() => isRec ? stopRec() : startRec(who)}
        disabled={busy || (recording && !isRec)} aria-label={isRec ? t("Stop recording", "녹음 끝내기", "結束錄音") : t("Record", "녹음 시작", "開始錄音")}
        style={{ width: 32, height: 32, borderRadius: 16, border: "none", cursor: "pointer", flexShrink: 0,
          background: isRec ? "#C0392B" : T.pine, color: "#fff", fontSize: 14,
          boxShadow: isRec ? "0 0 0 6px rgba(192,57,43,.25)" : "0 4px 12px rgba(22,32,42,.2)",
          animation: isRec ? "pulse 1s infinite" : "none" }}>
        {isRec ? "⬛" : "🎤"}
      </button>
    );
  };

  const renderSide = ({ who, name, lang, setLang, spoken, translated, onSend }) => (
    <div className="gs-interp-side" style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: FB, fontWeight: 700, fontSize: 11, color: T.ink }}>{name}</span>
        <select disabled={busy || !!recording} value={lang} onChange={(e) => setLang(+e.target.value)}
          style={{ flex: 1, border: `1px solid ${T.rule}`, borderRadius: 6, padding: "1px 4px", fontSize: 10.5, fontFamily: FB, color: T.ink, background: "#fff" }}>
          {LANGS.map((l) => <option key={l.idx} value={l.idx}>{l.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flex: "1 0 auto", gap: 8, alignItems: "stretch" }}>
        <textarea value={spoken}
          onChange={(e) => who === "me" ? setMyText(e.target.value) : setTheirText(e.target.value)}
          onKeyDown={(e) => keyboard.onKeyDown(e, onSend, who === "me" ? setMyText : setTheirText)} onKeyUp={keyboard.onKeyUp} onBlur={keyboard.onBlur}
          placeholder={tr(["Recognized speech / type here · Enter: translate · Space + Enter: new line", "인식된 말 확인·직접 입력 · Enter: 번역 · 스페이스+Enter: 줄바꿈", "辨識文字／直接輸入 · Enter翻譯 · 空白鍵+Enter換行"], li)}
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", border: `1px solid ${T.rule}`, borderRadius: 7, padding: "3px 7px", fontSize: px, lineHeight: 1.5, fontFamily: FB, resize: "vertical", minHeight: inputHeight, height: "100%", outline: "none" }} />
        {renderMic(who)}
      </div>
      <div role="separator" aria-label={t("Resize speech input", "인식된 말 영역 크기 조절", "調整辨識文字區域")} aria-orientation="horizontal" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); setInputHeight((h) => Math.max(140, Math.min(650, h + (e.key === "ArrowDown" ? 20 : -20)))); } }}
        onPointerDown={(e) => { e.preventDefault(); const target = e.currentTarget, y = e.clientY, h = inputHeight; target.setPointerCapture(e.pointerId); const move = (ev) => setInputHeight(Math.max(140, Math.min(650, h + ev.clientY - y))); const end = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", end); target.removeEventListener("pointercancel", end); }; target.addEventListener("pointermove", move); target.addEventListener("pointerup", end); target.addEventListener("pointercancel", end); }}
        style={{ height: 10, flexShrink: 0, cursor: "row-resize", touchAction: "none", background: T.rule, borderRadius: 4 }} />
      <button type="button" onClick={onSend} disabled={busy || !!recording || !spoken.trim()}
        style={{ border: "none", borderRadius: 7, padding: "3px 0", cursor: "pointer", background: T.pine, color: "#fff", fontSize: 11, fontFamily: FB, fontWeight: 600, opacity: busy || !spoken.trim() ? 0.5 : 1 }}>
        {cfg.autoRead ? t("Translate + read aloud →", "번역 + 읽어주기 →", "翻譯並朗讀 →") : t("Translate →", "번역 →", "翻譯 →")}
      </button>
      {translated && (
        <div className="gs-interp-out" style={{ flex: 1, minHeight: 100, whiteSpace: "pre-wrap", overflowY: "auto", background: T.sageSoft, borderRadius: 7, padding: "4px 8px", fontSize: px, fontFamily: FB, color: T.ink, lineHeight: 1.25 }}>
          {translated}
          <button type="button" onClick={() => speakTTS(translated, LANG_CODE[who === "me" ? theirLang : myLang], cfg)}
            style={{ float: "right", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: T.pine, padding: "0 2px" }}>🔊</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="gs-interp" style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100%", gap: 8 }}>
      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 4px rgba(192,57,43,.2); } 50% { box-shadow: 0 0 0 10px rgba(192,57,43,.05); } }`}</style>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 3, gap: 6 }}>
        <span style={{ flex: 1, fontFamily: FD, fontSize: 11.5, fontWeight: 600, color: T.ink }}>🎤 {tr(["Interpreter", "통역", "口譯"], li)}</span>
        <span role="status" style={{ fontSize: 12, color: T.mute }}>{status || (playback.playing ? (playback.phase === "preparing" ? t("Preparing audio…", "음성 준비 중…", "準備語音中…") : t("Playing audio…", "재생 중…", "播放中…")) : "")}</span>
      </div>
      <div style={{ display: "flex", flex: 1, gap: 12, flexWrap: "wrap" }}>
        {renderSide({ who: "me", name: tr(["Counsellor", "상담사", "諮商師"], li), lang: myLang, setLang: setMyLang, spoken: myText, translated: myTrans, onSend: () => sendText("me") })}
        {renderSide({ who: "them", name: tr(["Client", "내담자", "來訪者"], li), lang: theirLang, setLang: setTheirLang, spoken: theirText, translated: theirTrans, onSend: () => sendText("them") })}
      </div>
      <div style={{ marginTop: 3, fontSize: 9.5, color: T.mute, fontFamily: FB, textAlign: "center" }}>
        {tr(["Click 🎤 to start and stop recording. Text appears after recognition.", "🎤를 눌러 녹음을 시작하고 다시 눌러 끝냅니다. 음성 인식이 끝나면 글자가 표시됩니다.", "按 🎤 開始錄音，再按結束。辨識完成後顯示文字。"], li)}
      </div>
      <details style={{ flexShrink: 0, padding: 8, borderTop: `1px solid ${T.rule}` }}><summary style={{ cursor: "pointer" }}>{t("Voice settings", "통역 음성 설정", "口譯語音設定")}</summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 12 }}>
          <label>{t("Voice", "음성", "語音")} <select value={cfg.engine} onChange={(e) => setC({ engine: e.target.value })}><option value="device">{t("Device", "기기 음성", "裝置語音")}</option><option value="openai">{t("High quality (OpenAI)", "고품질 (OpenAI)", "高品質 (OpenAI)")}</option></select></label>
          <label>{t("Speed", "속도", "速度")} <select value={cfg.speed} onChange={(e) => setC({ speed: +e.target.value })}><option value={0.85}>0.85×</option><option value={1}>1×</option><option value={1.15}>1.15×</option></select></label>
          <label><input type="checkbox" checked={cfg.autoRead} onChange={(e) => setC({ autoRead: e.target.checked })} />{t("Read after translation", "번역 후 자동 읽기", "翻譯後朗讀")}</label>
          <label><input type="checkbox" checked={cfg.review} onChange={(e) => setC({ review: e.target.checked })} />{t("Review speech before translating", "말한 내용 확인 후 번역", "確認文字後翻譯")}</label>
          <button onClick={() => Speaker.stop()}>{t("Stop audio", "읽기 멈춤", "停止朗讀")}</button>
          <VoiceChoices cfg={cfg} setC={setC} langs={[LANG_CODE[myLang], LANG_CODE[theirLang]]} li={li} />
          <button onClick={changeUserCode} title={t("Switch to a different user's access code on this device", "이 기기에서 다른 사용자의 접근 코드로 바꿉니다", "在此裝置切換為其他使用者的存取碼")}>{t("Change user code", "사용자 코드 변경", "更換使用者代碼")}</button>
        </div>
      </details>
    </div>
  );
}

function StorageSettings({ li, cases, autosaveOn, setAutosave, deleteAllOnDevice }) {
  const t = (k) => tr(S[k], li);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ marginTop: 18 }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center"
        style={{ gap: 7, background: "transparent", border: "none", cursor: "pointer", padding: "4px 2px",
          fontSize: 12, fontFamily: FB, color: T.mute }}>
        <span style={{ color: T.mute, fontSize: 10 }}>{open ? "▾" : "▸"}</span>
        {t("storageSettings")}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 15, borderRadius: 14, background: "rgba(255,255,255,.9)",
          border: `1px solid ${T.rule}`, boxShadow: "0 4px 14px rgba(22,32,42,.06)" }}>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.48 }}>{t("storageExplain")}</div>

          <div className="flex items-center" style={{ gap: 10, marginTop: 12, padding: "10px 12px",
            background: "#FDF8EC", border: `1px solid ${T.gold}`, borderRadius: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
            <div style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.45 }}>{t("sharedComputerWarn")}</div>
          </div>

          <div className="flex items-center" style={{ gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.rule}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontFamily: FB, fontWeight: 600, color: T.ink }}>{t("autosaveToggle")}</div>
              <div style={{ fontSize: 11, color: T.mute, marginTop: 1 }}>{autosaveOn ? t("autosaveOnNote") : t("autosaveOffNote")}</div>
            </div>
            <button type="button" onClick={() => setAutosave(!autosaveOn)}
              style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                background: autosaveOn ? T.pine : "#D8DED4", transition: "background .15s ease", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: autosaveOn ? 21 : 3, width: 18, height: 18, borderRadius: 9,
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s ease" }} />
            </button>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.rule}` }}>
            <div style={{ fontSize: 12.5, fontFamily: FB, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{t("clearDeviceTitle")}</div>
            <div style={{ fontSize: 11, color: T.mute, marginBottom: 8 }}>
              {tr(["{n} saved case(s) and any unsaved draft on this device.", "이 기기에 저장된 가계도 {n}건과 임시저장 자료.", "此裝置上已儲存的 {n} 個個案與任何未儲存的草稿。"], li).replace("{n}", cases.length)}
            </div>
            {!confirming ? (
              <Btn tone="warn" onClick={() => setConfirming(true)}>{t("clearDeviceBtn")}</Btn>
            ) : (
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontSize: 11.5, color: T.red }}>{t("clearDeviceConfirm")}</span>
                <Btn tone="warn" onClick={() => { deleteAllOnDevice(); setConfirming(false); }}>{t("clearDeviceYes")}</Btn>
                <Btn onClick={() => setConfirming(false)}>{t("clearDeviceNo")}</Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   첫 화면 — 표지와 작업 시작을 한 자리에

   시안 셋을 하나로 합쳤다. 배경은 파란 화면의 옅은 물빛 그러데이션과
   흐르는 결, 'Genogram' 글자는 녹색 화면의 둥근 글꼴, 가계도 기호는
   베이지 화면의 가늘고 정갈한 선. 따로 있던 표지와 시작 화면을 없애고
   여기 한 장에 담았다.

   서명 요소는 여전히 '그려지는 가계도'다. 페인트가 칠해지듯 덮는 대신,
   상담실에서 실제로 그리는 순서대로 — 조부모, 부부선, 자손선, 자녀,
   그리고 마지막에 본인 — 획을 따라 하나씩 나타난다.               */
const CV = {
  ink: "#16273F", inkSoft: "#3D5570", gold: "#A67C34", goldSoft: "#C9A461",
  mist: "#8FA3B5", hair: "#CFE0E6", sky1: "#CBE6EE", sky2: "#E8F4F7", sky3: "#F7FBFC",
};
/* 제목용 명조. Georgia에는 한글이 없어 그대로 두면 굵은 고딕으로 떨어진다.
   맥(AppleMyungjo)과 윈도우(바탕)에 실제로 있는 글꼴을 앞에 세운다. */
const CV_SERIF = "Georgia, 'AppleMyungjo', 'Nanum Myeongjo', 'Noto Serif KR', Batang, '바탕', 'Noto Serif TC', 'PMingLiU', serif";
/* 'Genogram' 글자용 둥근 글꼴. 웹폰트는 index.html에서만 불러오므로,
   그것이 없는 환경에서도 어색하지 않도록 둥근 계열을 차례로 세워 둔다. */
const CV_ROUND = "'Baloo 2', 'Quicksand', 'Avenir Next Rounded', 'Varela Round', 'Trebuchet MS', sans-serif";

/* 그려지는 순서. delay는 초 단위 — 조부모 → 부부선 → 자손선 → 자녀 → 본인 */
/* 조부모 두 쌍이 양쪽 위에, 그 아래 부모 두 사람이 만나고, 맨 아래
   본인 — 실제로 상담실에서 그리는 표준 가계도 모양 그대로.
   위에서 아래로: 조부모 네 명 → 두 부부선 → 두 갈래 내림선 →
   부모 두 사람 → 부모 부부선 → 본인 내림선 → 본인. */
const COVER_STEPS = [
  { d: "M 12 8 h 18 v 18 h -18 z", delay: 0.10, len: 72, kind: "sym" },
  { d: "M 52 17 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0", delay: 0.25, len: 57, kind: "sym" },
  { d: "M 150 8 h 18 v 18 h -18 z", delay: 0.15, len: 72, kind: "sym" },
  { d: "M 190 17 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0", delay: 0.30, len: 57, kind: "sym" },
  { d: "M 30 17 H 43", delay: 0.50, len: 13, kind: "line" },
  { d: "M 168 17 H 181", delay: 0.55, len: 13, kind: "line" },
  { d: "M 36.5 17 V 70", delay: 0.75, len: 53, kind: "line" },
  { d: "M 174.5 17 V 70", delay: 0.80, len: 53, kind: "line" },
  { d: "M 26.5 70 h 20 v 20 h -20 z", delay: 1.00, len: 80, kind: "sym" },
  { d: "M 174.5 80 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0", delay: 1.05, len: 63, kind: "sym" },
  { d: "M 36.5 90 V 104 H 174.5 V 90", delay: 1.30, len: 166, kind: "line" },
  { d: "M 105.5 104 V 150", delay: 1.55, len: 46, kind: "line" },
  { d: "M 94.5 150 h 22 v 22 h -22 z", delay: 1.75, len: 88, kind: "proband" },
  { d: "M 98.5 154 h 15 v 15 h -15 z", delay: 1.90, len: 60, kind: "proband" },
];

/* 예전 표지의 서명 요소였던 '그려지는 가계도'. 위쪽에 데이터는
   있었지만(COVER_STEPS) 실제 화면은 고정된 그림으로 대신하고
   있었다 — 여기서 그 데이터를 실제 애니메이션으로 잇는다.
   조부모 두 사람, 부부선, 자손선, 부모 두 사람, 마지막으로 본인
   순서로 획이 하나씩 나타난다 — 상담실에서 실제로 그리는 순서다. */
function CoverGenogram() {
  return (
    <svg viewBox="0 0 208 180" width="190" height="164" fill="none" aria-hidden="true">
      <style>{`
        .cv-s{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);
          animation:cvDraw .7s cubic-bezier(.4,0,.2,1) forwards;animation-delay:var(--delay)}
        @keyframes cvDraw{to{stroke-dashoffset:0}}
        @media (prefers-reduced-motion: reduce){.cv-s{animation:none;stroke-dashoffset:0}}
      `}</style>
      {COVER_STEPS.map((st, i) => (
        <path key={i} d={st.d} className="cv-s"
          stroke={st.kind === "proband" ? CV.gold : st.kind === "line" ? CV.mist : CV.ink}
          strokeWidth={st.kind === "proband" ? 2.6 : st.kind === "line" ? 1.6 : 2.2}
          strokeLinecap="round" strokeLinejoin="round"
          style={{ "--len": st.len, "--delay": `${st.delay}s` }} />
      ))}
    </svg>
  );
}
function Home({li,setLi,go,onNew,cases,loadCase,storageOK,fileRef,onImport,draft,resumeDraft,dropDraft,autosaveOn,setAutosave,deleteAllOnDevice}) {
  const t=k=>tr(S[k],li);
  return <div className="gs-home gs-cover">
    <header className="gs-home-header"><div className="gs-brand"><Logo size={34}/><strong>Genogram Studio</strong></div>
      <div className="gs-languages">{LANGS.map((l,i)=><button key={l.id} aria-pressed={li===i} onClick={()=>setLi(i)}>{l.label}</button>)}</div>
    </header>
    <main className="gs-home-main">
      <div className="gs-start-heading"><div className="gs-cover-art" aria-hidden="true"><CoverGenogram /></div><div><p className="gs-eyebrow">FAMILY · RELATIONSHIPS · STORY</p><h1>Genogram<span>Studio</span></h1></div>
        {/* '가계도 그리기'는 언제나 빈 문서에서 시작한다(onNew). 예전에는
           임시저장이 조용히 쌓이기만 하고 화면 어디에도 보이지 않았다.
           작업하다 만 것이 있으면 여기서 바로 보이고 이어받을 수 있어야
           한다. */}
        <div className="gs-home-actions"><button className="gs-primary" onClick={onNew}>＋ {t('m2')}</button>
          <button className="gs-secondary" onClick={()=>fileRef.current?.click()}>{tr(['Open a case file','가계도 파일 열기','開啟個案檔案'],li)}</button></div>
      </div>
      {draft?.doc && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          background: "#EFF5FE", border: "1px solid #B9D4F5", borderRadius: 12, padding: "12px 16px", margin: "0 0 18px" }}>
          <span style={{ fontSize: 20 }}>↺</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: FB, fontWeight: 700, fontSize: 14, color: "#2B5FAD" }}>
              {tr(["Unsaved work from last time", "저장하지 않고 남은 작업이 있습니다", "上次未儲存的作業"], li)}
            </div>
            <div style={{ fontSize: 12, color: "#3E5E85", marginTop: 2 }}>
              {(draft.doc.title || tr(["Untitled case","제목 없는 가계도","未命名個案"], li))}
              {draft.savedAt ? ` · ${new Date(draft.savedAt).toLocaleString()}` : ""}
            </div>
          </div>
          <button className="gs-primary" onClick={resumeDraft} style={{ padding: "8px 16px" }}>
            {tr(["Resume", "이어서 하기", "繼續"], li)}
          </button>
          <button className="gs-secondary" onClick={dropDraft} style={{ padding: "8px 14px" }}>
            {tr(["Discard", "지우기", "捨棄"], li)}
          </button>
        </div>
      )}
      <details className="gs-cover-cases"><summary>{tr(['Saved cases','저장한 가계도','已儲存個案'],li)} <span>{cases.length}</span></summary><div className="gs-home-grid">
        <section className="gs-recent"><div className="gs-section-heading"><h2>{tr(['Recent cases','최근 가계도','近期個案'],li)}</h2><span>{cases.length}</span></div>
          {storageOK&&cases.length?cases.slice(0,6).map(c=><button className="gs-case" key={c.id} onClick={()=>{loadCase(c.id);go('draw');}}><span className="gs-case-symbol">▢</span><span><strong>{c.title||'—'}</strong><small>{(c.savedAt||'').slice(0,10)}</small></span><span aria-hidden="true">→</span></button>):
          <div className="gs-empty"><Logo size={58}/><p>{tr(['Your saved cases will appear here.','저장한 가계도가 이곳에 표시됩니다.','儲存的個案將顯示於此。'],li)}</p><span>{tr(['Start a new genogram or open a JSON file.','새 가계도를 시작하거나 JSON 파일을 불러오세요.','開始繪製新家系圖，或開啟 JSON 檔案。'],li)}</span></div>}
        </section>
      </div></details>
      <nav className="gs-cover-links" aria-label={tr(['Explore','둘러보기','探索'],li)}><button onClick={()=>go('export')}>{t('m3')} · {tr(['Export','내보내기','匯出'],li)}</button><button onClick={()=>go('ref')}>{t('m4')}</button></nav>
      {storageOK&&<StorageSettings li={li} cases={cases} autosaveOn={autosaveOn} setAutosave={setAutosave} deleteAllOnDevice={deleteAllOnDevice}/>}
      <footer className="gs-home-footer"><span>Developed by 황종철 Jongchel Hwang</span><span>© Jongchel Hwang. All rights reserved.</span></footer>
    </main><input ref={fileRef} type="file" accept=".json,application/json" onChange={onImport} style={{display:'none'}}/>
  </div>;
}


/* ── export ───────────────────────────────────────────────────── */
/* ── 면담 질문 가이드 화면 ─────────────────────────────────────────
   가계도를 그리며 옆에 두고 참고하는 자료. 처음에는 범주 제목만
   보이도록 모두 접어 두어 산만하지 않게 하고, 필요한 범주만 편다. */
function InterviewGuide({ li, hideTitle }) {
  const t = (k) => tr(S[k], li);
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = IV_CATS.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {!hideTitle && <SectionTitle>{t("ivTitle")}</SectionTitle>}
      <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.45, marginBottom: 2 }}>
        {t("ivHint")} · {total}{tr([" questions", "문항", " 題"], li)}
      </div>
      {IV_CATS.map((c) => {
        const isOpen = open.has(c.id);
        return (
          <div key={c.id} style={{ border: `1px solid ${isOpen ? T.pine : T.rule}`, borderRadius: 10, overflow: "hidden" }}>
            <button type="button" onClick={() => toggle(c.id)} className="flex items-center"
              style={{ width: "100%", gap: 8, padding: "9px 11px", border: "none", cursor: "pointer",
                background: isOpen ? "#F4F7FA" : "#fff", textAlign: "left" }}>
              <span style={{ flex: 1, fontSize: 12.5, fontFamily: FB, fontWeight: 600, color: T.ink }}>{tr(c.title, li)}</span>
              <span style={{ fontSize: 10.5, fontFamily: FM, color: T.mute }}>{c.items.length}</span>
              <span style={{ color: T.mute, fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "3px 11px 10px" }}>
                {c.items.map((it, i) => (
                  <div key={i} style={{ padding: "7px 0", borderTop: i ? "1px solid #F0EEE7" : "none" }}>
                    <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.55 }}>{tr(it.q, li)}</div>
                    <div style={{ fontSize: 10.5, color: T.gold, lineHeight: 1.5, marginTop: 2 }}>{tr(it.why, li)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 가족체계 분석기 화면 ──────────────────────────────────────── */
function Analyser({ doc, setDoc, li }) {
  const t = (k) => tr(S[k], li);
  const o = useMemo(() => readGenogram(doc), [doc]);
  const [open, setOpen] = useState("D01");
  const [showReport, setShowReport] = useState(false);
  const answers = doc.answers || {};
  const setAnswer = (k, v) => setDoc((d) => ({ ...d, answers: { ...(d.answers || {}), [k]: v } }), `ans:${k}`);

  const results = useMemo(() => DOMAINS.map((dm) => ({ dm, findings: runDomain(dm.id, o, li) })), [o, li]);
  const cid = doc.culture || "";
  const cult = CULT[cid] || null;
  const [compare, setCompare] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const cNotes = useMemo(() => collectedNotes(doc, li), [doc.notes, doc.people, doc.bonds, doc.unions, li]);
  const setCulture = (v) => setDoc((d) => ({ ...d, culture: v }), "culture");
  const answered = Object.values(answers).filter((v) => (v || "").trim()).length;
  const totalQs = DOMAINS.reduce((n, d) => n + d.qs.length, 0);

  const Grade = ({ g }) => (
    <span style={{ fontSize: 9.5, fontFamily: FB, fontWeight: 700, color: "#fff", background: GRADE[g].color,
      borderRadius: 9, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}>{tr(GRADE[g].label, li)}</span>
  );
  const totalRules = RULES.length;

  if (showReport) return <Report doc={doc} li={li} results={results} answers={answers} onBack={() => setShowReport(false)} />;

  return (
    <div style={{ marginTop: 30 }}>
      <div className="flex items-center" style={{ gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h3 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, letterSpacing: "-.01em" }}>{t("analyser")}</h3>
        <span style={{ fontSize: 11.5, color: T.mute, fontFamily: FM }}>
          {DOMAINS.length}{tr([" domains", "개 영역", " 個領域"], li)} · {totalRules}{tr([" rules", "개 규칙", " 條規則"], li)} · {answered}/{totalQs}{tr([" answered", " 답변", " 已答"], li)}
        </span>
        <div style={{ flex: 1 }} />
        <Btn tone="solid" onClick={() => setShowReport(true)}>{t("analReport")}</Btn>
      </div>
      <div style={{ fontSize: 12, color: T.mute, lineHeight: 1.48, maxWidth: 680, marginBottom: 12 }}>{t("analyserHint").replace("{D}", DOMAINS.length).replace("{R}", totalRules)}</div>

      {/* 가계도를 보며 함께 생각해 볼 질문 — 방금 새로 들어온 내용이라
          파란 표시로 구분해 둔다. 확인 후 "표시 지워 줘"라고 하면 없앤다. */}
      <div style={{ border: "1px solid #B9D4F5", background: "#EFF5FE", borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxWidth: 780 }}>
        <button type="button" onClick={() => setOverviewOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}>
          <span style={{ fontSize: 10, color: "#2B5FAD", transform: overviewOpen ? "rotate(90deg)" : "none", display: "inline-block" }}>▶</span>
          <span style={{ fontSize: 13, fontFamily: FB, fontWeight: 700, color: "#2B5FAD" }}>
            {tr(["Questions to think through together, looking at the chart", "가계도를 보며 함께 생각해 볼 질문", "看著家系圖一起思考的問題"], li)}
          </span>
          <span style={{ fontSize: 10.5, color: "#5C82B8", fontFamily: FM }}>· {tr(["new", "새로 추가됨", "新增"], li)}</span>
        </button>
        {overviewOpen && (
          <div style={{ marginTop: 10 }}>
            {OVERVIEW_QS.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: i ? "1px solid #DCE8FA" : "none" }}>
                <span style={{ fontSize: 12, color: "#2B5FAD", fontFamily: FM, minWidth: 18 }}>{i + 1}.</span>
                <span style={{ fontSize: 12.5, color: "#1E3A5F", lineHeight: 1.5, flex: 1 }}>{tr(item.q, li)}</span>
                <span style={{ fontSize: 10.5, color: "#7396C4", fontFamily: FM, whiteSpace: "nowrap" }}>({item.src})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 설명 박스 모음 — 규칙이 못 담는 자유 메모를 사람·관계선별로
          모아 옆에 둔다. 규칙의 결론이 아니라 상담가가 직접 읽을
          원자료다. */}
      {cNotes.length > 0 && (
        <div style={{ border: `1px solid ${T.rule}`, background: "#FAF8F2", borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxWidth: 780 }}>
          <button type="button" onClick={() => setNotesOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}>
            <span style={{ fontSize: 10, color: T.gold, transform: notesOpen ? "rotate(90deg)" : "none", display: "inline-block" }}>▶</span>
            <span style={{ fontSize: 13, fontFamily: FB, fontWeight: 700, color: T.gold }}>
              {tr(["Notes collected from the chart", "가계도에 붙인 설명 메모 모음", "圖上附加的說明備註彙整"], li)}
            </span>
            <span style={{ fontSize: 10.5, color: T.mute, fontFamily: FM }}>· {cNotes.length}{tr([" notes", "개", "則"], li)}</span>
          </button>
          {notesOpen && (
            <div style={{ marginTop: 10 }}>
              {cNotes.map((n, i) => (
                <div key={n.id} style={{ display: "flex", gap: 10, padding: "7px 0", borderTop: i ? `1px solid ${T.rule}` : "none" }}>
                  <span style={{ fontSize: 11, fontFamily: FB, fontWeight: 700, color: T.gold, minWidth: 96 }}>{n.label}</span>
                  <span style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, flex: 1, whiteSpace: "pre-wrap" }}>{n.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 문화 렌즈 선택 — 규칙 위에 얹는 층이지 규칙을 바꾸지 않는다 */}
      <div style={{ background: "#F7F9FC", border: `1px solid ${T.rule}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxWidth: 780 }}>
        <div className="flex items-center" style={{ gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontFamily: FB, fontWeight: 700, color: T.pine }}>
            {tr(["Cultural lens", "문화 렌즈", "文化視角"], li)}
          </span>
          <select value={cid} onChange={(e) => setCulture(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 150, padding: "6px 9px", fontSize: 12.5 }}>
            <option value="">{tr(["Not specified", "지정 안 함", "未指定"], li)}</option>
            {CULTURES.map((c) => <option key={c.id} value={c.id}>{tr(c.label, li)}</option>)}
          </select>
          <button type="button" onClick={() => setCompare(!compare)}
            style={{ fontSize: 11.5, fontFamily: FB, border: `1px solid ${compare ? T.pine : T.rule}`, background: compare ? "#EAF1F6" : "#fff",
              color: compare ? T.pine : T.mute, borderRadius: 7, padding: "6px 11px", cursor: "pointer" }}>
            {tr(["Compare cultures", "문화 비교", "文化比較"], li)}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.5, marginTop: 8 }}>
          {cult ? tr(cult.summary, li) : tr(["Choose a cultural context and each domain will show what counts as normative there, so a norm is not misread as a symptom.", "문화 맥락을 고르면 각 영역에 그 문화에서 무엇이 규범인지가 함께 표시됩니다. 규범을 증상으로 잘못 읽지 않기 위해서입니다.", "選擇文化脈絡後，各領域將顯示該文化中何為常態，以免將常態誤讀為症狀。"], li)}
        </div>
        {cult && cult.basis && (
          <div style={{ fontSize: 10.5, color: T.mute, lineHeight: 1.5, marginTop: 6 }}>
            {tr(["Based on", "근거 자료", "依據"], li)}: {cult.basis.join("  ·  ")}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: T.gold, lineHeight: 1.45, marginTop: 6 }}>{tr(CULTURE_CAUTION, li)}</div>
      </div>

      {results.map(({ dm, findings }) => {
        const isOpen = open === dm.id;
        const mine = dm.qs.filter((_, qi) => (answers[`${dm.id}-${qi}`] || "").trim()).length;
        return (
          <div key={dm.id} style={{ background: "#fff", border: `1px solid ${isOpen ? T.pine : T.rule}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
            <button type="button" onClick={() => setOpen(isOpen ? "" : dm.id)} className="flex items-center"
              style={{ width: "100%", gap: 10, padding: "12px 14px", border: "none", background: isOpen ? "#F4F7FA" : "#fff", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontFamily: FM, fontSize: 10.5, color: T.gold, width: 30 }}>{dm.id}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontFamily: FB, fontWeight: 600, color: T.ink }}>{tr(dm.title, li)}</span>
              <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint }}>{domainSources(dm.id)}</span>
              {mine > 0 && <span style={{ fontSize: 9.5, fontFamily: FM, color: T.sage }}>{mine}/{dm.qs.length}</span>}
              <span style={{ color: T.mute, fontSize: 12 }}>{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "4px 14px 14px" }}>
                {findings.map((f, i) => (
                  <div key={i} className="flex" style={{ gap: 8, alignItems: "flex-start", padding: "7px 0", borderTop: i ? "1px solid #F0EEE7" : "none" }}>
                    <Grade g={f.grade} />
                    <span style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.45, flex: 1 }}>{f.t}</span>
                    <span style={{ fontFamily: FM, fontSize: 9, color: T.faint, whiteSpace: "nowrap", paddingTop: 2 }}>{dm.id}-{f.id} · {f.source}</span>
                  </div>
                ))}
                {dm.alts.length > 0 && (
                  <div style={{ marginTop: 10, padding: 10, background: REVISED_DOMAINS.has(dm.id) ? "#EFF5FE" : "#FAF8F2", borderRadius: 8, border: `1px solid ${REVISED_DOMAINS.has(dm.id) ? "#B9D4F5" : T.rule}` }}>
                    <div className="flex items-center" style={{ gap: 6, marginBottom: 3 }}>
                      <div style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: REVISED_DOMAINS.has(dm.id) ? "#2B5FAD" : T.gold }}>{t("analAlt")}</div>
                      {REVISED_DOMAINS.has(dm.id) && <span style={{ fontSize: 9.5, color: "#5C82B8", fontFamily: FM }}>· {tr(["revised", "새로 반영됨", "已更新"], li)}</span>}
                    </div>
                    {dm.alts.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: REVISED_DOMAINS.has(dm.id) ? "#1E3A5F" : T.ink2, lineHeight: 1.45 }}>{tr(a, li)}</div>)}
                  </div>
                )}
                {(compare || (cult && cult.lens[dm.id])) && (
                  <div style={{ marginTop: 10, padding: 10, background: "#F2F6FB", borderRadius: 8, border: `1px solid #DCE5F0` }}>
                    <div style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: T.pine, marginBottom: 5 }}>
                      {tr(["Cultural lens", "문화 렌즈", "文化視角"], li)}
                    </div>
                    {compare ? CULTURES.map((c) => (
                      c.lens[dm.id] ? (
                        <div key={c.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "4px 0" }}>
                          <span style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: T.gold, minWidth: 52, paddingTop: 1 }}>{tr(c.label, li)}</span>
                          <span style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.5, flex: 1 }}>{tr(c.lens[dm.id], li)}</span>
                        </div>
                      ) : null
                    )) : (
                      <div style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.5 }}>
                        <span style={{ fontFamily: FB, fontWeight: 700, color: T.gold, marginRight: 6 }}>{tr(cult.label, li)}</span>
                        {tr(cult.lens[dm.id], li)}
                      </div>
                    )}
                  </div>
                )}
                {cult && dm.id === "D12" && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: T.pine, marginBottom: 6 }}>
                      {tr(["Ask — cultural context", "더 물어볼 것 — 문화 맥락", "需再詢問 — 文化脈絡"], li)}
                    </div>
                    {cult.qs.map((q, qi) => (
                      <div key={qi} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: T.ink2, marginBottom: 4, lineHeight: 1.5 }}>{tr(q, li)}</div>
                        <textarea value={answers[`C-${cult.id}-${qi}`] || ""} rows={2}
                          onChange={(e) => setAnswer(`C-${cult.id}-${qi}`, e.target.value)}
                          placeholder={t("analAnsPh")} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: T.pine }}>{t("analAsk")}</div>
                    {REVISED_DOMAINS.has(dm.id) && <span style={{ fontSize: 9.5, color: "#5C82B8", fontFamily: FM }}>· {tr(["revised", "새로 반영됨", "已更新"], li)}</span>}
                  </div>
                  {dm.qs.map((q, qi) => (
                    <div key={qi} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: REVISED_DOMAINS.has(dm.id) ? "#2B5FAD" : T.ink2, marginBottom: 4, lineHeight: 1.5 }}>{tr(q, li)}</div>
                      <textarea value={answers[`${dm.id}-${qi}`] || ""} rows={2}
                        onChange={(e) => setAnswer(`${dm.id}-${qi}`, e.target.value)}
                        placeholder={t("analAnsPh")} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* 보고서 — 관찰된 것과 사람이 말한 것을 갈라 놓는다 */
/* 보고서 인쇄 규칙. 화면에서는 인쇄용 머리글·바닥글을 감추고, 인쇄할 때는 앱의 머리띠와
   버튼(data-noprint)을 감춘 뒤 스크롤 칸을 풀어 보고서 전체가 쪽마다 이어 나오게 한다.
   보고서가 열려 있을 때만 이 규칙이 붙으므로 다른 화면의 인쇄에는 영향이 없다. */
const REPORT_PRINT_CSS = `
.gs-print-only{display:none}
@media print{
  @page{margin:14mm 12mm}
  html,body{height:auto!important;overflow:visible!important;background:#fff!important}
  [data-noprint],.gs-app-header{display:none!important}
  .gs-app{height:auto!important;overflow:visible!important;display:block!important}
  .gs-app div{overflow:visible!important}
  .gs-print-only{display:flex!important;justify-content:space-between;gap:12px;font-size:9pt;color:#555}
  .gs-print-header{border-bottom:1px solid #bbb;padding-bottom:4pt;margin-bottom:8pt}
  .gs-print-footer{border-top:1px solid #bbb;padding-top:4pt;margin-top:10pt}
  .gs-report-body{border:0!important;border-radius:0!important;max-width:none!important;padding:0!important}
}`;
function Report({ doc, li, results, answers, onBack }) {
  const t = (k) => tr(S[k], li);
  const caseName = doc.title || tr(["Untitled case", "제목 없는 가계도", "未命名個案"], li);
  const genDate = new Date().toLocaleDateString();
  const srcLine = ANALYSIS_SOURCES.map((s) => s[0]).join("·");
  const cult = CULT[doc.culture || ""] || null;
  const cNotes = collectedNotes(doc, li);
  return (
    <div style={{ marginTop: 30 }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }} data-noprint>
        <Btn onClick={onBack}>← {t("analBack")}</Btn>
        <Btn tone="solid" onClick={() => window.print()}>{t("analPrint")}</Btn>
      </div>

      <style>{REPORT_PRINT_CSS}</style>
      {/* 인쇄할 때만 나타난다. 머리글은 맨 위, 바닥글은 맨 끝에 한 번씩 놓인다. */}
      <div className="gs-print-only gs-print-header">
        <span>{t("analReport")} · {caseName}</span>
        <span>{genDate}</span>
      </div>

      <div className="gs-report-body" style={{ background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, padding: "28px 30px", maxWidth: 780 }}>
        <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>{t("analReport")}</div>
        <div style={{ fontSize: 12.5, color: T.mute, marginTop: 4, marginBottom: 6 }}>
          {caseName} · {genDate}{cult ? ` · ${tr(["Cultural lens", "문화 렌즈", "文化視角"], li)}: ${tr(cult.label, li)}` : ""}
        </div>
        <div style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.5, padding: 11, background: "#FDF8EC",
          border: `1px solid ${T.gold}`, borderRadius: 8, marginBottom: 20 }}>{t("analDisclaim")}</div>

        {/* 새로 들어온 내용이라 보고서에서도 파란 표시로 구분해 둔다 */}
        <div className="gs-rule-block" style={{ border: "1px solid #B9D4F5", background: "#EFF5FE", borderRadius: 8,
          padding: "12px 14px", marginBottom: 20, breakInside: "avoid" }}>
          <div style={{ fontSize: 13, fontFamily: FB, fontWeight: 700, color: "#2B5FAD", marginBottom: 8 }}>
            {tr(["Questions to think through together, looking at the chart", "가계도를 보며 함께 생각해 볼 질문", "看著家系圖一起思考的問題"], li)}
          </div>
          {OVERVIEW_QS.map((item, i) => (
            <div key={i} className="flex" style={{ gap: 8, padding: "3px 0" }}>
              <span style={{ fontSize: 11, color: "#2B5FAD", fontFamily: FM, minWidth: 16 }}>{i + 1}.</span>
              <span style={{ fontSize: 11.5, color: "#1E3A5F", lineHeight: 1.5, flex: 1 }}>{tr(item.q, li)}</span>
              <span style={{ fontSize: 9.5, color: "#7396C4", fontFamily: FM, whiteSpace: "nowrap" }}>({item.src})</span>
            </div>
          ))}
        </div>

        {cNotes.length > 0 && (
          <div className="gs-rule-block" style={{ border: `1px solid ${T.rule}`, background: "#FAF8F2", borderRadius: 8,
            padding: "12px 14px", marginBottom: 20, breakInside: "avoid" }}>
            <div style={{ fontSize: 13, fontFamily: FB, fontWeight: 700, color: T.gold, marginBottom: 8 }}>
              {tr(["Notes collected from the chart", "가계도에 붙인 설명 메모 모음", "圖上附加的說明備註彙整"], li)}
            </div>
            {cNotes.map((n, i) => (
              <div key={n.id} className="flex" style={{ gap: 10, padding: "4px 0", borderTop: i ? `1px solid ${T.rule}` : "none" }}>
                <span style={{ fontSize: 10.5, fontFamily: FB, fontWeight: 700, color: T.gold, minWidth: 90 }}>{n.label}</span>
                <span style={{ fontSize: 11, color: T.ink2, lineHeight: 1.5, flex: 1, whiteSpace: "pre-wrap" }}>{n.text}</span>
              </div>
            ))}
          </div>
        )}

        {results.map(({ dm, findings }) => {
          const said = dm.qs.map((q, qi) => ({ q, a: (answers[`${dm.id}-${qi}`] || "").trim() })).filter((x) => x.a);
          return (
            <div key={dm.id} className="gs-rule-block" style={{ marginBottom: 22, breakInside: "avoid" }}>
              <div className="flex items-center" style={{ gap: 8, borderBottom: `1.5px solid ${T.pine}`, paddingBottom: 4, marginBottom: 8 }}>
                <span style={{ fontFamily: FM, fontSize: 10.5, color: T.gold }}>{dm.id}</span>
                <span style={{ fontSize: 14, fontFamily: FB, fontWeight: 700, color: T.ink, flex: 1 }}>{tr(dm.title, li)}</span>
                <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint }}>{domainSources(dm.id)}</span>
              </div>
              {findings.map((f, i) => (
                <div key={i} className="flex" style={{ gap: 7, alignItems: "flex-start", padding: "3px 0" }}>
                  <span style={{ fontSize: 9, fontFamily: FB, fontWeight: 700, color: GRADE[f.grade].color, whiteSpace: "nowrap", paddingTop: 3 }}>
                    {tr(GRADE[f.grade].label, li)}
                  </span>
                  <span style={{ fontSize: 12, color: T.ink2, lineHeight: 1.45, flex: 1 }}>{f.t}</span>
                  <span style={{ fontFamily: FM, fontSize: 8.5, color: T.faint, whiteSpace: "nowrap", paddingTop: 3 }}>{dm.id}-{f.id} · {f.source}</span>
                </div>
              ))}
              {said.length > 0 && (
                <div style={{ marginTop: 8, paddingLeft: 11, borderLeft: `3px solid ${T.sageSoft}` }}>
                  <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, color: T.sage, marginBottom: 3 }}>{t("analSaid")}</div>
                  {said.map((x, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <div style={{ fontSize: 11, color: T.mute }}>{tr(x.q, li)}</div>
                      <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.45 }}>{x.a}</div>
                    </div>
                  ))}
                </div>
              )}
              {cult && cult.lens[dm.id] && (
                <div style={{ marginTop: 7, paddingLeft: 11, borderLeft: "3px solid #C9D8EA" }}>
                  <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, color: T.pine, marginBottom: 2 }}>
                    {tr(["Cultural lens", "문화 렌즈", "文化視角"], li)} · {tr(cult.label, li)}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink2, lineHeight: 1.45 }}>{tr(cult.lens[dm.id], li)}</div>
                </div>
              )}
              {cult && dm.id === "D12" && cult.qs.some((_, qi) => (answers[`C-${cult.id}-${qi}`] || "").trim()) && (
                <div style={{ marginTop: 8, paddingLeft: 11, borderLeft: `3px solid ${T.sageSoft}` }}>
                  <div style={{ fontSize: 10, fontFamily: FB, fontWeight: 700, color: T.sage, marginBottom: 3 }}>{t("analSaid")}</div>
                  {cult.qs.map((q, qi) => {
                    const a = (answers[`C-${cult.id}-${qi}`] || "").trim();
                    return a ? (
                      <div key={qi} style={{ marginBottom: 5 }}>
                        <div style={{ fontSize: 11, color: T.mute }}>{tr(q, li)}</div>
                        <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.45 }}>{a}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              {dm.alts.length > 0 && (
                <div style={{ marginTop: 7, fontSize: 11, color: REVISED_DOMAINS.has(dm.id) ? "#2B5FAD" : T.gold, lineHeight: 1.45 }}>
                  {t("analAlt")} — {dm.alts.map((a) => tr(a, li)).join(" ")}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ borderTop: `1px solid ${T.rule}`, paddingTop: 10, fontSize: 10.5, color: T.mute, lineHeight: 1.48 }}>
          {t("analSources")}: {ANALYSIS_SOURCES.map((s) => `${s[0]} ${s[1]}`).join("  ·  ")}
        </div>
        {cult && <div style={{ marginTop: 6, fontSize: 10, color: T.gold, lineHeight: 1.45 }}>{tr(CULTURE_CAUTION, li)}</div>}
        <div style={{ marginTop: 6, fontSize: 10, color: T.faint, lineHeight: 1.45 }}>{t("printConfidential")}</div>
        {/* 보고서의 맨 끝 — 인쇄하면 마지막 쪽에 놓인다. 한 건이 쪽 사이에서 잘리지 않게 한다. */}
        <div className="gs-report-refs" style={{ marginTop: 18, borderTop: `1px solid ${T.rule}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink2, marginBottom: 6, breakAfter: "avoid" }}>{t("refBooks")}</div>
          {BOOKS.map((b, i) => (
            <div key={i} style={{ fontSize: 10.5, color: T.mute, lineHeight: 1.55, padding: "2px 0", breakInside: "avoid", pageBreakInside: "avoid" }}>{bookFrag(b)}</div>
          ))}
        </div>
      </div>
      <div className="gs-print-only gs-print-footer">
        <span>{t("analSources")}: {srcLine}</span>
        <span>{t("printConfidential")}</span>
      </div>
    </div>
  );
}

function ExportScreen({ doc, setDoc, li, exportJSON, flash, onBackToDraw }) {
  const t = (k) => tr(S[k], li);
  const svgRef = useRef(null);
  const [exTlg, setExTlg] = useState(false);
  const [exChronology, setExChronology] = useState(false);
  const tlgL = useMemo(() => tlgLayout(doc, 9, null), [doc]);
  const tlgIns = useMemo(() => insetLayout(doc, tlgL.width), [doc, tlgL.width]);
  const tlgW = tlgL.width;
  const box = exTlg
    ? (() => {
        const top = tlgIns ? tlgIns.total : 0;
        const w = Math.max(tlgW + 300, tlgIns ? tlgIns.cardW + 120 : 0);
        return { x: -w / 2, y: -top - 50, w, h: top + tlgL.height + 190 };
      })()
    : docBounds(doc, { story: true, tl: exChronology });
  const name = doc.title || "genogram";
  const doExport = async (kind) => {
    try {
      if (!svgRef.current) { flash("…"); return; }
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
      const str = serializeSVG(svgRef.current, box);
      if (kind === "svg") {
        await saveAs(new Blob([str], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`, "image/svg+xml", "SVG image");
        return;
      }
      const scale = Math.max(0.35, Math.min(2, 6000 / Math.max(box.w, box.h, 1)));
      svgToCanvas(str, box.w, box.h, scale, (cv) => {
        try {
          if (!cv) { flash(tr(["Export failed — try SVG", "내보내기 실패 — SVG를 사용해 보세요", "輸出失敗 — 請改用 SVG"], li)); return; }
          if (kind === "png") {
            cv.toBlob((b) => { if (b) saveAs(b, `${name}.png`, "image/png", "PNG image"); else flash("…"); });
            return;
          }
          cv.toBlob((b) => {
            if (!b) { flash("…"); return; }
            b.arrayBuffer().then((ab) => saveAs(jpegToPDF(new Uint8Array(ab), cv.width, cv.height), `${name}.pdf`, "application/pdf", "PDF document"));
          }, "image/jpeg", 0.92);
        } catch (e) { flash(String(e.message || e)); }
      });
    } catch (e) { flash(String(e.message || e)); }
  };
  const gens = computeGens(doc.people, doc.unions);
  const maxGen = Math.max(0, ...Object.values(gens));
  const ppl = doc.people.filter((p) => !p.preg && p.gender !== "object");
  const checks = [
    maxGen >= 2 && ppl.length > 0,
    ppl.some((p) => p.proband),
    ppl.length > 0 && ppl.every((p) => p.birth),
    doc.unions.length > 0 && doc.unions.every((u) => u.mYear),
    doc.bonds.length > 0,
    doc.households.length > 0,
    ppl.some((p) => p.note) || (doc.events || []).length > 0,
  ];
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 22px 70px" }}>
        <button type="button" onClick={onBackToDraw} data-noprint
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none",
            cursor: "pointer", padding: 0, marginBottom: 10, fontSize: 12.5, fontFamily: FB, color: T.mute }}>
          ← {t("m2")}
        </button>
        <h1 style={{ fontFamily: FD, fontSize: 29, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 4 }}>{t("exTitle")}</h1>
        <div style={{ borderTop: `2px solid ${T.ink}`, marginBottom: 18 }} />

        <div className="flex" style={{ gap: 0, marginTop: 18 }}>
          <Group>
            <GBtn first active={!exTlg && !exChronology} onClick={() => { setExTlg(false); setExChronology(false); }}>{t("viewStd")}</GBtn>
            <GBtn active={exTlg} onClick={() => { setExTlg(true); setExChronology(false); }}>{t("viewTLG")}</GBtn>
            <GBtn active={exChronology} onClick={() => { setExTlg(false); setExChronology(true); }}>{t("chronView")}</GBtn>
          </Group>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, padding: 12, margin: "10px 0 18px" }}>
          <svg ref={svgRef} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={{ width: "100%", height: exTlg || exChronology ? 520 : 380, background: "#fff" }}>
            {svgDefs()}
            <g id="exportRoot">
              {exTlg
                ? <g transform={`translate(${-tlgW / 2},0)`}>
                    <Layers doc={doc} li={li} detail sel={null} showStory={false} showTL={false}
                      tlg tlgScale={9} tlgWin={null} stdInset />
                  </g>
                : <Layers doc={doc} li={li} detail sel={null} showStory={!exChronology} showTL={exChronology} tlg={false} tlgScale={9} tlgWin={null} />}
              {!exTlg && doc.viewPrefs?.ink!==false && <InkLayer strokes={doc.ink||[]}/>}
              {!exTlg && doc.viewPrefs?.note!==false && <NoteLayer doc={doc} notes={doc.notes||[]} vis={{...ALL_ON,...doc.viewPrefs}}/>}
            </g>
          </svg>
        </div>

        <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Btn tone="solid" onClick={() => doExport("png")}>{t("exPNG")}</Btn>
          <Btn tone="solid" onClick={() => doExport("pdf")}>{t("exPDF")}</Btn>
          <Btn onClick={() => doExport("svg")}>{t("exSVG")}</Btn>
          <Btn onClick={exportJSON}>{t("exData")}</Btn>
        </div>
        
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
          <div style={{ background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontFamily: FD, fontSize: 16.5, fontWeight: 600, marginBottom: 10, letterSpacing: '-.01em' }}>{t("checklist")}</h3>
            {CHECKS.map((c, i) => (
              <div key={i} className="flex" style={{ gap: 8, fontSize: 12.5, alignItems: "flex-start", padding: "4px 0" }}>
                <span style={{ color: checks[i] ? T.sage : "#C9CFC7", fontSize: 14 }}>{checks[i] ? "●" : "○"}</span>
                <span style={{ color: checks[i] ? T.ink : T.ink2, lineHeight: 1.55 }}>{tr(c, li)}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontFamily: FD, fontSize: 16.5, fontWeight: 600, marginBottom: 10, letterSpacing: '-.01em' }}>{t("questions")}</h3>
            {QUESTIONS.map((q, i) => (
              <div key={i} className="flex" style={{ gap: 8, fontSize: 12.5, alignItems: "flex-start", padding: "5px 0" }}>
                <span style={{ fontFamily: FM, color: T.gold, fontSize: 11 }}>{i + 1}</span>
                <span style={{ color: T.ink2, lineHeight: 1.45, flex: 1 }}>{tr(q, li)}</span>
                {q[3] && <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, whiteSpace: "nowrap", paddingTop: 2 }}>{q[3]}</span>}
              </div>
            ))}
          </div>
        </div>

        <Analyser doc={doc} setDoc={setDoc} li={li} />
      </div>
    </div>
  );
}

/* ── reference ────────────────────────────────────────────────── */
function RefScreen({ li }) {
  const t = (k) => tr(S[k], li);
  const Row = ({ label, children }) => (
    <div className="flex items-center" style={{ gap: 14, padding: "9px 0", borderBottom: `1px solid #EDEAE2` }}>
      <span style={{ width: 128, fontSize: 12.5, color: T.ink, fontFamily: FB, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, display: "flex", alignItems: "center" }}>{children}</span>
    </div>
  );
  const Sheet = ({ title, children }) => (
    <section style={{ marginBottom: 30 }}>
      <div style={{ background: T.ink, color: "#fff", padding: "6px 12px", fontFamily: FB, fontSize: 12.5,
        fontWeight: 600, letterSpacing: ".06em", marginBottom: 6 }}>{title}</div>
      {children}
    </section>
  );
  const Sym = ({ k }) => (
    <svg width={92} height={44} viewBox="0 0 92 44">
      {k === "male" && <rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={2} />}
      {k === "female" && <circle cx={16} cy={22} r={12} fill="none" stroke={T.ink} strokeWidth={2} />}
      {k === "maleD" && <><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={2} /><path d="M 4 10 L 28 34 M 28 10 L 4 34" stroke={T.ink} strokeWidth={1.6} /></>}
      {k === "femaleD" && <><circle cx={16} cy={22} r={12} fill="none" stroke={T.ink} strokeWidth={2} /><path d="M 7 13 L 25 31 M 25 13 L 7 31" stroke={T.ink} strokeWidth={1.6} /></>}
      {k === "unknown" && <path d="M 16 8 L 29 22 L 16 36 L 3 22 Z" fill="none" stroke={T.ink} strokeWidth={2} />}
      {k === "index" && <><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={2} /><rect x={9} y={15} width={14} height={14} fill="none" stroke={T.ink} strokeWidth={1.5} /></>}
      {k === "age" && <><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={1.8} /><text x={16} y={27} textAnchor="middle" fontSize={12} fontFamily={FM} fill={T.ink}>23</text></>}
      {k === "birth" && <><text x={2} y={13} fontSize={10.5} fontFamily={FM} fill={T.ink}>'90</text><circle cx={30} cy={24} r={11} fill="none" stroke={T.ink} strokeWidth={1.8} /></>}
      {k === "death" && <><text x={0} y={13} fontSize={10.5} fontFamily={FM} fill={T.ink}>'90</text><rect x={22} y={12} width={22} height={22} fill="none" stroke={T.ink} strokeWidth={1.8} /><path d="M 22 12 L 44 34 M 44 12 L 22 34" stroke={T.ink} strokeWidth={1.4} /></>}
      {k === "addi" && <><rect x={4} y={10} width={24} height={12} fill={T.ink} /><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={1.8} /></>}
      {k === "phys" && <><rect x={4} y={10} width={12} height={24} fill="#6E93A8" /><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={1.8} /></>}
      {k === "ment" && <><rect x={16} y={10} width={12} height={24} fill="#7C6EA8" /><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={1.8} /></>}
      {k === "obj" && <rect x={4} y={13} width={30} height={18} rx={6} fill={T.ink2} />}
      {k === "preg" && <><line x1={16} y1={2} x2={16} y2={16} stroke={T.ink} strokeWidth={1.5} /><path d="M 16 15 L 26 36 L 6 36 Z" fill={T.ink} /></>}
      {k === "mis" && <><line x1={16} y1={2} x2={16} y2={18} stroke={T.ink} strokeWidth={1.5} /><circle cx={16} cy={27} r={9} fill={T.ink} /></>}
      {k === "abo" && <><line x1={16} y1={2} x2={16} y2={40} stroke={T.ink} strokeWidth={1.5} /><path d="M 5 15 L 27 33 M 27 15 L 5 33" stroke={T.ink} strokeWidth={1.5} /></>}
      {k === "adopt" && <><line x1={16} y1={2} x2={16} y2={22} stroke={T.ink} strokeWidth={1.4} strokeDasharray="3 3" /><circle cx={16} cy={32} r={9} fill="none" stroke={T.ink} strokeWidth={1.6} /></>}
      {k === "twin" && <><path d="M 24 3 L 24 9 M 24 9 L 10 22 M 24 9 L 38 22" stroke={T.ink} strokeWidth={1.5} fill="none" /><rect x={4} y={23} width={13} height={13} fill="none" stroke={T.ink} strokeWidth={1.6} /><circle cx={38} cy={30} r={7} fill="none" stroke={T.ink} strokeWidth={1.6} /></>}
      {k === "twinId" && <><path d="M 24 3 L 24 9 M 24 9 L 10 22 M 24 9 L 38 22" stroke={T.ink} strokeWidth={1.5} fill="none" /><rect x={4} y={23} width={13} height={13} fill="none" stroke={T.ink} strokeWidth={1.6} /><circle cx={38} cy={30} r={7} fill="none" stroke={T.ink} strokeWidth={1.6} /><line x1={17} y1={29} x2={31} y2={29} stroke={T.ink} strokeWidth={1.6} /></>}
      {k === "still" && <><line x1={16} y1={2} x2={16} y2={14} stroke={T.ink} strokeWidth={1.5} /><path d="M 16 14 L 26 34 L 6 34 Z" fill="none" stroke={T.ink} strokeWidth={1.6} /><path d="M 8 21 L 24 31 M 24 21 L 8 31" stroke={T.ink} strokeWidth={1.4} /></>}
      {k === "orient" && <><rect x={4} y={10} width={24} height={24} fill="none" stroke={T.ink} strokeWidth={2} /><path d="M 10 14 L 22 14 L 16 23 Z" fill={T.violet} /></>}
    </svg>
  );
  const Union = ({ type }) => (
    <svg width={110} height={52} viewBox="0 0 110 52">
      <rect x={6} y={4} width={22} height={22} fill="none" stroke={T.ink} strokeWidth={1.8} />
      <circle cx={90} cy={15} r={11} fill="none" stroke={T.ink} strokeWidth={1.8} />
      <path d="M 17 26 V 40 H 90 V 26" fill="none" stroke={T.ink} strokeWidth={1.8}
        strokeDasharray={UNION_TYPES[type].dash || undefined} />
      {UNION_TYPES[type].marks === 1 && <line x1={48} y1={47} x2={58} y2={33} stroke={T.ink} strokeWidth={1.8} />}
      {UNION_TYPES[type].marks === 2 && (<g><line x1={44} y1={47} x2={54} y2={33} stroke={T.ink} strokeWidth={1.8} /><line x1={52} y1={47} x2={62} y2={33} stroke={T.ink} strokeWidth={1.8} /></g>)}
      {UNION_TYPES[type].marks === 3 && (<g><line x1={44} y1={47} x2={58} y2={33} stroke={T.ink} strokeWidth={1.8} /><line x1={44} y1={33} x2={58} y2={47} stroke={T.ink} strokeWidth={1.8} /></g>)}
      {type === "married" && <text x={62} y={37} fontSize={10} fontFamily={FM} fill={T.ink}>m.90</text>}
    </svg>
  );
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#FAF9F5" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "30px 24px 70px" }}>
        <h1 style={{ fontFamily: FD, fontSize: 30, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 4 }}>{t("m4")}</h1>
        <div style={{ borderTop: `2px solid ${T.ink}`, marginBottom: 26 }} />
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "0 40px" }}>
          <div>
            <Sheet title={tr(["Basic information", "기본 정보", "基本資訊"], li)}>
              <Row label={tr(S.male, li)}><Sym k="male" /></Row>
              <Row label={tr(S.female, li)}><Sym k="female" /></Row>
              <Row label={tr(["Male (deceased)", "남성 (사망)", "男性（歿）"], li)}><Sym k="maleD" /></Row>
              <Row label={tr(["Female (deceased)", "여성 (사망)", "女性（歿）"], li)}><Sym k="femaleD" /></Row>
              <Row label={tr(["Index person", "본인", "案主"], li)}><Sym k="index" /></Row>
              <Row label={tr(["Age", "나이", "年齡"], li)}><Sym k="age" /></Row>
              <Row label={tr(["Year of birth", "출생년도", "出生年"], li)}><Sym k="birth" /></Row>
              <Row label={tr(["Year of death", "사망년도", "歿年"], li)}><Sym k="death" /></Row>
              <Row label={tr(["Addiction", "중독", "成癮"], li)}><Sym k="addi" /></Row>
              <Row label={tr(["Physical illness", "신체 질환", "身體疾病"], li)}><Sym k="phys" /></Row>
              <Row label={tr(["Mental health", "정신건강", "心理健康"], li)}><Sym k="ment" /></Row>
              <Row label={tr(S.object, li)}><Sym k="obj" /></Row>
            </Sheet>
            <Sheet title={tr(["Marital information", "혼인 정보", "婚姻資訊"], li)}>
              {Object.keys(UNION_TYPES).map((k) => <Row key={k} label={tr(UNION_TYPES[k].label, li)}><Union type={k} /></Row>)}
            </Sheet>
            <Sheet title={tr(["Child lines", "자녀 관계선", "子女關係線"], li)}>
              {Object.keys(LINK_TYPES).map((k) => (
                <Row key={k} label={tr(LINK_TYPES[k], li)}><ChildLinkPreview link={k} /></Row>
              ))}
            </Sheet>
            <Sheet title={tr(["Pregnancy outcome", "임신 결과", "妊娠結果"], li)}>
              <Row label={tr(PREG.pregnancy, li)}><Sym k="preg" /></Row>
              <Row label={tr(PREG.miscarriage, li)}><Sym k="mis" /></Row>
              <Row label={tr(PREG.abortion, li)}><Sym k="abo" /></Row>
              <Row label={tr(PREG.stillbirth, li)}><Sym k="still" /></Row>
            </Sheet>
            <Sheet title={tr(["Twins", "쌍둥이", "雙胞胎"], li)}>
              <Row label={tr(["Fraternal", "이란성", "異卵"], li)}><Sym k="twin" /></Row>
              <Row label={tr(["Identical — extra bar between the two", "일란성 — 두 자녀 사이 연결선", "同卵 — 兩子女間加連結線"], li)}><Sym k="twinId" /></Row>
            </Sheet>
            <Sheet title={tr(["Sexual orientation", "성적 지향", "性傾向"], li)}>
              <Row label={tr(["Marked by an inverted triangle inside the symbol", "기호 안쪽 역삼각형으로 표시", "以符號內倒三角形標示"], li)}><Sym k="orient" /></Row>
              <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.48, padding: "4px 2px" }}>
                {Object.entries(ORIENTATIONS).filter(([k]) => k !== "none").map(([, v]) => tr(v, li)).join(" · ")}
              </div>
            </Sheet>
          </div>
          <div>
            {Object.entries(BOND_CATS).map(([ck, cv]) => (
              <Sheet key={ck} title={`${tr(["Relationship", "관계 정보", "關係資訊"], li)} — ${tr(cv.label, li)}`}>
                {Object.entries(BOND_TYPES).filter(([, v]) => v.cat === ck && !v.legacy).map(([ty, v]) => (
                  <Row key={ty} label={tr(v.label, li)}><svg width={92} height={20}><BondPreview type={ty} w={92} /></svg></Row>
                ))}
              </Sheet>
            ))}
            <Sheet title={tr(["Notation", "정보 표시", "資訊標示"], li)}>
              <div style={{ fontSize: 12.5, lineHeight: 1.9, color: T.ink2, fontFamily: FB, padding: "8px 0" }}>
                {tr([
                  "Marriage year on the line (m.90). Age inside the symbol; birth year to the upper left, death year to the upper right. Illness, addiction and duration are written beside the symbol. Relationship type is written on the line.",
                  "결혼년도는 선 위에(결 90'). 나이는 기호 안에, 출생년도는 왼쪽 위, 사망년도는 오른쪽 위. 질병·중독·투병 기간은 기호 옆에 적습니다. 관계 유형은 선 위에 적습니다.",
                  "結婚年標於線上（m.90）。年齡置於符號內，出生年於左上，歿年於右上。疾病、成癮與病程寫於符號旁；關係類型寫於線上。",
                ], li)}
              </div>
              <div style={{ fontSize: 12, color: T.mute, lineHeight: 1.5, fontFamily: FB, paddingTop: 6 }}>{t("refNote")}</div>
            </Sheet>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ background: T.ink, color: "#fff", padding: "6px 12px", fontFamily: FB, fontSize: 12.5, fontWeight: 600, letterSpacing: ".06em", marginBottom: 8 }}>
            {t("refBooks")}
          </div>
          {BOOKS.map((b, i) => (
            <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid #EDEAE2" }}>
              <div style={{ fontSize: 13.5, color: T.ink, fontFamily: FS }}>{bookFrag(b)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 관계 유형을 글자가 아니라 그림으로 고르는 선택판 — 도구 막대에서
   처음 고를 때와 같은 방식으로, 패널에서 고칠 때도 기호를 보고 고른다. */
/* 폭력·학대·집중·통제는 이제 화살표 하나뿐이다. 그 화살표를 또 한
   번 글자로 반복해 적으면("폭력·학대") 탭에 이미 쓰인 말을 아래에서
   되풀이하는 셈이다. 그렇다고 아예 안 보이면 허전하다. 그래서 화살표
   가운데에 자리 하나를 비워 두고, 종류를 고르면 그 자리가 채워지는
   모습을 미리 보여 준다 — 실제 가계도 위에 그려질 모습 그대로. */
function AbuseSlotPreview({ type, kindLabel, li }) {
  const col = bondColor(type);
  const meta = BOND_TYPES[type] || BOND_TYPES.harmony;
  const p1 = { x: 4, y: 14 }, p2 = { x: 150, y: 14 };
  const parts = bondGlyphParts(meta, p1, p2, col, "prev-", 0, "");
  const w = kindLabel ? Math.max(30, kindLabel.length * 6.6 + 16) : 40;
  return (
    <svg width={156} height={28} viewBox="0 0 156 28" style={{ flexShrink: 0 }}>
      {parts}
      <g transform="translate(77,14)">
        {kindLabel ? (
          <>
            <rect x={-w / 2} y={-8.5} width={w} height={17} rx={8.5} fill="#fff" stroke={col} strokeWidth={1.2} />
            <text y={3.5} textAnchor="middle" fontSize={10} fontFamily={FB} fontWeight={700} fill={col}>{kindLabel}</text>
          </>
        ) : (
          <rect x={-w / 2} y={-8.5} width={w} height={17} rx={8.5} fill="none" stroke={col} strokeWidth={1.3}
            strokeDasharray="2.5 3" opacity={0.5} />
        )}
      </g>
    </svg>
  );
}
function BondTypePicker({ value, kind, onChange, onKind, li }) {
  /* 예전에는 후보마다 흰 상자를 두르고 그 안에 미리보기 선과 글자를
     넣었다. 폭력·학대 갈래처럼 여섯 개가 한꺼번에 뜨면 상자가 상자를
     밀어내며 빡빡하고 산만해졌다. 상자를 걷어내고, 한 줄에 하나씩
     읽히는 목록으로 바꾼다 — 선택된 것만 가는 왼쪽 선으로 표시한다. */
  const catOf = (ty) => (BOND_TYPES[ty] || BOND_TYPES.harmony).cat;
  const [cat, setCat] = useState(catOf(value));
  useEffect(() => { setCat(catOf(value)); }, [value]);
  /* 지금 고른 유형의 갈래가 지금 보고 있는 탭과 같을 때만 세부 항목을
     보여 준다. 연결·거리·갈등처럼 유형이 여럿인 갈래는 탭만 눌러도
     value가 안 바뀌므로, 그 사이에 이전 갈래(폭력·집중)의 세부 항목이
     엉뚱하게 남아 있었다. */
  const kinds = catOf(value) === cat ? kindsOf(BOND_TYPES[value]) : null;
  const directKindType = KIND_SETS[cat] ? cat : null;
  return (
    /* 구간 상자 전체에 onPointerDown이 걸려 있어, 여기서 막지 않으면
       유형 단추를 누르는 순간 부모가 먼저 선택 상태를 바꾸고 다시
       그린다. 그 사이에 단추의 click이 사라져, 어떤 때는 바뀌고 어떤
       때는 바뀌지 않는 것처럼 보였다. */
    <div className="flex flex-col" style={{ gap: 10 }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex" style={{ gap: 12, rowGap: 6, flexWrap: "wrap", borderBottom: `1px solid ${T.rule}`, paddingBottom: 8 }}>
        {Object.entries(BOND_CATS).map(([ck, cv]) => (
          <button key={ck} type="button" onClick={() => {
            setCat(ck);
            /* 갈래 안에 유형이 하나뿐이면(폭력·학대, 집중·통제) 그 갈래를
               고르는 것 자체가 유형을 고르는 것과 같다. 아래 목록에서
               한 번 더 눌러야 하는 건 불필요한 손놀림이었다. 갈래에
               유형이 여럿이면(연결, 거리·단절, 갈등) 예전처럼 목록에서
               직접 고른다. */
            const only = Object.entries(BOND_TYPES).filter(([, v]) => v.cat === ck && !v.legacy);
            if (only.length === 1) onChange(only[0][0]);
          }}
            style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer",
              fontSize: 11, fontFamily: FB, whiteSpace: "nowrap",
              color: cat === ck ? cv.color : T.mute, fontWeight: cat === ck ? 700 : 500,
              borderBottom: cat === ck ? `2px solid ${cv.color}` : "2px solid transparent",
              paddingBottom: 7, marginBottom: -9 }}>
            {tr(BOND_CAT_TAB[ck], li)}
          </button>
        ))}
      </div>
      {!directKindType && <div className="flex flex-col">
        {Object.entries(BOND_TYPES).filter(([, v]) => v.cat === cat && !v.legacy).map(([ty, v]) => {
          const on = ty === value;
          return (
            <button key={ty} type="button" onPointerDown={(e) => { e.stopPropagation(); onChange(ty); }} className="flex items-center"
              style={{ gap: 10, padding: "7px 6px", cursor: "pointer", textAlign: "left", border:'none',
                background: on ? "rgba(166,124,52,.08)" : "transparent",
                borderRadius: 3, transition: "background .12s ease" }}>
              <svg width={46} height={16} viewBox="0 0 46 16" style={{ flexShrink: 0 }}><BondPreview type={ty} w={46} /></svg>
              <span style={{ fontSize: 11.5, fontFamily: FB, color: on ? T.ink : T.ink2,
                fontWeight: on ? 600 : 400 }}>{tr(v.label, li)}</span>
            </button>
          );
        })}
      </div>}
      {directKindType && (
        /* 종류 여섯 개를 한 줄에 단어로 늘어놓는다 — 상자 없이, 쉼표
           대신 가운뎃점으로 이었다. 상자를 두르면 줄이 자꾸 접혔다. */
        <div className="flex items-center" style={{ gap: 0, flexWrap: "wrap", rowGap: 6 }}>
          {Object.entries(KIND_SETS[directKindType]).map(([k, label], i) => (
            <span key={k} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <span style={{ color: T.faint, margin: "0 7px", fontSize: 11 }}>·</span>}
              <button type="button" onPointerDown={(e) => { e.stopPropagation(); onKind(k); }}
                style={{ padding: 0, cursor: "pointer", background: "transparent", border: "none",
                  fontSize: 12, fontFamily: FB, whiteSpace: "nowrap",
                  color: kind === k ? bondColor(value) : T.ink2, fontWeight: kind === k ? 700 : 500,
                  textDecoration: kind === k ? "underline" : "none", textUnderlineOffset: 3 }}>
                {tr(label, li)}
              </button>
            </span>
          ))}
        </div>
      )}
      {/* 세부 종류는 '지금 고른 유형'에만 딸린다. 바깥에 따로 두었더니
          유형을 바꿔도 이전 목록이 남아 있는 일이 생겼다. 고른 유형
          바로 아래에 두면 둘이 어긋날 자리가 없다. */}
      {kinds && !directKindType && (
        <div className="flex" style={{ gap: 4, flexWrap: "wrap", paddingTop: 2 }}>
          {Object.entries(kinds).map(([k, label]) => (
            <button key={k} type="button" onPointerDown={(e) => { e.stopPropagation(); onKind(k); }}
              style={{ padding: "4px 8px", borderRadius: 3, fontSize: 10.5, fontFamily: FB, cursor: "pointer", border:'none',
                background: kind === k ? `${bondColor(value)}18` : "transparent",
                color: kind === k ? bondColor(value) : T.ink2, fontWeight: kind === k ? 700 : 500 }}>
              {tr(label, li)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 12, padding: 18 }}>
      <h3 style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

/* ══ UI atoms ═══════════════════════════════════════════════════ */
const inputStyle = { border: `1px solid ${T.rule}`, borderRadius: 5, padding: "6px 9px", fontSize: 13, fontFamily: FB, color: T.ink, background: "#fff", width: "100%" };
const kbd = { fontFamily: FM, fontSize: 9.5, border: `1px solid ${T.rule}`, borderRadius: 4, padding: "1px 4px", background: "#fff", color: T.mute };
const Sep = () => <div style={{ width: 1, height: 22, background: T.rule, flexShrink: 0 }} />;
const Btn = ({ children, onClick, active, tone = "ghost", disabled, full }) => {
  const s = {
    ghost: { background: active ? T.sageSoft : "#fff", color: active ? T.pine : T.ink2, border: `1px solid ${active ? T.sage : T.rule}` },
    solid: { background: T.pine, color: "#fff", border: `1px solid ${T.pine}` },
    warn: { background: "#fff", color: T.red, border: "1px solid #E7D2CC" },
  }[tone];
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded ${full ? "w-full" : ""}`}
      style={{ ...s, padding: "8px 12px", fontSize: 12.5, fontFamily: FB, fontWeight: 500, borderRadius: 7,
        opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer", lineHeight: 1.35 }}>{children}</button>
  );};
const Field = ({ label, children }) => (
  <label className="flex flex-col" style={{ gap: 4 }}>
    <span className="gs-field-label" style={{ fontSize: 11, color: T.ink2, fontFamily: FB, fontWeight: 600, letterSpacing: '.002em' }}>{label}</span>{children}
  </label>
);
const Check = ({ label, checked, onChange, color, title }) => (
  <label className="gs-check flex items-center" title={title} style={{ gap: 7, fontSize: 12.5, fontFamily: FB, color: T.ink2, cursor: "pointer", padding: "2px 0" }}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color || T.pine, width: 15, height: 15 }} />
    {label}
  </label>
);
const SectionTitle = ({ children, right }) => (
  <div className="gs-section-title flex items-center justify-between" style={{ marginBottom: 8 }}>
    <h3 style={{ fontFamily: FD, fontSize: 15, color: T.ink, fontWeight: 700, letterSpacing: '-.01em' }}>{children}</h3>{right}
  </div>
);
const RowBtn = ({ children, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 0", borderBottom: "1px solid #EEF1EC",
      background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontFamily: FB, color: T.ink }}>{children}</button>
);
function TopChip({ children, onClick, faded }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "transparent", color: faded ? "rgba(255,255,255,.42)" : "#fff", cursor: "pointer", flexShrink: 0,
        border: faded ? "1px dashed rgba(255,255,255,.2)" : "1px solid rgba(255,255,255,.24)",
        borderRadius: 15, padding: "6px 12px", fontSize: 12.5, fontFamily: FB, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</button>
  );
}
function Group({ children }) {
  /* 버튼 하나하나가 상자로 또렷이 보이되, 전부 짙게 테두리 치면
     막대 전체가 시끄러워진다. 그래서 평소에는 옅은 회색 테두리로
     "여기가 버튼이다"만 알려주고, 마우스를 올린 버튼이 속한
     상자만 살짝 진해지며 그림자가 뜬다(.gs-group:has 규칙) —
     구별은 쉽게, 소란스럽지는 않게. */
  return (
    <div className="gs-group" style={{ display: "flex", alignItems: "stretch", background: "#fff", borderRadius: 10,
      boxShadow: "0 1px 2px rgba(22,32,42,.05)",
      overflow: "hidden", flexShrink: 0, border: "1px solid rgba(22,32,42,.13)",
      transition: "border-color .12s ease, box-shadow .12s ease" }}>{children}</div>
  );
}
function GBtn({ children, onClick, onPointerDown, active, first, disabled, title }) {
  return (
    <button type="button" className="gs-gbtn" onClick={onClick} onPointerDown={onPointerDown} disabled={disabled} title={title} aria-pressed={active===undefined?undefined:!!active}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", border: "none", borderLeft: first ? "none" : "1px solid rgba(22,32,42,.1)",
        cursor: disabled ? "default" : "pointer",
        background: active ? "linear-gradient(155deg, #2C4A6E 0%, #17293F 100%)" : "transparent",
        color: disabled ? T.faint : active ? "#fff" : T.ink2, opacity: disabled ? 0.5 : 1,
        boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,.06)" : "none",
        fontSize: 12.5, fontFamily: FB, fontWeight: active ? 600 : 500, whiteSpace: "nowrap",
        transition: "background .12s ease, color .12s ease" }}>{children}</button>
  );
}
function ToolChip({ children, onClick, active }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center"
      style={{ gap: 6, padding: "7px 11px", borderRadius: 7, flexShrink: 0, cursor: "pointer", letterSpacing: "-.01em",
        background: active ? T.sageSoft : "#fff", border: `1px solid ${active ? T.sage : T.rule}`,
        color: active ? T.pine : T.ink2, fontSize: 12.5, fontFamily: FB, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{children}</button>
  );
}
/* 삼각관계 유형 열한 개를 알약으로 늘어놓으면 줄바꿈되면서 긴
   이름("부부 갈등에 자녀가 끼어듦")이 상자 밖으로 나갔다. 접이식
   메뉴 하나로 바꾼다. '기타'를 고르면 빈칸이 나오고, 거기 적은
   글자가 그대로 유형 이름이 된다 — 미리 정해 둔 것 말고 현장에서
   실제로 보는 유형을 쓸 수 있어야 한다. */
function TriKindPicker({ value, custom, onPick, onCustom, li }) {
  const [open, setOpen] = useState(false);
  const isCustom = !value && custom != null;
  const shown = value ? tr(value, li) : (custom || tr(["Choose a pattern", "유형을 고르세요", "選擇型態"], li));
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", color: (value || custom) ? T.ink : T.mute, textAlign: "left" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shown}</span>
        <span style={{ fontSize: 9, opacity: 0.6, flexShrink: 0, marginLeft: 6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: `1px solid ${T.rule}`, borderRadius: 8,
          boxShadow: "0 6px 20px rgba(20,36,58,.14)", maxHeight: 220, overflowY: "auto", padding: 4 }}>
          {TRI_TYPES.slice(0, -1).map((ty, i) => (
            <button key={i} type="button" onClick={() => { onPick(ty); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 5,
                background: value === ty ? "#F4F1F8" : "transparent", border: "none", cursor: "pointer",
                fontSize: 12, fontFamily: FB, color: T.ink }}>{tr(ty, li)}</button>
          ))}
          <div style={{ borderTop: `1px solid ${T.rule}`, margin: "4px 0" }} />
          <div style={{ padding: "4px 8px" }}>
            <span style={{ fontSize: 10.5, color: T.mute, fontFamily: FB }}>{tr(["Other — describe it", "기타 — 직접 적기", "其他 — 自行填寫"], li)}</span>
            <input value={isCustom ? (custom || "") : ""} autoFocus={isCustom}
              onChange={(e) => onCustom(e.target.value)}
              onFocus={() => { if (!isCustom) onCustom(""); }}
              placeholder={tr(["e.g. Money, in-laws…", "예: 돈 문제, 시댁 갈등…", "例：金錢、姻親衝突…"], li)}
              style={{ ...inputStyle, marginTop: 4, fontSize: 12 }} />
          </div>
        </div>
      )}
    </div>
  );
}
function MiniBtn({ children, onClick, active }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center"
      style={{ gap: 3, padding: "5px 7px", borderRadius: 6, cursor: "pointer", background: active ? T.sageSoft : "#fff",
        border: `1px solid ${active ? T.sage : "#E3E8E0"}`, color: active ? T.pine : T.ink2, fontSize: 11, fontFamily: FB,
        fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{children}</button>
  );
}
function BarChip({ children, onClick, tone, color }) {
  const c = tone === "warn" ? T.red : color || T.ink2;
  return (
    <button type="button" onClick={onClick} className="flex items-center"
      style={{ gap: 6, padding: "8px 12px", borderRadius: 18, flexShrink: 0, cursor: "pointer",
        background: color ? "#fff" : "#fff",
        border: `1px solid ${tone === "warn" ? "#E7D2CC" : color || T.rule}`, color: c,
        fontSize: 12.5, fontFamily: FB, fontWeight: color ? 600 : 500, whiteSpace: "nowrap" }}>{children}</button>
  );
}
function GenderGlyph({ gender }) {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      {gender === "male" && <rect x={2.5} y={2.5} width={11} height={11} fill="none" stroke={T.ink} strokeWidth={1.6} />}
      {gender === "female" && <circle cx={8} cy={8} r={5.6} fill="none" stroke={T.ink} strokeWidth={1.6} />}
      {gender === "unknown" && <path d="M 8 2 L 14 8 L 8 14 L 2 8 Z" fill="none" stroke={T.ink} strokeWidth={1.6} />}
      {gender === "object" && <rect x={1.5} y={4} width={13} height={8} rx={3} fill={T.ink2} />}
    </svg>
  );
}
const TriGlyph = () => (
  <svg width={14} height={13} viewBox="0 0 14 13"><path d="M 7 1 L 13 12 L 1 12 Z" fill="none" stroke={TRI_COLOR} strokeWidth={1.6} strokeDasharray="3 2" /></svg>
);
function Handle({ x, y, label, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center justify-center"
      style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", minWidth: 46, height: 34,
        padding: "2px 9px", borderRadius: 17, background: T.pine, color: "#fff", border: "2px solid #fff",
        boxShadow: "0 3px 10px rgba(22,32,42,.26)", cursor: "pointer", fontSize: 12, fontFamily: FB,
        fontWeight: 600, lineHeight: 1.1, zIndex: 6, whiteSpace: "nowrap" }}>
      <span>{label}</span>{sub && <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.85 }}>{sub}</span>}
    </button>
  );
}
/* 대상 고르기 — 부모·형제 손잡이와 같은 방식으로, 인물 둘레에 원형으로 펼친다 */
function ObjectRing({ p, view, svgRef, li, onPick, onClose, mode = "add" }) {
  const rect = svgRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const sx = view.x + p.x * view.k, sy = view.y + p.y * view.k;
  const kinds = Object.entries(OBJ_KINDS);
  const R = 108;
  const cx = Math.max(R + 60, Math.min(rect.width - R - 60, sx));
  const cy = Math.max(R + 34, Math.min(rect.height - R - 60, sy));
  return (
    <>
      <div onPointerDown={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(22,32,42,.18)", zIndex: 9 }} />
      <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", zIndex: 10,
        width: 96, height: 96, borderRadius: 48, background: "rgba(255,255,255,.97)", border: `1px solid ${T.rule}`,
        boxShadow: "0 8px 26px rgba(22,32,42,.18)", display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: 12 }}>
        <span style={{ fontSize: 11, fontFamily: FB, color: T.mute, lineHeight: 1.4 }}>{tr(mode === "edit" ? S.objRingEdit : S.objRingHint, li)}</span>
      </div>
      {kinds.map(([k, label], i) => {
        const a = (i / kinds.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <button key={k} type="button" onPointerDown={(e) => { e.stopPropagation(); onPick(k); onClose(); }}
            style={{ position: "absolute", left: cx + Math.cos(a) * R, top: cy + Math.sin(a) * R,
              transform: "translate(-50%,-50%)", zIndex: 11, cursor: "pointer", whiteSpace: "nowrap",
              background: "#fff", border: `1.5px solid ${mode === "edit" && p.objKind === k ? T.gold : T.ink2}`,
              borderRadius: 18, padding: "8px 13px",
              fontSize: 12, fontFamily: FB, fontWeight: 600, color: mode === "edit" && p.objKind === k ? T.gold : T.ink,
              boxShadow: "0 4px 14px rgba(22,32,42,.16)" }}>
            ▭ {tr(label, li)}
          </button>
        );
      })}
    </>
  );
}

function NodeHandles({ p, view, svgRef, hasParents, li, onSpouse, onSameSpouse, onParents, onSon, onDaughter, onBrother, onSister, onBond }) {
  const rect = svgRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const sx = view.x + p.x * view.k, sy = view.y + p.y * view.k, r = 34 * view.k + 18;
  if (sx < -60 || sy < -60 || sx > rect.width + 60 || sy > rect.height + 60) return null;
  const cx = (v) => Math.max(48, Math.min(rect.width - 48, v));
  const cy = (v) => Math.max(24, Math.min(rect.height - 74, v));
  const right = p.gender !== "female";
  const t = (k) => tr(S[k], li);
  return (
    <>
      {!hasParents && <Handle x={cx(sx)} y={cy(sy - r - 24)} label={`＋${t("parents")}`} onClick={onParents} />}
      <Handle x={cx(right ? sx + r + 52 : sx - r - 52)} y={cy(sy - 20)} label={`＋${t("spouse")}`} onClick={onSpouse} />
      <Handle x={cx(right ? sx + r + 52 : sx - r - 52)} y={cy(sy + 20)} label={`＋${t("ssmSpouse")}`} onClick={onSameSpouse} />
      <Handle x={cx(sx - 40)} y={cy(sy + r + 26)} label={`＋${t("son")}`} sub="□" onClick={onSon} />
      <Handle x={cx(sx + 40)} y={cy(sy + r + 26)} label={`＋${t("daughter")}`} sub="○" onClick={onDaughter} />
      <Handle x={cx(sx)} y={cy(sy + r + 66)} label={t('menuBond')} onClick={onBond} />
      <Handle x={cx(right ? sx - r - 52 : sx + r + 52)} y={cy(sy - 20)} label={`＋${t("brother")}`} sub="□" onClick={onBrother} />
      <Handle x={cx(right ? sx - r - 52 : sx + r + 52)} y={cy(sy + 20)} label={`＋${t("sister")}`} sub="○" onClick={onSister} />
    </>
  );
}
function ActionBar({ li, barMode, setBarMode, bondCat, setBondCat, onBond, onOpenPanel, onDelete }) {
  const t = (k) => tr(S[k], li);
  return (
    <div className="flex items-center" style={{ position: "absolute", left: 8, right: 8, bottom: 10, gap: 6, padding: "7px 8px",
      background: "rgba(255,255,255,.92)", backdropFilter: "blur(6px)", border: "1px solid rgba(22,32,42,.08)", borderRadius: 24,
      boxShadow: "0 10px 28px rgba(22,32,42,.16), 0 1px 0 rgba(255,255,255,.7) inset", overflowX: "auto", zIndex: 6 }}>
      {barMode === "main" && (<>
        <BarChip onClick={() => setBarMode("bond")}><svg width={30} height={14}><BondPreview type="conflict" w={30} /></svg>{t("relType")}</BarChip>
        <BarChip onClick={onOpenPanel}>✎</BarChip>
        <BarChip tone="warn" onClick={onDelete}>✕</BarChip>
      </>)}
      {barMode === "bond" && (<>
        {Object.entries(BOND_CATS).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setBondCat(k)}
            style={{ padding: "7px 11px", borderRadius: 18, flexShrink: 0, cursor: "pointer", whiteSpace: "nowrap",
              background: bondCat === k ? v.color : "#fff", color: bondCat === k ? "#fff" : v.color,
              border: `1px solid ${v.color}`, fontSize: 12, fontFamily: FB, fontWeight: 600 }}>{tr(v.label, li)}</button>
        ))}
        <Sep />
        {Object.entries(BOND_TYPES).filter(([, v]) => v.cat === bondCat).map(([ty, v]) => (
          <BarChip key={ty} onClick={() => onBond(ty)} color={bondColor(ty)}>
            <svg width={34} height={14}><BondPreview type={ty} w={34} /></svg>{tr(v.label, li)}
          </BarChip>
        ))}
        <BarChip onClick={() => setBarMode("main")}>←</BarChip>
      </>)}
    </div>
  );
}
function TransitionAdder({ li, transitions, onAdd, onEdit, onDelete }) {
  /* 한 번 적고 나면 고칠 방법이 없었다 — 이름이나 연도가 틀리면
     지우고 새로 적는 수밖에 없었고, 그러면 그 전환기에 연결해 둔
     사건들의 연결도 함께 끊어졌다. 이제 목록의 항목을 누르면 그
     내용이 입력칸으로 올라오고, 단추가 '추가'에서 '저장'으로 바뀐다. */
  const [editId, setEditId] = useState(null);
  const [label, setLabel] = useState(""), [fromYear, setFrom] = useState(""), [toYear, setTo] = useState("");
  const t = (k) => tr(S[k], li);
  const startEdit = (g) => { setEditId(g.id); setLabel(g.label); setFrom(g.fromYear ?? ""); setTo(g.toYear ?? ""); };
  const reset = () => { setEditId(null); setLabel(""); setFrom(""); setTo(""); };
  const commit = () => {
    if (!label) return;
    const patch = { label, fromYear: fromYear ? +fromYear : null, toYear: toYear ? +toYear : null };
    if (editId) onEdit(editId, patch);
    else onAdd({ ...patch, color: TRANSITION_COLORS[transitions.length % TRANSITION_COLORS.length] });
    reset();
  };
  return (
    <div className="flex flex-col" style={{ gap: 7, padding: 10, background: "#FDF8EC", border: `1px solid ${T.goldSoft}`, borderRadius: 7 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.gold, fontFamily: FB }}>{t("transitionTitle")}</div>
      <div className="flex" style={{ gap: 6 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("transitionName")} style={{ ...inputStyle, flex: 1 }} />
        <input value={fromYear} onChange={(e) => setFrom(e.target.value)} placeholder={t("transitionFrom")} style={{ ...inputStyle, width: 62, fontFamily: FM }} />
        <input value={toYear} onChange={(e) => setTo(e.target.value)} placeholder={t("transitionTo")} style={{ ...inputStyle, width: 62, fontFamily: FM }} />
        <Btn onClick={commit}>{editId ? t("save") : t("add")}</Btn>
        {editId && <Btn onClick={reset}>{t("cancel")}</Btn>}
      </div>
      {transitions.map((g, i) => <div key={g.id} className="flex items-center" style={{ gap: 7, fontSize: 11.5 }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: g.color || TRANSITION_COLORS[i % TRANSITION_COLORS.length], flexShrink: 0 }} />
        <button type="button" onClick={() => startEdit(g)}
          style={{ flex: 1, textAlign: "left", background: editId === g.id ? "#FDF0CE" : "transparent",
            border: "none", borderRadius: 4, padding: "2px 4px", cursor: "pointer", fontSize: 11.5, fontFamily: FB, color: T.ink }}>
          {g.label}<span style={{ color: T.mute }}>{g.fromYear || g.toYear ? ` · ${g.fromYear || "?"}–${g.toYear || "?"}` : ""}</span>
        </button>
        <Btn tone="warn" onClick={() => { if (editId === g.id) reset(); onDelete(g.id); }}>✕</Btn>
      </div>)}
      <div style={{ fontSize: 10.5, color: T.mute, lineHeight: 1.55 }}>{tr(["Events linked to the same transition are encircled together across the history layers.", "같은 전환기에 연결한 사건은 여러 역사 층을 가로질러 하나의 원으로 묶입니다.", "連結至同一轉換期的事件，會跨越各歷史層級以同一橢圓圈組。"], li)}</div>
    </div>
  );
}
function EventAdder({ li, onAdd, people, transitions = [] }) {
  const [year, setYear] = useState(""), [endYear, setEndYear] = useState("");
  const [title, setTitle] = useState(""), [type, setType] = useState("move"), [personId, setPersonId] = useState("");
  const [scope, setScope] = useState("family"), [transitionId, setTransitionId] = useState("");
  const t = (k) => tr(S[k], li);
  return (
    <div className="flex flex-col" style={{ gap: 6, padding: 10, background: "#F4F7FA", borderRadius: 6 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink2, fontFamily: FB }}>{t("eventAdderTitle")}</div>
      <div className="flex" style={{ gap: 6 }}>
        <input value={year} onChange={(e) => setYear(e.target.value)} placeholder={t("evYear")} style={{ ...inputStyle, width: 68, fontFamily: FM }} />
        <input value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder={t("evEnd")} style={{ ...inputStyle, width: 60, fontFamily: FM }} />
        {/* 사건은 종류를 먼저 고르게 한다. 예전에는 자유 입력칸과 종류
            선택칸이 따로 있어 같은 것을 두 번 적는 꼴이었다. */}
        <select value={type}
          onChange={(e) => {
            const k = e.target.value;
            setType(k);
            /* 아직 손대지 않았거나 앞서 고른 종류 이름 그대로면 새 이름으로 바꾼다 */
            const prev = tr((EVENT_TYPES[type] || EVENT_TYPES.other).label, li);
            if (!title.trim() || title.trim() === prev) setTitle(tr(EVENT_TYPES[k].label, li));
          }}
          style={{ ...inputStyle, flex: 1 }}>
          {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{tr(v.label, li)}</option>)}
        </select>
      </div>
      <div className="flex" style={{ gap: 6 }}>
        <input data-trans="" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("evDetail")} style={inputStyle} />
      </div>
      <div className="flex" style={{ gap: 6 }}>
        <select value={scope} onChange={(e) => { setScope(e.target.value); if (e.target.value !== "person") setPersonId(""); }} style={{ ...inputStyle, width: 118 }}>
          <option value="family">{t("evFamily")}</option>
          <option value="parents">{t("evParents")}</option>
          <option value="person">{t("evPerson")}</option>
          <option value="other">{t("evOther")}</option>
        </select>
        {scope === "person" && <select value={personId} onChange={(e) => setPersonId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">{t("evPerson")}</option>
          {people.filter((p) => !p.preg && p.gender !== "object").map((p) => <option key={p.id} value={p.id}>{personName(p, li)}</option>)}
        </select>}
      </div>
      <div className="flex" style={{ gap: 6 }}>
        <select value={transitionId} onChange={(e) => setTransitionId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">{t("noTransition")}</option>
          {transitions.map((g) => <option key={g.id} value={g.id}>◯ {g.label}</option>)}
        </select>
        <Btn onClick={() => { const label = title.trim() || tr((EVENT_TYPES[type] || EVENT_TYPES.other).label, li); if (year && (scope !== "person" || personId)) { onAdd({ year: +year, endYear: endYear ? +endYear : null, title: label, type, scope, personId: scope === "person" ? personId : null, transitionId: transitionId || null }); setYear(""); setEndYear(""); setTitle(""); } }}>{t("add")}</Btn>
      </div>
      <div style={{ fontSize: 10.5, color: T.mute, lineHeight: 1.5 }}>{tr(["Choose the family, parents, a person from the genogram, or other context. Child rows are created automatically from the focal family.", "가족 전체·부모·가계도 인물·기타 중 하나를 선택합니다. 자녀 행은 중심 가족의 인물을 따라 자동 생성됩니다.", "選擇全家、父母、家系圖人物或其他脈絡。子女列會依核心家庭人物自動建立。"], li)}</div>
    </div>
  );
}
function ContextRings({ li, active, onPick }) {
  return (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: 150 }}>
      {CTX_RINGS.slice().reverse().map((r, i) => {
        const idx = CTX_RINGS.length - 1 - i, rad = 14 + idx * 9.5;
        const on = tr(active, li) === tr(r, li) && active;
        return (
          <circle key={idx} cx={95} cy={78} r={rad} onClick={() => onPick(on ? "" : r)} style={{ cursor: "pointer" }}
            fill={on ? TRI_COLOR : idx % 2 ? "#E9EBE6" : "#F6F7F4"} opacity={on ? 0.22 : 1}
            stroke={on ? TRI_COLOR : "#DDE2D9"} strokeWidth={on ? 2 : 1} />
        );
      })}
      {CTX_RINGS.map((r, idx) => (
        <text key={idx} x={95} y={78 - (14 + idx * 9.5) + 7} textAnchor="middle" fontSize={6.2}
          fill={active && tr(active, li) === tr(r, li) ? TRI_COLOR : T.ink2} fontFamily={FB}
          onClick={() => onPick(active && tr(active, li) === tr(r, li) ? "" : r)} style={{ cursor: "pointer" }}>{tr(r, li)}</text>
      ))}
      <line x1={10} y1={78} x2={180} y2={78} stroke={T.ink2} strokeWidth={1} />
      <text x={184} y={81} fontSize={7.5} fill={T.ink2} fontFamily={FB}>time →</text>
      <line x1={185} y1={12} x2={185} y2={62} stroke={TRI_COLOR} strokeWidth={1} />
      <text x={190} y={22} fontSize={7} fill={TRI_COLOR} fontFamily={FB}>vertical</text>
      <text x={12} y={98} fontSize={7} fill={T.pine} fontFamily={FB}>horizontal →</text>
    </svg>
  );
}
function UnionLinePreview({ type, w = 52, color = T.line }) {
  const meta = UNION_TYPES[type], mid = w / 2;
  return (
    <svg width={w} height={16} style={{ display: "block" }}>
      <line x1={2} y1={8} x2={w - 2} y2={8} stroke={color} strokeWidth={1.8} strokeDasharray={meta.dash || undefined} />
      {meta.marks === 1 && <line x1={mid - 5} y1={14} x2={mid + 5} y2={2} stroke={color} strokeWidth={1.8} />}
      {meta.marks === 2 && (<g><line x1={mid - 11} y1={14} x2={mid - 1} y2={2} stroke={color} strokeWidth={1.8} /><line x1={mid + 1} y1={14} x2={mid + 11} y2={2} stroke={color} strokeWidth={1.8} /></g>)}
      {meta.marks === 3 && (<g><line x1={mid - 6} y1={14} x2={mid + 6} y2={2} stroke={color} strokeWidth={1.8} /><line x1={mid - 6} y1={2} x2={mid + 6} y2={14} stroke={color} strokeWidth={1.8} /></g>)}
    </svg>
  );
}
function ChildLinkPreview({ link, gender = "male", small = false }) {
  const s = small ? 0.75 : 1;
  const dash = LINK_DASH[link] || undefined;
  return (
    <svg width={26 * s} height={30 * s} viewBox="0 0 26 30" style={{ display: "block", flexShrink: 0 }}>
      <line x1={13} y1={1} x2={13} y2={16} stroke={T.line} strokeWidth={1.8} strokeDasharray={dash} />
      {gender === "female" ? <circle cx={13} cy={23} r={6} fill="#fff" stroke={T.ink} strokeWidth={1.6} />
        : <rect x={7} y={17} width={12} height={12} fill="#fff" stroke={T.ink} strokeWidth={1.6} />}
    </svg>
  );
}
function TwinPreview({ gender = "male", identical = false, small = false }) {
  const s = small ? 0.75 : 1;
  const Sym = ({ cx }) => gender === "female"
    ? <circle cx={cx} cy={22} r={5.5} fill="#fff" stroke={T.ink} strokeWidth={1.5} />
    : <rect x={cx - 5.5} y={16.5} width={11} height={11} fill="#fff" stroke={T.ink} strokeWidth={1.5} />;
  return (
    <svg width={40 * s} height={30 * s} viewBox="0 0 40 30" style={{ display: "block", flexShrink: 0 }}>
      <path d="M 20 1 L 20 7 M 20 7 L 9 15 M 20 7 L 31 15" stroke={T.line} strokeWidth={1.6} fill="none" />
      <line x1={9} y1={27.5} x2={31} y2={27.5} stroke={T.line} strokeWidth={identical ? 2.6 : 1.3} />
      <Sym cx={9} /><Sym cx={31} />
    </svg>
  );
}
function BondPreview({ type, w = 64 }) {
  const meta=BOND_TYPES[type]||BOND_TYPES.harmony;
  return <svg width={w} height={22} viewBox={`0 0 ${w} 22`} aria-hidden="true">
    {bondGlyphParts(meta,{x:4,y:11},{x:w-4,y:11},bondColor(type),"preview-")}
  </svg>;
}

export { splitSentences };
