const photos = [null, null, null, null];
let currentFrame = 'classic';
let cameraStream = null;
let customColor = null;
let stickers = [];
const stickerChoices = ['♡', '☆', '✿', '☀', '☁', '🌷', '🍒', '🧸', '🎀', '✨', '😎', '🫧', '♥', '✦', '☻', '🐰'];
const input = document.querySelector('#photo-input');
const grid = document.querySelector('#photo-grid');
const strip = document.querySelector('#photo-strip');
const video = document.querySelector('#camera-video');
const toast = document.querySelector('#toast');
const cropMenu = document.querySelector('#crop-menu');
let editingPhotoIndex = -1;
const frames = {
  classic: { bg: '#ffffff', photo: '#f0ede8', ink: '#38342e', top: 'four.cut', bottom: 'four.cut', pad: 10 },
  pink: { bg: '#f4dedd', photo: '#edd1d0', ink: '#995f65', top: '♡ with love ♡', bottom: '♡ with love ♡', pad: 10 },
  film: { bg: '#353532', photo: '#696862', ink: '#f5f0e4', top: 'MEMORIES', bottom: 'MEMORIES', pad: 12 },
  mint: { bg: '#dce9e0', photo: '#c6d9cc', ink: '#587267', top: 'good day!', bottom: 'good day!', pad: 10 },
  'coral-grid': { bg: '#ef9a91', photo: '#fff9f4', ink: '#fffaf6', top: 'HAPPY DAY', bottom: '오늘의 네 컷', pad: 16, layout: 'grid', decoration: [['✦', 88, 8, 19], ['🐻', 86, 76, 34], ['♡', 4, 83, 19]] },
  lilac: { bg: '#b78fbd', photo: '#fffaff', ink: '#fffaff', top: '별빛 산책', bottom: '별빛 산책', pad: 11, decoration: [['✦', 7, 8, 17], ['☾', 80, 34, 20], ['🐰', 74, 83, 34], ['✧', 12, 65, 15]] },
  doodle: { bg: '#ffe85a', photo: '#fffefa', ink: '#51452f', top: '우리들의 낙서', bottom: '우리들의 낙서', pad: 12, decoration: [['✿', 3, 18, 18], ['♡', 87, 28, 18], ['★', 5, 69, 18], ['🐣', 78, 85, 31]] },
  flower: { bg: '#91c5df', photo: '#fffdfb', ink: '#fffdfb', top: 'little flower', bottom: 'little flower', pad: 12, decoration: [['🌼', 4, 24, 18], ['✿', 87, 50, 19], ['🧸', 72, 84, 32], ['✦', 7, 8, 14]] }
};

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
function update() {
  grid.innerHTML = '';
  strip.innerHTML = '';
  const frame = frames[currentFrame];
  strip.className = `photo-strip ${currentFrame}${frame.layout === 'grid' ? ' layout-grid' : ''}`;
  photos.forEach((photo, index) => {
    const slot = document.createElement('div'); slot.className = 'photo-slot';
    const num = document.createElement('span'); num.className = 'slot-number'; num.textContent = `0${index + 1}`; slot.append(num);
    if (photo) {
      const thumb = document.createElement('img'); thumb.src = photo.src; thumb.alt = `선택한 사진 ${index + 1}`; slot.append(thumb);
      const remove = document.createElement('button'); remove.className = 'remove-photo'; remove.textContent = '×'; remove.setAttribute('aria-label', `${index + 1}번 사진 삭제`); remove.onclick = () => { photos[index] = null; update(); }; slot.append(remove);
    } else { const plus = document.createElement('span'); plus.className = 'slot-plus'; plus.textContent = '+'; slot.append(plus); }
    grid.append(slot);
    const framePhoto = document.createElement('div'); framePhoto.className = `strip-photo${photo ? '' : ' empty-photo'}`; framePhoto.dataset.photoIndex = index;
    if (photo) {
      const img = document.createElement('img'); img.src = photo.src; img.alt = ''; img.style.objectFit = photo.fit || 'cover'; img.style.objectPosition = `${photo.x ?? 50}% ${photo.y ?? 50}%`; img.style.transform = `scale(${photo.zoom || 1})`; img.style.transformOrigin = `${photo.x ?? 50}% ${photo.y ?? 50}%`; img.draggable = false; framePhoto.append(img);
      framePhoto.addEventListener('contextmenu', e => { e.preventDefault(); openCropMenu(index, e.clientX, e.clientY); });
      framePhoto.title = '드래그하여 위치 조정 · 탭하거나 우클릭하여 확대/축소';
      framePhoto.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); framePhoto.setPointerCapture(e.pointerId);
        const bounds = framePhoto.getBoundingClientRect(), startX = e.clientX, startY = e.clientY, initialX = photo.x ?? 50, initialY = photo.y ?? 50;
        let moved = false;
        const move = ev => {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 12) moved = true;
          photo.x = Math.max(0, Math.min(100, initialX - (ev.clientX - startX) / bounds.width * 100));
          photo.y = Math.max(0, Math.min(100, initialY - (ev.clientY - startY) / bounds.height * 100));
          img.style.objectPosition = `${photo.x}% ${photo.y}%`; img.style.transformOrigin = `${photo.x}% ${photo.y}%`;
        };
        const end = ev => { framePhoto.removeEventListener('pointermove', move); framePhoto.removeEventListener('pointerup', end); framePhoto.removeEventListener('pointercancel', end); if (!moved && ev.type === 'pointerup') openCropMenu(index, ev.clientX, ev.clientY); };
        framePhoto.addEventListener('pointermove', move); framePhoto.addEventListener('pointerup', end); framePhoto.addEventListener('pointercancel', end);
      });
    }
    else { const number = document.createElement('span'); number.textContent = `0${index + 1}`; framePhoto.append(number); if (index === 0) { const hint = document.createElement('b'); hint.innerHTML = '사진을<br>추가해 주세요'; framePhoto.append(hint); } }
    strip.append(framePhoto);
  });
  const cap = document.createElement('div'); cap.className = 'strip-caption'; cap.textContent = document.querySelector('#caption').value.trim() || frame.bottom; strip.append(cap);
  if (frame.decoration) {
    const art = document.createElement('div'); art.className = 'frame-art';
    frame.decoration.forEach(([char, x, y, size]) => { const item = document.createElement('span'); item.textContent = char; item.style.left = `${x}%`; item.style.top = `${y}%`; item.style.fontSize = `${size}px`; art.append(item); });
    strip.append(art);
  }
  strip.style.backgroundColor = customColor || frames[currentFrame].bg;
  const layer = document.createElement('div'); layer.className = 'sticker-layer'; layer.id = 'sticker-layer'; strip.append(layer);
  stickers.forEach((sticker, index) => {
    const item = document.createElement('span'); item.className = 'placed-sticker'; item.textContent = sticker.char; item.style.left = `${sticker.x}%`; item.style.top = `${sticker.y}%`; item.style.fontSize = `${sticker.size}px`; item.dataset.index = index;
    const remove = document.createElement('button'); remove.className = 'remove-sticker'; remove.textContent = '×'; remove.title = '스티커 삭제'; remove.addEventListener('click', e => { e.stopPropagation(); stickers.splice(index, 1); update(); }); item.append(remove); layer.append(item);
    item.addEventListener('pointerdown', e => { if (e.target === remove) return; e.preventDefault(); item.setPointerCapture(e.pointerId); const rect = layer.getBoundingClientRect(); const move = ev => { sticker.x = Math.max(0, Math.min(88, (ev.clientX - rect.left) / rect.width * 100)); sticker.y = Math.max(0, Math.min(94, (ev.clientY - rect.top) / rect.height * 100)); item.style.left = `${sticker.x}%`; item.style.top = `${sticker.y}%`; }; const end = () => { item.removeEventListener('pointermove', move); item.removeEventListener('pointerup', end); }; item.addEventListener('pointermove', move); item.addEventListener('pointerup', end); });
  });
  document.querySelector('#photo-status').textContent = `사진 ${photos.filter(Boolean).length} / 4`;
  document.querySelector('#camera-count').textContent = `${photos.filter(Boolean).length} / 4`;
  const ready = photos.every(Boolean); document.querySelector('#download-btn').disabled = !ready; document.querySelector('#copy-btn').disabled = !ready;
  document.querySelector('.download-note').textContent = ready ? '저장하거나 복사해 다른 곳에 붙여넣을 수 있어요.' : '사진 네 장을 채우면 저장하거나 복사할 수 있어요.';
  strip.style.backgroundColor = customColor || frames[currentFrame].bg;
}
function openCropMenu(index, clientX, clientY) {
  editingPhotoIndex = index;
  const photo = photos[index];
  cropMenu.innerHTML = `<div class="crop-menu-head"><strong>${String(index + 1).padStart(2, '0')}번 사진 구도</strong><button class="crop-menu-close" type="button" aria-label="닫기">×</button></div><div class="crop-modes"><button class="crop-mode ${photo.fit !== 'contain' ? 'active' : ''}" data-fit="cover" type="button">칸에 꽉 채우기</button><button class="crop-mode ${photo.fit === 'contain' ? 'active' : ''}" data-fit="contain" type="button">사진 전체 보기</button></div><label class="crop-control"><span>확대 <b>${Math.round((photo.zoom || 1) * 100)}%</b></span><input data-prop="zoom" type="range" min="100" max="220" value="${Math.round((photo.zoom || 1) * 100)}"></label><label class="crop-control"><span>가로 위치 <b>${Math.round(photo.x ?? 50)}%</b></span><input data-prop="x" type="range" min="0" max="100" value="${Math.round(photo.x ?? 50)}"></label><label class="crop-control"><span>세로 위치 <b>${Math.round(photo.y ?? 50)}%</b></span><input data-prop="y" type="range" min="0" max="100" value="${Math.round(photo.y ?? 50)}"></label><p class="crop-menu-hint">구도 변경은 이 사진 한 장에만 적용돼요.</p>`;
  cropMenu.classList.remove('hidden');
  const mobileControls = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  cropMenu.classList.toggle('mobile-sheet', mobileControls);
  if (mobileControls) {
    cropMenu.style.left = '';
    cropMenu.style.top = '';
  } else {
    cropMenu.style.left = `${Math.max(8, Math.min(clientX, window.innerWidth - 265))}px`;
    cropMenu.style.top = `${Math.max(8, Math.min(clientY, window.innerHeight - 260))}px`;
  }
  cropMenu.querySelector('.crop-menu-close').addEventListener('click', closeCropMenu);
  cropMenu.querySelectorAll('.crop-mode').forEach(button => button.addEventListener('click', () => { photo.fit = button.dataset.fit; update(); openCropMenu(index, parseInt(cropMenu.style.left), parseInt(cropMenu.style.top)); }));
  cropMenu.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    const value = Number(input.value);
    photo[input.dataset.prop] = input.dataset.prop === 'zoom' ? value / 100 : value;
    input.previousElementSibling.querySelector('b').textContent = `${value}${input.dataset.prop === 'zoom' ? '%' : '%'}`;
    update();
  }));
}
function closeCropMenu() { cropMenu.classList.add('hidden'); editingPhotoIndex = -1; }
document.addEventListener('pointerdown', e => { if (!cropMenu.classList.contains('hidden') && !cropMenu.contains(e.target)) closeCropMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCropMenu(); });
function loadFiles(files) {
  const candidates = [...files].filter(f => f.type.startsWith('image/'));
  let next = 0;
  for (let i = 0; i < photos.length && next < candidates.length; i++) if (!photos[i]) { photos[i] = { src: URL.createObjectURL(candidates[next++]), file: candidates[next - 1], fit: 'cover', zoom: 1, x: 50, y: 50 }; }
  if (next < candidates.length) showToast('사진은 네 장까지 넣을 수 있어요.');
  if (!candidates.length) showToast('이미지 파일을 선택해 주세요.');
  update(); input.value = '';
}
input.addEventListener('change', e => loadFiles(e.target.files));
const dropzone = document.querySelector('#dropzone');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('dragover'); loadFiles(e.dataTransfer.files); });
document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn); });
  document.querySelector('#upload-pane').classList.toggle('hidden', btn.dataset.mode !== 'upload'); document.querySelector('#camera-pane').classList.toggle('hidden', btn.dataset.mode !== 'camera');
}));
document.querySelectorAll('.frame-option').forEach(btn => btn.addEventListener('click', () => chooseFrame(btn.dataset.frame)));
function chooseFrame(frame) { currentFrame = frame; document.querySelectorAll('.frame-option').forEach(b => b.classList.toggle('selected', b.dataset.frame === frame)); update(); }
document.querySelector('#shuffle-btn').addEventListener('click', () => { const options = Object.keys(frames).filter(f => f !== currentFrame); chooseFrame(options[Math.floor(Math.random() * options.length)]); });
document.querySelector('#caption').addEventListener('input', update);
const stickerPicker = document.querySelector('#sticker-picker');
stickerChoices.forEach(char => { const button = document.createElement('button'); button.className = 'sticker-choice'; button.type = 'button'; button.textContent = char; button.title = `${char} 스티커 추가`; button.addEventListener('click', () => { if (stickers.length >= 12) return showToast('스티커는 최대 12개까지 붙일 수 있어요.'); stickers.push({ char, x: 50 + (Math.random() * 20 - 10), y: 43 + (Math.random() * 24 - 12), size: 27 }); update(); }); stickerPicker.append(button); });
document.querySelector('#clear-stickers').addEventListener('click', () => { stickers = []; update(); });
const colorInput = document.querySelector('#frame-color');
colorInput.addEventListener('input', () => { customColor = colorInput.value; document.querySelector('#color-value').textContent = customColor.toUpperCase(); update(); });
document.querySelector('#reset-color').addEventListener('click', () => { customColor = null; colorInput.value = frames[currentFrame].bg; document.querySelector('#color-value').textContent = colorInput.value.toUpperCase(); update(); });
document.querySelectorAll('.frame-option').forEach(btn => btn.addEventListener('click', () => { colorInput.value = customColor || frames[btn.dataset.frame].bg; document.querySelector('#color-value').textContent = colorInput.value.toUpperCase(); }));
document.querySelector('#start-camera').addEventListener('click', async () => {
  try { cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); video.srcObject = cameraStream; video.style.display = 'block'; document.querySelector('#camera-placeholder').style.display = 'none'; document.querySelector('#capture-btn').disabled = false; }
  catch { showToast('카메라를 사용할 수 없어요. 권한과 보안 연결을 확인해 주세요.'); }
});
document.querySelector('#stop-camera').addEventListener('click', stopCamera);
function stopCamera() { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; video.srcObject = null; video.style.display = 'none'; document.querySelector('#camera-placeholder').style.display = 'flex'; document.querySelector('#capture-btn').disabled = true; }
document.querySelector('#capture-btn').addEventListener('click', () => {
  const index = photos.findIndex(p => !p); if (index < 0) { showToast('네 장을 모두 촬영했어요. 사진을 삭제하면 다시 찍을 수 있어요.'); return; }
  const canvas = document.createElement('canvas'); canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480; const ctx = canvas.getContext('2d'); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  photos[index] = { src: canvas.toDataURL('image/jpeg', .92), file: null, fit: 'cover', zoom: 1, x: 50, y: 50 }; update(); if (photos.every(Boolean)) showToast('네 컷 완성! 프레임을 골라 저장해 보세요.');
});
async function createStripBlob() {
  const cfg = frames[currentFrame], isGrid = cfg.layout === 'grid';
  const w = isGrid ? 1440 : 720, h = isGrid ? 1440 : 2160, pad = isGrid ? 72 : cfg.pad * 4, gap = isGrid ? 28 : 20, capH = isGrid ? 136 : 104;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.fillStyle = customColor || cfg.bg; ctx.fillRect(0, 0, w, h);
  const photoW = isGrid ? (w - pad * 2 - gap) / 2 : w - pad * 2;
  const photoH = isGrid ? (h - pad * 2 - gap - capH) / 2 : (h - pad * 2 - gap * 3 - capH) / 4;
  for (let i = 0; i < 4; i++) {
    const photo = photos[i];
    if (!photo) throw new Error('Missing photo');
    const img = new Image(); img.src = photo.src; await img.decode();
    const x = isGrid ? pad + (i % 2) * (photoW + gap) : pad;
    const y = isGrid ? pad + Math.floor(i / 2) * (photoH + gap) : pad + i * (photoH + gap);
    const boxW = photoW;
    ctx.fillStyle = cfg.photo; ctx.fillRect(x, y, boxW, photoH);
    const zoom = photo.zoom || 1, posX = (photo.x ?? 50) / 100, posY = (photo.y ?? 50) / 100;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, boxW, photoH); ctx.clip();
    if (photo.fit === 'contain') {
      const scale = Math.min(boxW / img.width, photoH / img.height) * zoom, drawW = img.width * scale, drawH = img.height * scale;
      ctx.drawImage(img, x + (boxW - drawW) * posX, y + (photoH - drawH) * posY, drawW, drawH);
    } else {
      const scale = Math.max(boxW / img.width, photoH / img.height) * zoom, sw = boxW / scale, sh = photoH / scale, sx = (img.width - sw) * posX, sy = (img.height - sh) * posY;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, boxW, photoH);
    }
    ctx.restore();
  }
  ctx.fillStyle = cfg.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const caption = document.querySelector('#caption').value.trim() || cfg.bottom; ctx.font = `${isGrid ? '600 46px' : currentFrame === 'film' ? '600 34px' : 'italic 42px'} ${isGrid || cfg.decoration ? 'sans-serif' : 'Georgia, serif'}`; ctx.fillText(caption, w / 2, h - pad - capH / 2, w - 50);
  const scaleX = w / strip.getBoundingClientRect().width;
  if (cfg.decoration) cfg.decoration.forEach(([char, x, y, size]) => { ctx.font = `${size * scaleX}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(char, x / 100 * w, y / 100 * h); });
  stickers.forEach(sticker => { ctx.font = `${sticker.size * scaleX}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(sticker.char, sticker.x / 100 * w, sticker.y / 100 * h); });
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/png'));
}
function downloadBlob(blob) {
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.download = 'four-cut.png'; link.href = url; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function runOutputAction(action) {
  const buttons = [document.querySelector('#download-btn'), document.querySelector('#copy-btn')];
  buttons.forEach(button => button.disabled = true);
  try {
    const blob = await createStripBlob();
    if (action === 'copy' && navigator.clipboard?.write && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('이미지를 복사했어요. 원하는 곳에 붙여넣으세요.');
      } catch (error) {
        console.warn('Clipboard copy unavailable; downloading instead:', error);
        downloadBlob(blob);
        showToast('클립보드 복사를 사용할 수 없어 PNG 파일로 저장했어요.');
      }
    } else {
      downloadBlob(blob);
      showToast(action === 'copy' ? '이 브라우저에서는 이미지 복사를 지원하지 않아 파일로 저장했어요.' : '인생네컷 이미지를 저장했어요.');
    }
  } catch (error) {
    console.error('Photo strip output failed:', error);
    showToast('이미지를 만들지 못했어요. 사진을 다시 불러온 뒤 시도해 주세요.');
  } finally { buttons.forEach(button => button.disabled = !photos.every(Boolean)); }
}
document.querySelector('#download-btn').addEventListener('click', () => runOutputAction('download'));
document.querySelector('#copy-btn').addEventListener('click', () => runOutputAction('copy'));
update();
