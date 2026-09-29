const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function socialPage(html, song, origin) {
  const title = song ? `${song.title} — ${song.artist} | MQ3 Music` : 'MQ3 Music — Pick a Song. Press Play.';
  const description = song?.description || (song ? `Listen to ${song.title} by ${song.artist} on MQ3 Music.` : 'Discover original music by manny III. Listen with YouTube and Spotify.');
  const url = new URL(song ? '/?song=' + encodeURIComponent(song.id) : '/', origin).href;
  const image = new URL(song?.cover_url || '/assets/logo.png', origin).href;
  const tags = {
    'og:type': song ? 'music.song' : 'website', 'og:site_name': 'MQ3 Music',
    'og:title': title, 'og:description': description, 'og:url': url, 'og:image': image,
    'og:image:alt': song ? song.title + ' cover' : 'MQ3 Music',
  };
  const metadata = Object.entries(tags).map(([key,value]) => `<meta property="${key}" content="${escape(value)}">`).join('\n');
  return html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*>/, () => `<meta name="description" content="${escape(description)}">`)
    .replace('</head>', () => `${metadata}\n<meta name="twitter:card" content="summary_large_image">\n<link rel="canonical" href="${escape(url)}">\n</head>`);
}
