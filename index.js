export default {
  async fetch(request, env, ctx) {
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    // 1. Check if we have a valid "saved" version in the cache
    let response = await cache.match(cacheKey);

    if (!response) {
      console.log("Cache miss - Fetching new data from Tomorrow.io");
      
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

      const lat = "29.74"; 
      const lon = "-98.64";
      const apiKey = env.TOMORROW_API_KEY; 
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          // If the API is currently rate limited, we return the error but DON'T cache it
          return new Response(JSON.stringify({ 
            error: "API Limit Active", 
            message: data.message 
          }), { status: apiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const v = data.data.values;
        const result = {
          location: "Fair Oaks Ranch",
          temp: Math.round(v.temperatureApparent),
          uvIndex: v.uvIndex,
          cedar: (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low",
          carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
          clearsUp: "Stable conditions.",
          updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
        };

        // 2. Create the response and tell Cloudflare to save it for 900 seconds (15 mins)
        response = new Response(JSON.stringify(result), {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=900" 
          }
        });

        // Use ctx.waitUntil so the worker finishes saving to cache even after sending the response
        ctx.waitUntil(cache.put(cacheKey, response.clone()));

      } catch (err) {
        return new Response(JSON.stringify({ error: "Worker Crash", message: err.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    } else {
      console.log("Cache hit - Serving saved data");
    }

    return response;
  }
};
