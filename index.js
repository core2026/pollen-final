export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    const lat = urlParams.get("lat") || request.cf.latitude || "29.74"; 
    const lon = urlParams.get("lon") || request.cf.longitude || "-98.64";
    const city = urlParams.get("city") || request.cf.city || "Local Area";

    const apiKey = env.TOMORROW_API_KEY; 
    const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

    try {
      const apiResponse = await fetch(apiUrl);
      const data = await apiResponse.json();
      const v = data.data.values;

      const getLevel = (val) => {
        const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
        return levels[Math.round(val)] || "None";
      };

      const result = {
        city: city,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex || 0,
        tree: getLevel(v.treeIndex),
        grass: getLevel(v.grassIndex),
        weed: getLevel(v.weedIndex),
        wind: Math.round(v.windSpeed || 0),
        rainProb: v.precipitationProbability || 0,
        humidity: v.humidity || 0,
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
