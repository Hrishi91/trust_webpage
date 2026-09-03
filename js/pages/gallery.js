import { mountShell } from '../shell.js';
import { listPublished, listPhotos, getPublished } from '../content.js';
import { db, doc, getDoc } from '../firebase.js';
import { pick, t } from '../i18n.js';
import { el } from '../ui.js';

const main = document.getElementById('main');
const s = await mountShell('gallery');
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
      const render = () => main.replaceChildren(el('h1', { text: t('gallery.albums') }),
        albums.length ? el('div', { class: 'grid' }, ...albums.map(a => el('a', { class: 'card', href: `gallery.html?album=${a.id}` },
          a.coverUrl && el('img', { class: 'cover', src: a.coverUrl, alt: pick(a.title), loading: 'lazy' }),
          el('p', { text: `${a.year} · ${pick(a.title)}` })))) : el('p', { class: 'muted', text: t('common.empty') }));
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
          const box = el('div', { class: 'lightbox', onclick: () => box.remove() }, el('img', { src: photos[i].url, alt: pick(photos[i].caption) }));
          document.body.append(box);
        };
        const render = () => main.replaceChildren(
          el('a', { href: 'gallery.html', text: '‹ ' + t('gallery.albums') }),
          el('h1', { text: `${album.year} · ${pick(album.title)}` }),
          el('div', { class: 'grid' }, ...photos.map((p, i) => el('img', { class: 'cover', src: p.url, alt: pick(p.caption), loading: 'lazy', onclick: () => open(i) }))));
        render(); document.addEventListener('langchange', render);
      }
    }
  }
}
