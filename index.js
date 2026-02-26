export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. Detect Location (Agnostic)
    const lat = request.cf.latitude || "30.26"; 
    const lon = request.cf.longitude || "-97.74";
    const city = request.cf.city || "Local Area";

    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
      const apiKey = env.TOMORROW_API_KEY; 
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();
        const v = data.data.values;

        const getLevel = (val) => {
          if (val === undefined || val === null || val === 0) return null;
          const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
          return levels[Math.round(val)];
        };

        // Pollen risk calculation for areas without API pollen data
        const calculatedRisk = (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low";

        const result = {
          city: city,
          temp: Math.round(v.temperature),
          feelsLike: Math.round(v.temperatureApparent),
          uv: v.uvIndex || 0,
          tree: getLevel(v.treeIndex) || calculatedRisk, 
          grass: getLevel(v.grassIndex) || "Low",
          weed: getLevel(v.weedIndex) || "Low",
          wind: Math.round(v.windSpeed || 0),
          windDir: v.windDirection || 0,
          rainProb: v.precipitationProbability || 0,
          humidity: v.humidity || 0,
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
