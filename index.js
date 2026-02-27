export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. Check the Cache first
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (response) {
      console.log("Cache Hit!");
      return response;
    }

    // 2. If not in cache, do the work
    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    const lat = urlParams.get("lat") || cf.latitude || "29.7408";
    const lon = urlParams.get("lon") || cf.longitude || "-98.6444";
    const cityName = urlParams.get("name") || cf.city || "San Antonio";
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');

    try {
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      const res = await fetch(apiUrl);
      const j = await res.json();

      if (!j.data) throw new Error("API Limit");

      const v = j.data.values;
      
      // FIX: Adjust time offset to Central Time (UTC-6)
      const centralTime = new Date(new Date().getTime() - (6 * 60 * 60 * 1000));
      const formattedTime = centralTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const data = JSON.stringify({
        city: cityName,
        slug: citySlug,
        lat: parseFloat(lat).toFixed(2),
        lon: parseFloat(lon).toFixed(2),
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex,
        humidity: Math.round(v.humidity),
        wind: Math.round(v.windSpeed),
        updated: formattedTime
      });

      // 3. Create a response and set it to cache for 10 minutes (600 seconds)
      response = new Response(data, { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=600" 
        } 
      });

      // Store in cache while sending it to the user
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;

    } catch (e) {
      return new Response(JSON.stringify({ error: "Service Busy" }), { status: 429, headers: corsHeaders });
    }
  }
};
