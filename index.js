export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Using the Cache API to protect your API quota
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      const lat = "29.74"; 
      const lon = "-98.64";
      const apiKey = env.TOMORROW_API_KEY; 
      
      // Explicitly requesting pollen and weather fields
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();

        if (!apiResponse.ok) throw new Error("API Limit or Error");

        const v = data.data.values;

        // Helper to convert 0-5 index to text
        const getLevel = (val) => {
          if (val === undefined || val === null) return "None";
          const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
          return levels[val] || "Low";
        };

        const result = {
          location: "Fair Oaks Ranch",
          actualTemp: Math.round(v.temperature),
          feelsLike: Math.round(v.temperatureApparent),
          uvIndex: v.uvIndex || 0,
          treePollen: getLevel(v.treeIndex),
          grassPollen: getLevel(v.grassIndex),
          weedPollen: getLevel(v.weedIndex),
          carWash: v.precipitationProbability > 20 ? "❌ Wait (Rain)" : "🧼 Good to Go",
          updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now()
        };

        response = new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));

      } catch (err) {
        return new Response(JSON.stringify({ error: "API Offline" }), { status: 500, headers: corsHeaders });
      }
    }
    return response;
  }
};
