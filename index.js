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
    
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.7408").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.6444").toFixed(4);
    let cityName = urlParams.get("name") || cf.city || "San Antonio";

    try {
      // Use the Timeline endpoint for better stability in 2026
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      
      const response = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
      const wJson = await response.json();

      // Deep data extraction with safety fallbacks
      const data = wJson.data?.values || {};
      
      const payload = {
        city: cityName,
        lat, lon,
        temp: data.temperature != null ? Math.round(data.temperature) : 0,
        feelsLike: data.temperatureApparent != null ? Math.round(data.temperatureApparent) : 0,
        uv: data.uvIndex || 0,
        humidity: Math.round(data.humidity || 0),
        wind: Math.round(data.windSpeed || 0),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isPrecise: !!urlParams.get("lat")
      };

      return new Response(JSON.stringify(payload), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Timeout", temp: "--" }), { headers: corsHeaders });
    }
  }
};
