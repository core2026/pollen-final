export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      const lat = "29.74"; 
      const lon = "-98.64";
      const apiKey = env.TOMORROW_API_KEY; 
      // We are explicitly asking for the pollen fields here
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();
        const v = data.data.values;

        // Helper: Converts 0-5 index to text, defaults to "None" if data is missing
        const getLevel = (val) => {
          if (val === undefined || val === null) return "None";
          const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
          return levels[Math.round(val)] || "None";
        };

        const result = {
          actualTemp: Math.round(v.temperature || 0),
          feelsLike: Math.round(v.temperatureApparent || 0),
          uvIndex: v.uvIndex || 0,
          // We use fallback to "0" so getLevel returns "None" instead of "undefined"
          treePollen: getLevel(v.treeIndex || 0),
          grassPollen: getLevel(v.grassIndex || 0),
          weedPollen: getLevel(v.weedIndex || 0),
          carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
          updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
        };

        response = new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      } catch (err) {
        return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
      }
    }
    return response;
  }
};
