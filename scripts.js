  const allPosts = [
    {
      id:1,
      title:'Morning Pages',
      author:'Sagar P. Barad',
      date:'September 2025',
      excerpt:'Three prompts that help get ink on the page when the day wants to stay quiet.',
      tags:['writing','essay'],
      body:`<p><span class="dropcap">W</span>hen I sit at the window with a mug and a page, the city sounds like a soft machine. The ritual is simple: write for fifteen minutes without judgment. Let sentences arrive like visitors — early and awkward, then familiar.</p><blockquote>Write without the editor.</blockquote><p>Notes: keep the page private, keep the timer honest.</p>`
    },
    {
      id:2,
      title:'On Paper & Pixel',
      author:'Sagar P. Barad',
      date:'August 2025',
      excerpt:'Where tactile marks meet digital light — thoughts on translating sketches into small animations.',
      tags:['sketch','art'],
      body:`<p>There is a tenderness to analog marks. When translated to pixels, preserve the mistakes; they are where the work remembers how it began.</p>`
    },
  ];

  const postsEl = document.getElementById('posts');
  const yearEl = document.getElementById('year'); yearEl.textContent = new Date().getFullYear();

  function makeCard(p){
    const el = document.createElement('div'); el.className='post-card';
    el.innerHTML = `
      <div class="post-meta">${p.date} • ${p.author}</div>
      <h3 class="post-title">${p.title}</h3>
      <p class="post-excerpt">${p.excerpt}</p>
      <a href="#" class="read-more">Read →</a>
    `;
    el.querySelector('.read-more').addEventListener('click',e=>{e.preventDefault();openModal(p)});
    return el;
  }

  function renderHome(){
    postsEl.innerHTML='';
    // add cards with a small staggered appear animation
    allPosts.forEach((p, i) => {
      const card = makeCard(p);
      postsEl.appendChild(card);
      // staggered reveal
      setTimeout(()=> card.classList.add('appear'), 60 * i);
    });
  }

  function renderFiltered(tag, elId){
    const el=document.getElementById(elId);
    if(!el) return;
    el.innerHTML='';
    const filtered = allPosts.filter(p=>p.tags && p.tags.includes(tag));
    filtered.forEach((p,i)=> {
      const c = makeCard(p);
      el.appendChild(c);
      setTimeout(()=> c.classList.add('appear'), 60 * i);
    })
  }

  function openModal(post){
    const overlay = document.getElementById('overlay');
    const modalWrapInner = document.getElementById('modalContent');
    modalWrapInner.innerHTML = `<div class="modal">
      <button id="closeModal" aria-label="Close">✕</button>
      <h1 style="font-family:'Playfair Display',serif;margin-top:0">${post.title}</h1>
      <div style="color:var(--muted);margin-bottom:8px">${post.author} • ${post.date}</div>
      ${post.body}
    </div>`;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');

    // focus close button
    const close = document.getElementById('closeModal');
    close && close.focus();
    close && close.addEventListener('click', closeModalOnce);

    // trap Escape key
    function esc(e){ if(e.key === 'Escape') closeModalOnce(); }
    document.addEventListener('keydown', esc);

    // cleanup
    function closeModalOnce(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      document.removeEventListener('keydown', esc);
      close && close.removeEventListener('click', closeModalOnce);
      // small delay before clearing content (let animation finish)
      setTimeout(()=> { modalWrapInner.innerHTML = ''; }, 380);
    }
  }

  // overlay click to close (already inlined)
  document.getElementById('overlay').addEventListener('click',e=>{
    if(e.target.id==='overlay'){
      document.getElementById('overlay').classList.remove('open');
      document.getElementById('overlay').setAttribute('aria-hidden','true');
      setTimeout(()=> document.getElementById('modalContent').innerHTML = '', 380);
    }
  });

  // simple nav
  document.querySelectorAll('nav a[data-page]').forEach(a=>a.addEventListener('click',e=>{
    const page = a.getAttribute('data-page');
    if(page==='compose'){alert('Composer is available in the full editor build. For now use the "Write" flow we added earlier.');return}
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(n=>n.classList.remove('active'));
    a.classList.add('active');
    const target = document.getElementById(page);
    if(target) target.classList.add('active');
    if(page==='essays') renderFiltered('essay','essaysList');
    if(page==='sketches') renderFiltered('sketch','sketchesList');
  }))

document.addEventListener('DOMContentLoaded', () => {

  // UI elements
  const openBtn = document.querySelector('a.cta[data-page="compose"]');
  const overlay = document.getElementById('writeOverlay');
  const closeBtn = document.getElementById('closeWrite');
  const tabs = document.querySelectorAll('.tab');
  const textMode = document.getElementById('textMode');
  const drawMode = document.getElementById('drawMode');
  const oneLiner = document.getElementById('oneLiner');
  const downloadTextBtn = document.getElementById('downloadText');
  const downloadCanvasBtn = document.getElementById('downloadCanvas');
  const clearCanvasBtn = document.getElementById('clearCanvas');

  // canvas variables (initialized later)
  let canvas = null;
  let ctx = null;
  let drawingInit = false;

  // open/close overlay
  function openOverlay(){
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    // focus text by default
    if(oneLiner) oneLiner.focus();
    // if draw tab visible at open, init drawing
    if(drawMode && window.getComputedStyle(drawMode).display !== 'none'){
      ensureInitDrawing();
    }
  }
  function closeOverlay(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
  }

  openBtn && openBtn.addEventListener('click', (e)=> { e.preventDefault(); openOverlay(); });
  closeBtn && closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if(e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeOverlay(); });

  // Tabs: when switching to draw, initialize canvas then (deferred sizing)
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');

      if(t.dataset.mode === 'text'){
        textMode.style.display = 'block';
        drawMode.style.display = 'none';
        if(oneLiner) oneLiner.focus();
      } else {
        textMode.style.display = 'none';
        drawMode.style.display = 'block';
        // init drawing only once and size AFTER canvas is visible
        ensureInitDrawing();
      }
    });
  });

  // ---------- Text download (kept the same but defensive) ----------
  if(downloadTextBtn && oneLiner){
    downloadTextBtn.addEventListener('click', function(){
      const text = oneLiner.value.trim();
      if(!text) { alert('Write something first.'); return; }
      const canvasOut = document.createElement('canvas');
      canvasOut.width = 1200; canvasOut.height = 480;
      const ctxOut = canvasOut.getContext('2d');
      ctxOut.fillStyle = '#fffdf7';
      ctxOut.fillRect(0,0,canvasOut.width,canvasOut.height);
      ctxOut.fillStyle = '#111';
      ctxOut.font = "48px serif";
      ctxOut.textAlign = 'center';
      ctxOut.textBaseline = 'middle';
      // wrap text roughly
      const words = text.split(' ');
      let line = '', lines = [], maxW = canvasOut.width - 160;
      for(let w of words){
        const test = line ? (line + ' ' + w) : w;
        if(ctxOut.measureText(test).width > maxW){ lines.push(line); line = w; } else line = test;
      }
      lines.push(line);
      const startY = canvasOut.height/2 - (lines.length-1)*28;
      lines.forEach((ln,i)=> ctxOut.fillText(ln, canvasOut.width/2, startY + i*56));
      const link = document.createElement('a'); link.download='fragment.png'; link.href = canvasOut.toDataURL('image/png'); link.click();
    });
  }

  // ---------------- Drawing init (deferred & robust) ----------------
  function ensureInitDrawing(){
    if(drawingInit) return;
    // get canvas reference now (after drawMode visible)
    canvas = document.getElementById('drawCanvas');
    if(!canvas){
      console.warn('drawCanvas not found when initializing drawing.');
      return;
    }

    // sizing helper - only call when canvas is visible
    function fitCanvasToDisplay(){
      const rect = canvas.getBoundingClientRect();
      // if width/height are 0, the canvas is hidden -> skip sizing
      if(rect.width === 0 || rect.height === 0) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      // use transform so pointer coords can be in CSS pixels
      const cctx = canvas.getContext('2d', { alpha: true });
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // optional: clear to transparent
      // cctx.clearRect(0,0,canvas.width,canvas.height);
    }

    // initial sizing (canvas should now be visible)
    fitCanvasToDisplay();
    // also attempt to size again on open/resize (in case modal shows later)
    window.addEventListener('resize', fitCanvasToDisplay);
    // when overlay opens, resize once more (helps if opened after load)
    const observer = new MutationObserver(()=> fitCanvasToDisplay());
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });

    ctx = canvas.getContext('2d', { alpha: true });
    // drawing config
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // drawing state and helpers
    let drawing = false;
    let points = [];
    const undoStack = [];
    const maxUndo = 12;
    let brush = { color: '#111', size: 3 };

    function getPointerPos(e){
      const rect = canvas.getBoundingClientRect();
      // We set transformed context for DPR, but getPointer should return CSS pixels
      const x = (e.clientX - rect.left);
      const y = (e.clientY - rect.top);
      return { x, y, pressure: e.pressure || 0.5 };
    }

    function drawSmoothLine(pointsArr, options){
      if(pointsArr.length < 2) return;
      ctx.save();
      ctx.strokeStyle = options.color;
      ctx.lineWidth = options.size;
      ctx.beginPath();
      ctx.moveTo(pointsArr[0].x, pointsArr[0].y);
      for(let i = 1; i < pointsArr.length - 1; i++){
        const midX = (pointsArr[i].x + pointsArr[i+1].x) / 2;
        const midY = (pointsArr[i].y + pointsArr[i+1].y) / 2;
        ctx.quadraticCurveTo(pointsArr[i].x, pointsArr[i].y, midX, midY);
      }
      ctx.lineTo(pointsArr[pointsArr.length -1].x, pointsArr[pointsArr.length -1].y);
      ctx.stroke();
      ctx.restore();
    }

    // pointer event handlers (use pointer events - covers mouse/touch/pen)
    function pointerDown(e){
      // only left button or pen/touch
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      drawing = true;
      points = [];
      const p = getPointerPos(e);
      points.push(p);
      // push snapshot for undo (imageData)
      try{
        if(undoStack.length >= maxUndo) undoStack.shift();
        undoStack.push(ctx.getImageData(0,0,canvas.width,canvas.height));
      }catch(er){ /* some browsers may throw on cross-origin, ignore */ }
      // capture pointer to ensure we receive moves outside canvas
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }

    function pointerMove(e){
      if(!drawing) return;
      const p = getPointerPos(e);
      points.push(p);
      // draw incremental smoothing - here we draw last few points for speed
      const recent = points.slice(-8);
      drawSmoothLine(recent, brush);
    }

    function pointerUp(e){
      if(!drawing) return;
      drawing = false;
      // final stroke
      drawSmoothLine(points, brush);
      points = [];
      try{ canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); }catch(_) {}
    }

    // attach pointer listeners
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    // also release on global up just in case
    window.addEventListener('pointerup', pointerUp);

    // UI hooks for clear/undo/download (defensive checks)
    clearCanvasBtn && clearCanvasBtn.addEventListener('click', ()=> {
      ctx.clearRect(0,0,canvas.width,canvas.height);
    });

    // download current canvas
    if(downloadCanvasBtn){
      downloadCanvasBtn.addEventListener('click', () => {
        // ensure we export at native resolution for crispness
        // create temp canvas at display size * DPR
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const out = document.createElement('canvas');
        out.width = Math.round(rect.width * dpr);
        out.height = Math.round(rect.height * dpr);
        const octx = out.getContext('2d');
        // if the original canvas was set to scaled size, draw it directly (it already contains high-res pixels)
        octx.drawImage(canvas, 0, 0, out.width, out.height);
        const a = document.createElement('a');
        a.download = 'scratch.png';
        a.href = out.toDataURL('image/png');
        a.click();
      });
    }

    // expose simple global tools if you want to change brush
    window.setBrushColor = (c) => { brush.color = c; };
    window.setBrushSize = (s) => { brush.size = s; };
    window.undoDraw = () => {
      if(!undoStack.length) return;
      const img = undoStack.pop();
      ctx.putImageData(img, 0, 0);
    };

    drawingInit = true;
  } // end ensureInitDrawing

}); // DOMContentLoaded end

// Improved one-liner export with paper texture, vignette, stamp and handwriting font
document.getElementById('downloadText').addEventListener('click', async function(){
  const text = (document.getElementById('oneLiner').value || '').trim();
  if(!text) return alert('Write a fragment first.');

  // ensure font is loaded (so canvas renders correctly)
  try {
    await Promise.all([
      document.fonts.load("16px 'Patrick Hand'"),
      document.fonts.load("12px 'Playfair Display'")
    ]);
  } catch(e){
    // proceed anyway if font load fails
    console.warn('font load issue', e);
  }

  // output size and DPR for crispness
  const DPR = Math.max(2, window.devicePixelRatio || 2);
  const outW = 1400 * DPR;
  const outH = 700 * DPR;
  const canv = document.createElement('canvas');
  canv.width = outW; canv.height = outH;
  const ctx = canv.getContext('2d');

  // helper: draw subtle paper background (gradient + noise)
  function drawPaper(){
    // base
    const grad = ctx.createLinearGradient(0,0,outW, outH);
    grad.addColorStop(0, '#fffdf9');
    grad.addColorStop(1, '#fff7ea');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,outW,outH);

    // faint vignette
    const vignette = ctx.createRadialGradient(outW/2, outH/2, Math.min(outW,outH)/4, outW/2, outH/2, Math.max(outW,outH)/1.2);
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,outW,outH);

    // subtle noise texture
    const noiseCount = Math.floor(outW * outH / 6000);
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#000';
    for(let i=0;i<noiseCount;i++){
      const x = Math.random()*outW, y = Math.random()*outH;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawPaper();

  // nice margins and text box
  const marginX = Math.round(140 * DPR);
  const maxTextW = outW - marginX * 2;
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';

  // dynamic font sizing: choose a base size and reduce if lines overflow
  let fontSize = Math.floor(72 * DPR); // starting point for big short lines
  ctx.font = `${fontSize}px 'Patrick Hand', cursive`;

  // wrap into lines that fit maxTextW
  function wrapText(str, maxW, tryFontSize){
    ctx.font = `${tryFontSize}px 'Patrick Hand', cursive`;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for(const w of words){
      const test = line ? line + ' ' + w : w;
      if(ctx.measureText(test).width > maxW){
        if(line) lines.push(line);
        line = w;
      } else line = test;
    }
    if(line) lines.push(line);
    return lines;
  }

  let lines = wrapText(text, maxTextW, fontSize);

  // lower font size if too many lines
  while(lines.length > 4 && fontSize > 32 * DPR){
    fontSize = Math.floor(fontSize * 0.86);
    lines = wrapText(text, maxTextW, fontSize);
  }

  // compute vertical placement (centered block with slight upward bias)
  const lineHeight = Math.floor(fontSize * 1.15);
  const blockH = lines.length * lineHeight;
  let startY = outH/2 - blockH/2 - Math.round(12 * DPR);

  // draw soft shadow (slightly offset stroke) for ink depth
  ctx.save();
  ctx.lineWidth = Math.max(1, Math.floor(fontSize * 0.12));
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.textAlign = 'center';
  for(let i=0;i<lines.length;i++){
    const y = startY + i * lineHeight;
    // subtle jitter per line for human touch
    const jitter = (Math.random()-0.5) * (2 * DPR);
    ctx.font = `${fontSize}px 'Patrick Hand', cursive`;
    // stroke for slight ink weight
    ctx.strokeText(lines[i], outW/2 + jitter + 2*DPR, y + 3*DPR);
  }
  ctx.restore();

  // main ink
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  for(let i=0;i<lines.length;i++){
    const y = startY + i * lineHeight;
    const jitter = (Math.random()-0.5) * (1.2 * DPR);
    ctx.font = `${fontSize}px 'Patrick Hand', cursive`;
    ctx.fillText(lines[i], outW/2 + jitter, y);
  }

  // small tasteful stamp (bottom-right)
  const stamp = new Date().toLocaleDateString();
  ctx.font = `${18 * DPR}px 'Playfair Display', serif`;
  ctx.fillStyle = 'rgba(30,30,30,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText(stamp, outW - 36 * DPR, outH - 28 * DPR);

  // thin decorative border (paper edge)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = Math.max(2, DPR);
  ctx.strokeRect( Math.round(12*DPR), Math.round(12*DPR), outW - Math.round(24*DPR), outH - Math.round(24*DPR) );

  // optional watermark: tiny site label bottom-left
  ctx.font = `${14 * DPR}px 'Playfair Display', serif`;
  ctx.fillStyle = 'rgba(30,30,30,0.35)';
  ctx.textAlign = 'left';
  ctx.fillText('Studio Notes', 36 * DPR, outH - 22 * DPR);

  // convert to dataURL and trigger download
  const dataUrl = canv.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'fragment.png';
  link.href = dataUrl;
  link.click();
});


  
  // initial render
  renderHome();

  // simple gallery: extract first images from posts (if present)
  (function renderGallery(){
    const g = document.getElementById('sideGallery'); if(!g) return;
    g.innerHTML='';
    allPosts.forEach((p, i) => {
      const tmp=document.createElement('div'); tmp.innerHTML=p.body;
      const img=tmp.querySelector('img');
      if(img){
        const iEl = document.createElement('img');
        iEl.src = img.src;
        // reveal with slight delay per image
        g.appendChild(iEl);
        setTimeout(()=> iEl.classList.add('visible'), 80 * i);
      }
    })
  })();


