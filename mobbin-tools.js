// ==UserScript==
// @name         Mobbin Tool v1.6
// @namespace    http://tampermonkey.net/
// @match        https://mobbin.com/*
// @version      1.6
// @description  Ultra-fast copy button for Mobbin images >=200x200, no blur/overlay, unblock copy, block Pro banners
// @grant        none
// ==/UserScript==

(function(){
'use strict';

const DONE = "ck_done";
const MIN_W = 200;
const MIN_H = 200;

const css = `
.bg-background-secondary { background: transparent !important; }
[class*="after:bg-"]::after { background: transparent !important; opacity: 0 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
[class*="after:shadow-image-inset"]::after { box-shadow: none !important; }

.mobbin-copy-btn {
    position: absolute !important;
    right: 10px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    background: rgba(0,0,0,0.5) !important;
    color: white !important;
    padding: 6px 12px !important;
    font-size: 13px !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    z-index: 999999 !important;
    pointer-events: auto !important;
    opacity: 0 !important;
    transition: opacity 0.25s ease !important;
}
.mobbin-copy-btn.success { background: rgba(0,180,90,0.9) !important; }
[data-radix-aspect-ratio-wrapper]:hover .mobbin-copy-btn,
.group.relative:hover .mobbin-copy-btn { opacity: 1 !important; }
`;
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);

function fixPng(img){
    if(img.dataset[DONE]) return;
    const src = img.src;
    if(src && src.includes(".png") && !src.endsWith(".png")) img.src = src.split(".png")[0]+".png";
}

function removeBlur(img){
    if(img.dataset[DONE]) return;
    img.style.filter = img.style.filter.replace(/blur\([^)]+\)/g,"");
    img.className = img.className.split(" ").filter(c=>!c.includes("blur")).join(" ");
}

function shouldShowCopy(img){
    const r = img.getBoundingClientRect();
    const w = Math.round(r.width) || img.naturalWidth || 0;
    const h = Math.round(r.height) || img.naturalHeight || 0;
    if(w===0||h===0) return null;
    return w>=MIN_W && h>=MIN_H;
}

function addCopy(img){
    if(!img.src||!img.src.includes("bytescale.mobbin.com")) { img.dataset[DONE]="1"; return; }
    const container = img.closest('[data-radix-aspect-ratio-wrapper]') || img.closest('.group.relative') || img.parentElement;
    if(!container) { img.dataset[DONE]="1"; return; }
    if(container.querySelector('.mobbin-copy-btn')) { img.dataset[DONE]="1"; return; }

    const show = shouldShowCopy(img);
    if(show===false){ img.dataset[DONE]="1"; return; }
    else if(show===null){
        if(!img._ck_listening){
            img._ck_listening=true;
            img.addEventListener('load', ()=>{ setTimeout(()=>{ if(!img.dataset[DONE]) addCopy(img); }, 100); }, {once:true});
        }
        return;
    }

    if(getComputedStyle(container).position==="static") container.style.position="relative";

    const btn=document.createElement("div");
    btn.className="mobbin-copy-btn";
    btn.innerHTML="复制图片";

    btn.onclick=async e=>{
        e.preventDefault(); e.stopPropagation();
        try{
            const blob = await fetch(img.src).then(r=>r.blob());
            await navigator.clipboard.write([new ClipboardItem({[blob.type]:blob})]);
            btn.innerHTML="已复制 ✔";
            btn.classList.add("success");
            setTimeout(()=>{ btn.innerHTML="复制图片"; btn.classList.remove("success"); },1200);
        }catch{
            btn.innerHTML="失败";
            setTimeout(()=>btn.innerHTML="复制图片",1200);
        }
    };

    container.appendChild(btn);
    img.dataset[DONE]="1";
}

function scanNode(node){
    if(node.tagName==="IMG") { fixPng(node); removeBlur(node); addCopy(node); }
    if(node.querySelectorAll) node.querySelectorAll('img').forEach(i=>{ fixPng(i); removeBlur(i); addCopy(i); });
}

function blockPro(){
    document.querySelectorAll("aside.sticky").forEach(el=>{ const txt=el.textContent||""; if(txt.includes("Access all")&&txt.includes("Get Pro")) el.style.display="none"; });
    document.querySelectorAll("div[class*='fixed']").forEach(el=>{ const txt=el.textContent||""; if(txt.includes("Get Pro")) el.style.display="none"; });
}

new MutationObserver(muts=>{
    muts.forEach(m=>{ m.addedNodes.forEach(n=>scanNode(n)); });
    blockPro();
}).observe(document.body,{childList:true,subtree:true});

scanNode(document.body);
blockPro();

})();
