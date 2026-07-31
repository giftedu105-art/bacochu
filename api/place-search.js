export default async function handler(req, res) {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: '검색어를 입력해 주세요.' });

  const params = new URLSearchParams({
    query,
    x: '129.0756',
    y: '35.1796',
    radius: '20000',
    size: '5'
  });

  const response = await fetch(
    'https://dapi.kakao.com/v2/local/search/keyword.json?' + params,
    { headers: { Authorization: 'KakaoAK ' + process.env.KAKAO_REST_API_KEY } }
  );

  const data = await response.json();
  return res.status(response.ok ? 200 : response.status).json({
    places: (data.documents || []).map(item => ({
      name: item.place_name,
      lat: Number(item.y),
      lon: Number(item.x),
      address: item.road_address_name || item.address_name || ''
    }))
  });
}
