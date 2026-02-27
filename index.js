export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    
    const lat = urlParams.get("lat") || cf.latitude || "29.7408";
    const lon = urlParams.get("lon") || cf.longitude || "-98.6444";
    const cityName = urlParams.get("name") || cf.city || "San Antonio";

    try {
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      const res = await fetch(apiUrl);
      const j = await res.json();

      if (!j.data) throw new Error("API Limit");

      const v = j.data.values;
      return new Response(JSON.stringify({
        city: cityName,
        lat: lat,
        lon: lon,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex,
        humidity: Math.round(v.humidity),
        wind: Math.round(v.windSpeed),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }), { headers: corsHeaders });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Rate Limited", temp: "--" }), { status: 429, headers: corsHeaders });
    }
  }
};
