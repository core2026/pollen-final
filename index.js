export default {
  async fetch(request, env, ctx) {
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    let response = await cache.match(cacheKey);

    if (!response) {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

      const lat = "29.74"; 
      const lon = "-98.64";
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          return new Response(JSON.stringify({ error: "API Limit" }), { 
            status: apiResponse.status, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        const v = data.data.values;
        const result = {
          location: "Fair Oaks Ranch",
          actualTemp: Math.round(v.temperature),
          feelsLike: Math.round(v.temperatureApparent),
          uvIndex: v.uvIndex,
          cedar: (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low",
          carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
          clearsUp: "Conditions are stable.",
          updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: '2-digit', minute: '2-digit' })
        };

        response = new Response(JSON.stringify(result), {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=900" 
          }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));

      } catch (err) {
        return new Response(JSON.stringify({ error: "Worker Crash" }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    return response;
  }
};
