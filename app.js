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
  mint: { bg: '#dce9e0', photo: '#c6d9cc', ink: '#587267', top: 'good day!', bottom: 'good day!', pad: 10 }
};

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
function update() {
  grid.innerHTML = '';
  strip.innerHTML = '';
  photos.forEach((photo, index) => {
    const slot = document.createElement('div'); slot.className = 'photo-slot';
    const num = document.createElement('span'); num.className = 'slot-number'; num.textContent = `0${index + 1}`; slot.append(num);
    if (photo) {
      const thumb = document.createElement('img'); thumb.src = photo.src; thumb.alt = `선택한 사진 ${index + 1}`; slot.append(thumb);
      const remove = document.createElement('button'); remove.className = 'remove-photo'; remove.textContent = '×'; remove.setAttribute('aria-label', `${index + 1}번 사진 삭제`); remove.onclick = () => { photos[index] = null; update(); }; slot.append(remove);
    } else { const plus = document.createElement('span'); plus.className = 'slot-plus'; plus.textContent = '+'; slot.append(plus); }
    grid.append(slot);
    const framePhoto = document.createElement('div'); framePhoto.className = `strip-photo${photo ? '' : ' empty-photo'}`;
    if (photo) { const img = document.createElement('img'); img.src = photo.src; img.alt = ''; img.style.objectFit = photo.fit || 'cover'; img.style.objectPosition = `${photo.x ?? 50}% ${photo.y ?? 50}%`; img.style.transform = `scale(${photo.zoom || 1})`; img.style.transformOrigin = `${photo.x ?? 50}% ${photo.y ?? 50}%`; framePhoto.append(img); framePhoto.addEventListener('contextmenu', e => { e.preventDefault(); openCropMenu(index, e.clientX, e.clientY); }); framePhoto.title = '우클릭하여 사진 구도 조정'; }
    else { const number = document.createElement('span'); number.textContent = `0${index + 1}`; framePhoto.append(number); if (index === 0) { const hint = document.createElement('b'); hint.innerHTML = '사진을<br>추가해 주세요'; framePhoto.append(hint); } }
    strip.append(framePhoto);
  });
  const cap = document.createElement('div'); cap.className = 'strip-caption'; cap.textContent = document.querySelector('#caption').value.trim() || frames[currentFrame].bottom; strip.append(cap);
  strip.style.backgroundColor = customColor || frames[currentFrame].bg;
  const layer = document.createElement('div'); layer.className = 'sticker-layer'; layer.id = 'sticker-layer'; strip.append(layer);
  stickers.forEach((sticker, index) => {
    const item = document.createElement('span'); item.className = 'placed-sticker'; item.textContent = sticker.char; item.style.left = `${sticker.x}%`; item.style.top = `${sticker.y}%`; item.style.fontSize = `${sticker.size}px`; item.dataset.index = index;
    const remove = document.createElement('button'); remove.className = 'remove-sticker'; remove.textContent = '×'; remove.title = '스티커 삭제'; remove.addEventListener('click', e => { e.stopPropagation(); stickers.splice(index, 1); update(); }); item.append(remove); layer.append(item);
    item.addEventListener('pointerdown', e => { if (e.target === remove) return; e.preventDefault(); item.setPointerCapture(e.pointerId); const rect = layer.getBoundingClientRect(); const move = ev => { sticker.x = Math.max(0, Math.min(88, (ev.clientX - rect.left) / rect.width * 100)); sticker.y = Math.max(0, Math.min(94, (ev.clientY - rect.top) / rect.height * 100)); item.style.left = `${sticker.x}%`; item.style.top = `${sticker.y}%`; }; const end = () => { item.removeEventListener('pointermove', move); item.removeEventListener('pointerup', end); }; item.addEventListener('pointermove', move); item.addEventListener('pointerup', end); });
  });
  document.querySelector('#photo-status').textContent = `사진 ${photos.filter(Boolean).length} / 4`;
  document.querySelector('#camera-count').textContent = `${photos.filter(Boolean).length} / 4`;
  const ready = photos.every(Boolean); document.querySelector('#download-btn').disabled = !ready;
  document.querySelector('.download-note').textContent = ready ? '마음에 들면 이미지로 저장해 보세요.' : '사진 네 장을 채우면 저장할 수 있어요.';
  strip.className = `photo-strip ${currentFrame}`;
  strip.style.backgroundColor = customColor || frames[currentFrame].bg;
}
function openCropMenu(index, clientX, clientY) {
  editingPhotoIndex = index;
  const photo = photos[index];
  cropMenu.innerHTML = `<div class="crop-menu-head"><strong>${String(index + 1).padStart(2, '0')}번 사진 구도</strong><button class="crop-menu-close" type="button" aria-label="닫기">×</button></div><div class="crop-modes"><button class="crop-mode ${photo.fit !== 'contain' ? 'active' : ''}" data-fit="cover" type="button">칸에 꽉 채우기</button><button class="crop-mode ${photo.fit === 'contain' ? 'active' : ''}" data-fit="contain" type="button">사진 전체 보기</button></div><label class="crop-control"><span>확대 <b>${Math.round((photo.zoom || 1) * 100)}%</b></span><input data-prop="zoom" type="range" min="100" max="220" value="${Math.round((photo.zoom || 1) * 100)}"></label><label class="crop-control"><span>가로 위치 <b>${Math.round(photo.x ?? 50)}%</b></span><input data-prop="x" type="range" min="0" max="100" value="${Math.round(photo.x ?? 50)}"></label><label class="crop-control"><span>세로 위치 <b>${Math.round(photo.y ?? 50)}%</b></span><input data-prop="y" type="range" min="0" max="100" value="${Math.round(photo.y ?? 50)}"></label><p class="crop-menu-hint">구도 변경은 이 사진 한 장에만 적용돼요.</p>`;
  cropMenu.classList.remove('hidden');
  cropMenu.style.left = `${Math.min(clientX, window.innerWidth - 265)}px`;
  cropMenu.style.top = `${Math.min(clientY, window.innerHeight - 260)}px`;
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
document.querySelector('#download-btn').addEventListener('click', async () => {
  const cfg = frames[currentFrame], w = 720, h = 2160, pad = cfg.pad * 4, gap = 20, capH = 104;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.fillStyle = customColor || cfg.bg; ctx.fillRect(0, 0, w, h);
  const photoH = (h - pad * 2 - gap * 3 - capH) / 4;
  for (let i = 0; i < 4; i++) {
    const img = new Image(); img.src = photos[i].src; await img.decode(); const x = pad, y = pad + i * (photoH + gap), boxW = w - pad * 2;
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
  ctx.fillStyle = cfg.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const caption = document.querySelector('#caption').value.trim() || cfg.bottom; ctx.font = `${currentFrame === 'film' ? '600 34px' : 'italic 42px'} Georgia, serif`; ctx.fillText(caption, w / 2, h - pad - capH / 2, w - 50);
  const scaleX = w / strip.getBoundingClientRect().width, scaleY = h / strip.getBoundingClientRect().height;
  stickers.forEach(sticker => { ctx.font = `${sticker.size * scaleX}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(sticker.char, sticker.x / 100 * w, sticker.y / 100 * h); });
  const link = document.createElement('a'); link.download = 'four-cut.png'; link.href = c.toDataURL('image/png'); link.click();
});
update();
