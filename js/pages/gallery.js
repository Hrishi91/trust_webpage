import { mountShell, pageHeader, section, sectionHead } from '../shell.js';
import { listPublished, listPhotos, getPublished } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { pick, t, getLang } from '../i18n.js';
import { el, bnDigits } from '../ui.js';
import { mediaUrl, httpsUrl } from '../media-slots.js';

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
              httpsUrl(a.coverUrl) ? el('img', { src: httpsUrl(a.coverUrl), alt: '', loading: 'lazy' }) : el('div', { class: 'nocover' }),
              el('div', { class: 'cap' }, el('b', { text: num(a.year) }), el('span', { text: pick(a.title) }))))) : el('p', { class: 'muted', text: t('common.empty') }),
          ].filter(Boolean)));
      };
      render(); document.addEventListener('langchange', render);
    }
  } else {
    let album, errored = false;
    try {
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
        const open = i => {
          const box = el('div', { class: 'lightbox', onclick: () => box.remove() }, el('img', { src: httpsUrl(photos[i].url), alt: pick(photos[i].caption) }));
          document.body.append(box);
        };
        const render = () => {
          const num = n => getLang() === 'bn' ? bnDigits(n) : String(n);
          main.replaceChildren(pageHeader({ crumb: t('gallery.albums'), title: `${num(album.year)} · ${pick(album.title)}`, image: mediaUrl(s.media, 'header.gallery') }),
            section(el('a', { href: 'gallery.html', text: '‹ ' + t('gallery.albums') }),
              el('div', { class: 'masonry' }, ...photos.map((p, i) => el('img', { class: 'cover', src: httpsUrl(p.url), alt: pick(p.caption), loading: 'lazy', onclick: () => open(i) })))));
        };
        render(); document.addEventListener('langchange', render);
      }
    }
  }
}
