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

      // 1. Calculate Comfort Level (Dew Point approximation)
      const dewPoint = v.temperature - ((100 - v.humidity) / 5);
      let comfort = "Pleasant";
      if (dewPoint > 65) comfort = "Sticky";
      if (dewPoint > 72) comfort = "Miserable";

      const result = {
        city: city,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex || 0,
        tree: v.treeIndex || 0,
        wind: Math.round(v.windSpeed || 0),
        humidity: v.humidity || 0,
        comfort: comfort,
        rainProb: v.precipitationProbability || 0,
        updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
