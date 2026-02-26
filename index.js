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
      // Explicitly requesting pollen and weather fields
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json();
        const v = data.data.values;

        const getLevel = (val) => {
          if (val === undefined || val === null || val === 0) return null; // Return null so we can fallback
          const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
          return levels[Math.round(val)];
        };

        // FALLBACK LOGIC: If API pollen is missing, calculate risk based on humidity/wind
        const calculatedCedar = (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low";

        const result = {
          actualTemp: Math.round(v.temperature),
          feelsLike: Math.round(v.temperatureApparent),
          uvIndex: v.uvIndex || 0,
          // Try API first, then fallback to Calculation, then "Low"
          treePollen: getLevel(v.treeIndex) || calculatedCedar, 
          grassPollen: getLevel(v.grassIndex) || "Low",
          weedPollen: getLevel(v.weedIndex) || "Low",
          carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
          updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', timeZone: "America/Chicago" })
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
