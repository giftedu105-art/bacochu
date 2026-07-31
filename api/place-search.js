export default async function handler(req, res) {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: '장소 이름을 입력해 주세요.' });
  const x = Number(req.query.x);
  const y = Number(req.query.y);
  const params = new URLSearchParams({
    query,
    x: Number.isFinite(x) ? String(x) : '129.0756',
    y: Number.isFinite(y) ? String(y) : '35.1796',
    radius: '7000',
    size: '5'
  });
  const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } });
  const data = await response.json();
  const places = (data.documents || []).map(item => ({ name: item.place_name, lat: Number(item.y), lon: Number(item.x), address: item.road_address_name || item.address_name || '', category: item.category_name || '' }));
  places.sort((a, b) => ((a.lat - y) ** 2 + (a.lon - x) ** 2) - ((b.lat - y) ** 2 + (b.lon - x) ** 2));
  return res.status(response.ok ? 200 : response.status).json({ places });
}
