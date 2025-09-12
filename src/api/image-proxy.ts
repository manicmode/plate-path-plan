export default async function handler(req: Request) {
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl || !/^https:\/\/images\.openfoodfacts\.org\//.test(imageUrl)) {
    return new Response('Invalid image URL', { status: 400 });
  }
  try {
    const r = await fetch(imageUrl, { headers: { 'User-Agent': 'voyage-app/1.0' } });
    if (!r.ok) return new Response('Image not found', { status: 404 });
    const type = r.headers.get('content-type') || 'image/jpeg';
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return new Response('Failed to fetch image', { status: 500 });
  }
}