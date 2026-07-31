export default async function handler(req, res) {
  try {
    const stops = JSON.parse(String(req.query.stops || '[]'));
    if (stops.length < 2 || stops.length > 7) return res.status(400).json({ error: '장소는 2~7개까지 선택할 수 있습니다.' });
    const params = new URLSearchParams({ start_x: stops[0].lon, start_y: stops[0].lat, end_x: stops.at(-1).lon, end_y: stops.at(-1).lat, route_mode: 'ACCESSIBLE' });
    if (stops.length > 2) { params.set('via_x', stops.slice(1, -1).map(x => x.lon).join(',')); params.set('via_y', stops.slice(1, -1).map(x => x.lat).join(',')); }
    const response = await fetch(`https://dapi.kakao.com/v2/routing/walk?${params}`, { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } });
    const data = await response.json(); const route = data.route || {}; const points = [];
    for (const leg of route.legs || []) for (const step of leg.steps || []) for (const point of step.path?.points || []) points.push([point[1], point[0]]);
    return points.length > 1 ? res.status(200).json({ points, distance: route.properties?.totalDistance || 0, duration: route.properties?.totalTime || 0 }) : res.status(502).json({ error: '도보 경로를 찾지 못했습니다.' });
  } catch { return res.status(400).json({ error: '경로 정보를 확인해 주세요.' }); }
}
