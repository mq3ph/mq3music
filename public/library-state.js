export function readIds(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter(x => typeof x === 'string'))].slice(0, 500) : [];
  } catch { return []; }
}

export function writeIds(storage, key, ids) {
  try { storage.setItem(key, JSON.stringify(ids)); return true; } catch { return false; }
}

export function filterSongs(songs, {term = '', category = 'All', collection = 'all', favorites = [], recent = []} = {}) {
  const query = term.trim().toLocaleLowerCase();
  return songs.filter(song =>
    (category === 'All' || song.category === category) &&
    (collection !== 'favorites' || favorites.includes(song.id)) &&
    (collection !== 'recent' || recent.includes(song.id)) &&
    `${song.title} ${song.artist}`.toLocaleLowerCase().includes(query)
  ).sort(collection === 'recent'
    ? (a, b) => recent.indexOf(a.id) - recent.indexOf(b.id)
    : (a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base', numeric: true}));
}

export function recentIds(ids, id) { return [id, ...ids.filter(x => x !== id)].slice(0, 50); }
