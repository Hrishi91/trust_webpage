import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { listPublished, listPhotos, getPublished } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { mediaUrl, httpsUrl } from '../media-slots.js';
import { shareRow } from '../share.js';

const main = document.getElementById('main');
const s = await mountShell('gallery', 'nav.gallery');
if (s) {
  const params = new URLSearchParams(location.search);
  const albumId = params.get('album');
  const preview = params.has('preview');
  if (!albumId) {
    let albums, errored = false;
    try {
      albums = (await listPublished('albums')).reverse();   // newest first
    } catch (err) {
      console.error(err);
      errored = true;
    }
    if (errored) {
      main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    } else {
      const render = () => {
        const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
        const featured = albums.filter(a => a.featured && a.coverUrl).slice(0, 4);
        main.replaceChildren(pageHeader({ crumb: t('nav.gallery'), title: t('gallery.albums'), image: mediaUrl(s.media, 'header.gallery') }),
          section(...[
            featured.length ? sectionHead(t('gallery.best')) : null,
            featured.length ? el('div', { class: 'best' }, ...featured.map(a => el('a', { href: `gallery.html?album=${a.id}` }, el('img', { src: httpsUrl(a.coverUrl), alt: pick(a.title), loading: 'lazy' })))) : null,
            sectionHead(t('gallery.albums')),
            albums.length ? el('div', { class: 'albums' }, ...albums.map(a => el('a', { class: 'album', href: `gallery.html?album=${a.id}` },
              // Item 24: an album cover is content — alt = the album title (already shown as text
              // in `.cap` right below, but a screen-reader user tabbing the image itself still needs it).
              httpsUrl(a.coverUrl) ? el('img', { src: httpsUrl(a.coverUrl), alt: pick(a.title), loading: 'lazy' }) : el('div', { class: 'nocover' }),
              el('div', { class: 'cap' }, el('b', { text: num(a.year) }), el('span', { text: pick(a.title) }))))) : el('p', { class: 'muted', text: t('common.empty') }),
            shareRow({ url: location.href, title: t('gallery.albums') }),
          ].filter(Boolean)));
      };
      render(); document.addEventListener('langchange', render);
    }
  } else {
    let album, errored = false;
    try {
      // Phase 7 Task 4 (item 31): see js/pages/transparency.js's own comment on this same
      // pattern — a dynamic import only fetches js/firebase-auth.js when ?preview is actually
      // present, restoring the admin's persisted Auth session for this elevated read without an
      // ordinary gallery.html visit ever requesting it.
      if (preview) await import('../firebase-auth.js');
      album = preview ? (await getDoc(doc(db, 'albums', albumId))).data() : await getPublished('albums', albumId);
    } catch (err) {
      console.error(err);
      errored = true;
    }
    if (errored) {
      main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
    } else if (!album) {
      main.replaceChildren(el('p', { class: 'muted', text: t('common.empty') }));
    } else {
      let photos, photosErrored = false;
      try {
        photos = await listPhotos(albumId);
      } catch (err) {
        console.error(err);
        photosErrored = true;
      }
      if (photosErrored) {
        main.replaceChildren(el('p', { class: 'muted', text: t('common.error') }));
      } else {
        // Item 20: a real <dialog> instead of a plain <div> — showModal() gives a native focus
        // trap and top-layer stacking for free, and Escape closes it via the browser's own
        // 'cancel' event (no keydown listener needed here); we only listen for 'close' (fired
        // after 'cancel' or our own .close() calls) to put focus back on whichever thumbnail
        // button opened it. Built once, outside render(), so repeat langchange re-renders never
        // stack duplicate dialogs onto <body>.
        let idx = 0, lastTrigger = null;
        const altFor = p => pick(p.alt) || pick(p.caption) || pick(album.title);
        const imgEl = el('img', {});
        const closeBtn = el('button', { class: 'lb-btn lb-close', type: 'button', text: '×' });
        const prevBtn = el('button', { class: 'lb-btn lb-prev', type: 'button', text: '‹' });
        const nextBtn = el('button', { class: 'lb-btn lb-next', type: 'button', text: '›' });
        const dialog = el('dialog', { class: 'lightbox' }, closeBtn, prevBtn, imgEl, nextBtn);
        document.body.append(dialog);
        const showPhoto = i => {
          idx = (i + photos.length) % photos.length;
          imgEl.src = httpsUrl(photos[idx].url);
          imgEl.alt = altFor(photos[idx]);
        };
        closeBtn.onclick = () => dialog.close();
        prevBtn.onclick = () => showPhoto(idx - 1);
        nextBtn.onclick = () => showPhoto(idx + 1);
        dialog.addEventListener('close', () => lastTrigger?.focus());
        const open = i => { lastTrigger = document.activeElement; showPhoto(i); dialog.showModal(); };
        const relabel = () => {
          dialog.setAttribute('aria-label', `${pick(album.title)}`);
          closeBtn.setAttribute('aria-label', t('gallery.close'));
          prevBtn.setAttribute('aria-label', t('gallery.prev'));
          nextBtn.setAttribute('aria-label', t('gallery.next'));
          if (!dialog.open) return;
          imgEl.alt = altFor(photos[idx]); // re-run the caption/album-title fallback in the new language
        };
        const render = () => {
          const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
          relabel();
          main.replaceChildren(pageHeader({ crumb: t('gallery.albums'), title: `${num(album.year)} · ${pick(album.title)}`, image: mediaUrl(s.media, 'header.gallery') }),
            // Item 20: each trigger is a real, focusable <button> (was a bare <img onclick>, never
            // reachable by keyboard) wrapping the thumbnail image.
            section(el('a', { href: 'gallery.html', text: '‹ ' + t('gallery.albums') }),
              el('div', { class: 'masonry' }, ...photos.map((p, i) => el('button', { type: 'button', class: 'thumb-btn', onclick: () => open(i) },
                el('img', { class: 'cover', src: httpsUrl(p.url), alt: altFor(p), loading: 'lazy' })))),
              shareRow({ url: location.href, title: `${num(album.year)} · ${pick(album.title)}` })));
        };
        render(); document.addEventListener('langchange', render);
      }
    }
  }
}
