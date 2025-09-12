export default async function handler(req: Request) {
  const url = new URL(req.url);
  const barcode = url.pathname.split('/').pop();

  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    return Response.json({ success: false, error: 'Invalid barcode format' }, {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { 'User-Agent': 'voyage-app/1.0' } }
    );
    if (!res.ok) throw new Error(`OFF ${res.status}`);
    const data = await res.json();
    const p = data?.product;
    if (!p) {
      return Response.json({ success: false, error: 'Product not found' }, {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const n = p.nutriments || {};
    const kjToKcal = (v?: number) => (v ? Math.round(v / 4.184) : 0);

    const nutrition = {
      per100g: {
        calories: n['energy-kcal_100g'] ?? (n['energy-kj_100g'] ? kjToKcal(n['energy-kj_100g']) : 0),
        protein: n['proteins_100g'] ?? 0,
        carbs: n['carbohydrates_100g'] ?? 0,
        fat: n['fat_100g'] ?? 0,
        fiber: n['fiber_100g'] ?? 0,
        sugar: n['sugars_100g'] ?? 0,
        sodium: n['sodium_100g'] ?? 0,
      },
      perServing: p.serving_quantity && p.serving_quantity > 0 ? {
        calories: n['energy-kcal_serving'] ?? (n['energy-kj_serving'] ? kjToKcal(n['energy-kj_serving']) : 0),
        protein: n['proteins_serving'] ?? 0,
        carbs: n['carbohydrates_serving'] ?? 0,
        fat: n['fat_serving'] ?? 0,
        fiber: n['fiber_serving'] ?? 0,
        sugar: n['sugars_serving'] ?? 0,
        sodium: n['sodium_serving'] ?? 0,
        servingG: Number(p.serving_quantity) || null
      } : null
    };

    const images = [
      p.image_front_url,
      p.image_url,
      p.selected_images?.front?.display?.en,
      p.selected_images?.front?.display?.en_US,
      p.image_front_small_url,
    ].filter(Boolean);

    return Response.json({
      success: true,
      name: p.product_name || '',
      brand: p.brands || '',
      nutrition,
      images,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    console.error('[OFF_PROXY] Error', e);
    return Response.json({ success: false, error: 'Failed to fetch product data' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}