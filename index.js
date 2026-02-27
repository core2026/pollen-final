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
    
    // Clean coordinates
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.7408").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.6444").toFixed(4);
    let cityName = urlParams.get("name") || cf.city || "San Antonio";

    try {
      // Adding a timestamp to the URL to bypass any internal Cloudflare caching
      const cacheBust = Date.now();
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}&_cb=${cacheBust}`;
      
      const response = await fetch(apiUrl);
      const wJson = await response.json();

      if (!wJson.data) {
        throw new Error(wJson.message || "API limit or key error");
      }

      const values = wJson.data.values;
      
      return new Response(JSON.stringify({
        city: cityName,
        lat, lon,
        temp: Math.round(values.temperature),
        feelsLike: Math.round(values.temperatureApparent),
        uv: values.uvIndex || 0,
        humidity: Math.round(values.humidity),
        wind: Math.round(values.windSpeed),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isPrecise: !!urlParams.get("lat")
      }), { headers: corsHeaders });

    } catch (err) {
      // Return a 500 so the dashboard knows to retry
      return new Response(JSON.stringify({ error: err.message, status: "fail" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
