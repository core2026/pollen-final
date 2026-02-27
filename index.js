export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const urlParams = new URL(request.url).searchParams;
      const lat = urlParams.get("lat") || "29.7408";
      const lon = urlParams.get("lon") || "-98.6444";
      const cityName = urlParams.get("name") || "San Antonio";

      if (!env.TOMORROW_API_KEY) {
        return new Response(JSON.stringify({ error: "Missing API Key in Worker Settings" }), { status: 500, headers: corsHeaders });
      }

      // 2026 Optimized API Call
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      
      const response = await fetch(apiUrl, {
        headers: { "Accept": "application/json", "User-Agent": "Cloudflare-Worker" }
      });

      const result = await response.json();

      // If Tomorrow.io returns an error (like 429 for rate limit), catch it here
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: result.message || "Weather Provider Error", 
          code: response.status 
        }), { status: response.status, headers: corsHeaders });
      }

      const val = result.data.values;
      
      return new Response(JSON.stringify({
        city: cityName,
        lat: lat,
        lon: lon,
        temp: Math.round(val.temperature || 0),
        feelsLike: Math.round(val.temperatureApparent || 0),
        uv: val.uvIndex || 0,
        humidity: Math.round(val.humidity || 0),
        wind: Math.round(val.windSpeed || 0),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isPrecise: !!urlParams.get("lat")
      }), { headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Worker Crash: " + err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
