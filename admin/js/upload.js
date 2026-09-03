import { ref, uploadBytesResumable, getDownloadURL } from '../../js/firebase.js';
import { pick } from '../../js/i18n.js';
import { el, toast } from '../../js/ui.js';
import { fitDims } from './resize.js';

export async function resizeImage(file, { max = 1600, quality = 0.82 } = {}) {
  // from-image: honour the file's EXIF Orientation tag so a portrait phone photo draws upright
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = fitDims(bmp.width, bmp.height, max);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const toBlob = type => new Promise(res => canvas.toBlob(res, type, quality));
  return (await toBlob('image/webp')) ?? (await toBlob('image/jpeg'));
}

export function uploadPublic(ctx, blob, path, onProgress) {
  const full = path.startsWith('public/') ? path : `public/${path}`;
  const task = uploadBytesResumable(ref(ctx.storage, full), blob, { contentType: blob.type, cacheControl: 'public,max-age=31536000,immutable' });
  return new Promise((resolve, reject) => {
    task.on('state_changed', s => onProgress?.(s.bytesTransferred / s.totalBytes), reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)));
  });
}

const fname = (folder, blob) => `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;

export function imageField(ctx, label, currentUrl = '', { folder, max = 1600 } = {}) {
  let url = currentUrl;
  const img = el('img', { class: 'thumb', src: url || '', alt: '', hidden: !url });
  const bar = el('progress', { max: 1, value: 0, hidden: true });
  // no `capture`: admins pick from gallery; camera is still offered by the OS picker
  const input = el('input', { type: 'file', accept: 'image/*' });
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    try {
      bar.hidden = false;
      const blob = await resizeImage(file, { max });
      url = await uploadPublic(ctx, blob, fname(folder, blob), p => { bar.value = p; });
      img.src = url; img.hidden = false; bar.hidden = true;
    } catch (e) { console.error(e); toast('Upload failed', 'err'); bar.hidden = true; }
    finally { input.value = ''; }
  };
  // set(): lets a caller sync this widget's displayed state (e.g. a photo list that auto-picks
  // its first upload as the album cover) without going through the widget's own file input.
  const set = newUrl => { url = newUrl; img.src = url || ''; img.hidden = !url; };
  return { node: el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'row' }, img, input), bar), read: () => url, set };
}

export function multiImageField(ctx, label, { folder, max = 1600, onEach }) {
  const bar = el('progress', { max: 1, value: 0, hidden: true });
  const status = el('span', { class: 'muted' });
  const input = el('input', { type: 'file', accept: 'image/*', multiple: true });
  input.onchange = async () => {
    const files = [...input.files]; let n = 0;
    bar.hidden = false;
    for (const file of files) {
      try {
        const blob = await resizeImage(file, { max });
        const url = await uploadPublic(ctx, blob, fname(folder, blob), p => { bar.value = p; });
        await onEach(url); n++; status.textContent = `${n}/${files.length}`;
      } catch (e) { console.error(e); toast(`Failed: ${file.name}`, 'err'); }
    }
    bar.hidden = true; input.value = '';
  };
  return el('label', {}, el('span', { text: pick(label) }), el('div', { class: 'row' }, input, status), bar);
}
