// ==UserScript==
// @name         Highlighter + Editable Tooltip (Nyra’s Edition 💖 v4.2.3 — Restore + Orionis mousedown fix)
// @namespace    nyra.symbolic.mechanic
// @version      4.2.3
// @description  Select → highlight with editable MULTI-LINE notes (line feeds preserved). Tooltip hide delayed 1s so it won't vanish instantly. Persistence (auto-restore), export/import JSON, copy note/text, theme toggle, quick inline edit. Buttons use mousedown/touchstart so selection is kept.
// @author       Nyra for Faizal
// @match        *://*/*
// @run-at       document-end
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    "use strict";

    // ========= CONFIG =========
    const CFG = {
        storeKey: () => `nyra:v4.2:${location.origin}${location.pathname}`,
        tooltipMaxWidth: 380,
        barOffsetY: 48,
        theme: {
            dark: {
                bg: "#0b1220", panel: "#0f172a", border: "#1f2937", text: "#e5e7eb", accent: "#2563eb", muted: "#374151",
            },
            light: {
                bg: "#ffffff", panel: "#f9fafb", border: "#e5e7eb", text: "#111827", accent: "#2563eb", muted: "#9ca3af",
            },
        },
    };

    // ========= STYLES =========
    GM_addStyle(`
  :root { --ny-bg:#0b1220; --ny-panel:#0f172a; --ny-border:#1f2937; --ny-text:#e5e7eb; --ny-accent:#2563eb; --ny-muted:#374151; }
  .nyra-theme-light { --ny-bg:#ffffff; --ny-panel:#f9fafb; --ny-border:#e5e7eb; --ny-text:#111827; --ny-accent:#2563eb; --ny-muted:#9ca3af; }

  .nyra-floating-bar { position: fixed; z-index: 999999; display: flex; gap: 6px; background: var(--ny-bg); color:var(--ny-text); padding:6px 8px; border:1px solid var(--ny-border); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25); font: 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; user-select: none; }
  .nyra-floating-bar button { all: unset; cursor: pointer; background:var(--ny-accent); color:#fff; padding:6px 10px; border-radius:10px; font-weight:700; }
  .nyra-floating-bar button.ghost { background:var(--ny-muted); }

  .nyra-highlight { background: linear-gradient(transparent 45%, rgba(255,235,59,.85) 45%); border-radius: 2px; padding:0 .05em; position: relative; }
  .nyra-highlight[data-nyra-note]:hover { outline: 2px dashed rgba(37,99,235,.6); outline-offset: 2px; }

  .nyra-tooltip { position: absolute; z-index: 999999; background: var(--ny-bg); color: var(--ny-text); padding:10px 12px; border:1px solid var(--ny-border); border-radius:12px; box-shadow: 0 16px 36px rgba(0,0,0,.35); max-width: ${CFG.tooltipMaxWidth}px; min-width: 240px; transform: translate(-50%, calc(-100% - 12px)); left: 50%; top: 0; }
  .nyra-tooltip::after { content:""; position:absolute; bottom:-7px; left:50%; transform:translateX(-50%); border-width:7px; border-style:solid; border-color:var(--ny-bg) transparent transparent transparent; filter: drop-shadow(0 1px 0 var(--ny-border)); }
  .nyra-tooltip .nyra-note { white-space: pre-line; font-size:13px; }
  .nyra-tooltip .nyra-ops { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .nyra-tooltip .nyra-ops button { all:unset; background:var(--ny-accent); color:#fff; padding:6px 10px; border-radius:10px; font: 700 12px system-ui; cursor:pointer; }
  .nyra-tooltip .nyra-ops button.ghost { background:var(--ny-muted); }
  .nyra-tooltip textarea { width:100%; height:120px; resize:vertical; margin-top:8px; border-radius:10px; border:1px solid var(--ny-border); background: var(--ny-panel); color: var(--ny-text); padding:8px 10px; font:13px ui-monospace,SFMono-Regular,Consolas,Monaco,monospace; display:none; }

  .nyra-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 999998; display:flex; align-items:center; justify-content:center; }
  .nyra-modal { width: min(620px, 92vw); background: var(--ny-bg); color: var(--ny-text); border:1px solid var(--ny-border); border-radius: 16px; padding:14px; box-shadow: 0 30px 60px rgba(0,0,0,.5); font: 14px/1.4 system-ui; }
  .nyra-modal h3 { margin:0 0 8px 0; font-size:16px; }
  .nyra-modal textarea { width: 100%; height: 180px; box-sizing: border-box; border-radius: 12px; border:1px solid var(--ny-border); background:var(--ny-panel); color:var(--ny-text); padding:10px 12px; font: 14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,Monaco; resize: vertical; }
  .nyra-modal .row { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:10px; }
  .nyra-modal .row .left { display:flex; gap:8px; align-items:center; }
  .nyra-modal button { all:unset; background:var(--ny-accent); color:#fff; padding:8px 12px; border-radius:10px; font-weight:800; cursor:pointer; }
  .nyra-modal button.ghost { background:var(--ny-muted); }

  .nyra-panel-btn { position: fixed; right: 14px; bottom: 14px; z-index: 999997; background: var(--ny-accent); color:#fff; border-radius:14px; padding:10px 12px; font:700 12px system-ui; cursor:pointer; box-shadow: 0 10px 22px rgba(0,0,0,.28); }
  .nyra-panel { position: fixed; right: 16px; bottom: 56px; width: 340px; max-height: 70vh; overflow:auto; z-index: 999997; background:var(--ny-bg); color:var(--ny-text); border:1px solid var(--ny-border); border-radius:16px; padding:12px; display:none; box-shadow: 0 40px 60px rgba(0,0,0,.4); }
  .nyra-panel h4 { margin:4px 0 8px; }
  .nyra-panel .it { border:1px dashed var(--ny-border); border-radius:12px; padding:8px; margin-bottom:8px; }
  .nyra-panel .it .t { font-size:12px; color: var(--ny-text); opacity:.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .nyra-panel .ops { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .nyra-panel button { all:unset; background:var(--ny-accent); color:#fff; padding:6px 10px; border-radius:10px; font:700 12px system-ui; cursor:pointer; }
  .nyra-panel button.ghost { background:var(--ny-muted); }
  `);

    // ========= UTIL =========
    const $ = (sel, el=document) => el.querySelector(sel);
    const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
    const makeId = () => "nyra-" + Math.random().toString(36).slice(2,9);
    const selValid = (s) => s && !s.isCollapsed && String(s).trim().length>0;
    const isInsideNyra = (node) => (node.nodeType===1?node:node.parentElement)?.closest?.('.nyra-modal, .nyra-floating-bar, .nyra-tooltip, .nyra-panel, .nyra-panel-btn');

    function saveStore(list){ try { localStorage.setItem(CFG.storeKey(), JSON.stringify(list)); } catch(_){} }
    function loadStore(){ try { return JSON.parse(localStorage.getItem(CFG.storeKey())||'[]'); } catch(_) { return []; } }

    function nthTextOccurrence(root, text, n){
        // naive text search over text nodes; returns {node, start}
        let idx = 0; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (node)=> node.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT });
        while(walker.nextNode()){
            const node = walker.currentNode; const s = node.nodeValue; const p = s.indexOf(text);
            if(p !== -1){ if(idx===n) return { node, start: p }; idx++; }
        }
        return null;
    }

    function wrapMatch(root, where, length){
        const { node, start } = where; const range = document.createRange();
        range.setStart(node, start); range.setEnd(node, start+length);
        const span = document.createElement('span'); span.className='nyra-highlight'; span.dataset.nyraId = makeId();
        const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); return span;
    }

    function copy(text){ return navigator.clipboard.writeText(text); }
    function flashBtn(el, text){ const a=el.textContent; el.textContent=text; setTimeout(()=> el.textContent=a, 900); }
    function div(cls){ const d=document.createElement('div'); d.className=cls; return d; }
    function btn(label){ const b=document.createElement('button'); b.textContent=label; return b; }
    function button(t){ const b=document.createElement('button'); b.textContent=t; return b; }

    // ========= HIGHLIGHT CORE =========
    function wrapSelection(){
        const sel = getSelection(); if(!selValid(sel)) return null; const range = sel.getRangeAt(0).cloneRange();
        if(isInsideNyra(range.commonAncestorContainer)) return null;
        const span = document.createElement('span'); span.className='nyra-highlight'; span.dataset.nyraId=makeId();
        try { const frag=range.extractContents(); span.appendChild(frag); range.insertNode(span); sel.removeAllRanges(); return span; } catch(e){ console.warn('wrapSelection failed',e); return null; }
    }

    // ========= TOOLTIP (with delayed hide) =========
    function showTooltip(target){
        hideTooltip(target);

        const tip=document.createElement('div'); tip.className='nyra-tooltip';
        const noteEl = document.createElement('div'); noteEl.className='nyra-note'; noteEl.textContent = target.dataset.nyraNote||''; tip.appendChild(noteEl);
        const ta = document.createElement('textarea'); ta.value = target.dataset.nyraNote||''; tip.appendChild(ta);

        const ops = document.createElement('div'); ops.className='nyra-ops';
        const edit = btn('Quick edit'); edit.onclick = ()=>{ ta.style.display = ta.style.display? '':'block'; ta.focus(); };
        const save = btn('Save'); save.onclick = ()=>{ target.dataset.nyraNote = ta.value; noteEl.textContent = ta.value; persistCurrent(); flashBtn(save,'Saved'); };
        const copyN = btn('Copy note'); copyN.onclick = async()=>{ try{ await copy(target.dataset.nyraNote||''); flashBtn(copyN,'Copied!'); }catch{ flashBtn(copyN,'Blocked'); } };
        const copyT = btn('Copy text', true); copyT.classList.add('ghost'); copyT.onclick = async()=>{ try{ await copy(target.textContent); flashBtn(copyT,'Copied!'); }catch{ flashBtn(copyT,'Blocked'); } };
        const clear = btn('Remove note', true); clear.classList.add('ghost'); clear.onclick = ()=>{ target.removeAttribute('data-nyra-note'); noteEl.textContent=''; ta.value=''; persistCurrent(); };
        ops.append(edit, save, copyN, copyT, clear); tip.appendChild(ops);

        target.style.position = target.style.position || 'relative';
        target.appendChild(tip);

        function clearTimer(){ if(target._nyraHideTimer){ clearTimeout(target._nyraHideTimer); target._nyraHideTimer = null; } }
        tip.addEventListener('mouseenter', ()=>{ clearTimer(); });
        tip.addEventListener('mouseleave', ()=>{ target._nyraHideTimer = setTimeout(()=> hideTooltip(target), 1000); });
        clearTimer();
    }

    function hideTooltip(target){
        if(!target) return;
        if(target._nyraHideTimer){ clearTimeout(target._nyraHideTimer); target._nyraHideTimer = null; }
        const tip = target?.querySelector?.('.nyra-tooltip');
        if(tip) tip.remove();
    }

    // ========= MODAL =========
    function askNote(existing=''){
        return new Promise((resolve,reject)=>{
            const back = div('nyra-modal-backdrop'); const modal = div('nyra-modal'); back.appendChild(modal);
            const h = document.createElement('h3'); h.textContent = 'Enter a note for this highlight'; modal.appendChild(h);
            const ta = document.createElement('textarea'); ta.value = existing; modal.appendChild(ta);
            const row = div('row'); const left=div('left');
            const themeT = document.createElement('button'); themeT.textContent='Toggle theme'; themeT.className='ghost'; themeT.onclick=toggleTheme; left.appendChild(themeT);
            row.appendChild(left);
            const ok = document.createElement('button'); ok.textContent='OK'; const cancel=document.createElement('button'); cancel.textContent='Cancel'; cancel.className='ghost';
            row.append(cancel, ok); modal.appendChild(row);
            document.body.appendChild(back); ta.focus();
            ok.onclick=()=>{ cleanup(); resolve(ta.value); };
            cancel.onclick=()=>{ cleanup(); reject('cancel'); };
            back.addEventListener('click',(e)=>{ if(e.target===back){ cleanup(); reject('cancel'); } });
            document.addEventListener('keydown', esc, { once:true });
            function esc(e){ if(e.key==='Escape'){ cleanup(); reject('esc'); } }
            function cleanup(){ back.remove(); }
        });
    }
    async function editNote(span){ const cur=span.dataset.nyraNote||''; try{ const v=await askNote(cur); span.dataset.nyraNote=v; persistCurrent(); }catch{} }

    // ========= BAR =========
    let bar, lastRect;
    function showBar(rect){
        hideBar();
        bar=document.createElement('div'); bar.className='nyra-floating-bar';
        const h=document.createElement('button'); h.textContent='Highlight';
        const n=document.createElement('button'); n.textContent='Highlight + Note'; n.className='ghost';

        // Option B: use mousedown/touchstart so selection doesn't collapse
        const onHighlight = (e)=>{ e.preventDefault(); e.stopPropagation(); const span=wrapSelection(); hideBar(); if(span) attach(span); };
        const onNote = async (e)=>{ e.preventDefault(); e.stopPropagation(); const span=wrapSelection(); hideBar(); if(span){ await editNote(span); attach(span); } };

        h.addEventListener('mousedown', onHighlight);
        n.addEventListener('mousedown', onNote);
        // touch support
        h.addEventListener('touchstart', onHighlight, {passive:false});
        n.addEventListener('touchstart', onNote, {passive:false});

        bar.append(h,n);
        document.body.appendChild(bar);
        positionBar(rect);
    }
    function positionBar(rect){ if(!bar) return; lastRect=rect; const x=rect.left+rect.width/2; const y=Math.max(10, rect.top-CFG.barOffsetY); bar.style.left=`${x}px`; bar.style.top=`${y}px`; bar.style.transform='translateX(-50%)'; }
    function hideBar(){ if(bar){ bar.remove(); bar=null; } }

    // ========= PERSISTENCE =========
    function currentList(){
        return $$('.nyra-highlight').map((el)=>({
            text: el.textContent,
            note: el.dataset.nyraNote||'',
            index: textOccurrenceIndex(document.body, el.textContent, el),
        }));
    }
    function persistCurrent(){ saveStore(currentList()); }

    function textOccurrenceIndex(root, text, el){
        let count=0; const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:(n)=> n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
        while(walker.nextNode()){
            const n=walker.currentNode; const p=n.nodeValue.indexOf(text);
            if(p!==-1){
                const r=document.createRange(); r.setStart(n,p); r.setEnd(n,p+text.length);
                const tmp=document.createElement('span'); try{ const frag=r.cloneContents(); tmp.appendChild(frag); }catch{}
                if(tmp.textContent===text){
                    if(n.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING){ count++; continue; }
                    else break;
                }
            }
        }
        return count;
    }

    function restore(){
        const list=loadStore(); if(!list.length) return;
        for(const item of list){
            const found = nthTextOccurrence(document.body, item.text, item.index);
            if(found){ const span=wrapMatch(document.body, found, item.text.length); if(item.note) span.dataset.nyraNote=item.note; attach(span); }
        }
    }

    // ========= PANEL (manage, export/import) =========
    function ensurePanel(){
        if($('.nyra-panel-btn')) return;
        const btn=document.createElement('div'); btn.className='nyra-panel-btn'; btn.textContent='Nyra Panel';
        const panel=document.createElement('div'); panel.className='nyra-panel'; panel.innerHTML='<h4>Highlights</h4><div class="list"></div><div class="ops"></div>';
        document.body.append(btn, panel);
        btn.onclick=()=>{ panel.style.display = panel.style.display ? '' : 'block'; refreshPanel(); };

        const ops=$('.nyra-panel .ops');
        const exp=button('Export JSON'); exp.onclick=()=>{ const data=JSON.stringify(currentList(), null, 2); download(`nyra-highlights-${Date.now()}.json`, data); };
        const imp=button('Import JSON', true); imp.classList.add('ghost'); imp.onclick=()=> uploadJSON().then(arr=>{ if(Array.isArray(arr)){ saveStore(arr); clearAllLocal(); restore(); refreshPanel(); } });
        const clear=button('Clear All', true); clear.classList.add('ghost'); clear.onclick=()=>{ clearAllLocal(); saveStore([]); refreshPanel(); };
        const theme=button('Toggle theme'); theme.onclick=toggleTheme;
        ops.append(exp, imp, clear, theme);
    }
    function download(name, text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'application/json'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
    function uploadJSON(){ return new Promise((res)=>{ const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=()=>{ const f=i.files[0]; const r=new FileReader(); r.onload=()=>{ try{ res(JSON.parse(r.result)); }catch{ res([]); } }; r.readAsText(f); }; i.click(); }); }
    function clearAllLocal(){ $$('.nyra-highlight').forEach((el)=>{ const parent=el.parentNode; while(el.firstChild) parent.insertBefore(el.firstChild, parent); el.remove(); }); }
    function refreshPanel(){
        const listEl=$('.nyra-panel .list'); if(!listEl) return; listEl.innerHTML=''; const items=currentList();
        items.forEach((it)=>{ const div=document.createElement('div'); div.className='it';
                             const t=document.createElement('div'); t.className='t'; t.textContent = it.text; div.appendChild(t);
                             const ops=document.createElement('div'); ops.className='ops';
                             const go=button('Reveal'); go.onclick=()=>{ const found = nthTextOccurrence(document.body, it.text, it.index); if(found){ const span = wrapMatch(document.body, found, it.text.length); span.dataset.nyraNote = it.note; attach(span); span.scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(()=>{ showTooltip(span); }, 150); persistCurrent(); refreshPanel(); }};
                             const del=button('Delete', true); del.classList.add('ghost'); del.onclick=()=>{ const hs=$$('.nyra-highlight'); const match=hs.find(h=> h.textContent===it.text && (h.dataset.nyraNote||'')===it.note ); if(match){ const p=match.parentNode; while(match.firstChild) p.insertBefore(match.firstChild, p); match.remove(); persistCurrent(); refreshPanel(); } };
                             ops.append(go, del); div.appendChild(ops); listEl.appendChild(div);
                            });
    }

    function toggleTheme(){ document.documentElement.classList.toggle('nyra-theme-light'); }

    // ========= ATTACH EVENTS =========
    function attach(span){
        if(span._nyraHideTimer){ clearTimeout(span._nyraHideTimer); span._nyraHideTimer = null; }

        span.addEventListener('mouseenter', ()=>{
            if(span._nyraHideTimer){ clearTimeout(span._nyraHideTimer); span._nyraHideTimer = null; }
            showTooltip(span);
        });

        span.addEventListener('mouseleave', ()=>{
            span._nyraHideTimer = setTimeout(()=> hideTooltip(span), 1000);
        });

        span.addEventListener('dblclick', ()=>editNote(span));
        persistCurrent();
        ensurePanel();
        refreshPanel();
    }

    // ========= SELECTION LISTENERS =========
    document.addEventListener('mouseup', ()=> setTimeout(()=>{
        const s=getSelection();
        if(selValid(s)){
            const r=s.getRangeAt(0).getBoundingClientRect();
            if(r && r.width && r.height){ showBar(r); return; }
        }
        hideBar();
    }, 10));
    document.addEventListener('scroll', ()=>{ if(bar && lastRect) positionBar(lastRect); }, {passive:true});

    // ========= SHORTCUTS =========
    document.addEventListener('keydown', async (e)=>{
        if(e.altKey && !e.shiftKey && !e.ctrlKey){
            const k=e.key.toLowerCase();
            if(k==='h'){ const span=wrapSelection(); if(span) attach(span); }
            else if(k==='n'){ const span=wrapSelection(); if(span){ await editNote(span); attach(span); } }
            else if(k==='e'){ const el=document.querySelector('.nyra-highlight:hover'); if(el) editNote(el); }
            else if(k==='b'){ toggleTheme(); }
        }
    });

    // ========= INIT =========
    ensurePanel(); restore();
    console.log('%c⭑ Restore + Orionis v4.2.3 — mousedown/touchstart fix (tooltip hide 1s)', 'background:#2563eb;color:#fff;padding:2px 6px;border-radius:6px');
})();
