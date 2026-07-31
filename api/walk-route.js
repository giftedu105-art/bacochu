export default async function handler(req, res) {
  try {
    const stops = JSON.parse(String(req.query.stops || '[]'));
    if (stops.length < 2 || stops.length > 7) return res.status(400).json({ error: '장소는 2개에서 7개까지 선택할 수 있어요.' });

    const points = [];
    const legs = [];
    for (let index = 0; index < stops.length - 1; index += 1) {
      const from = stops[index];
      const to = stops[index + 1];
      const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      const route = data.routes?.[0];
      if (!response.ok || !route) throw new Error('도보 길을 찾지 못했습니다.');
      const legPoints = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      points.push(...(index ? legPoints.slice(1) : legPoints));
      legs.push({ from: from.name, to: to.name, distance: route.distance, duration: route.duration });
    }
    const distance = legs.reduce((sum, leg) => sum + leg.distance, 0);
    const duration = legs.reduce((sum, leg) => sum + leg.duration, 0);
    return res.status(200).json({ points, legs, distance, duration });
  } catch (error) {
    return res.status(502).json({ error: error.message || '도보 경로를 찾지 못했습니다.' });
  }
}
