export default {
  async fetch(request, env, ctx) {
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
      const v = data.data.values;

      const getLevel = (val) => {
        if (val === undefined || val === null || val === 0) return null;
        const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
        return levels[Math.round(val)];
      };

      const calculatedCedar = (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low";

      const result = {
        version: "2.0", // IF YOU DON'T SEE THIS, THE WRONG WORKER IS ACTIVE
        actualTemp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uvIndex: v.uvIndex || 0,
        treePollen: getLevel(v.treeIndex) || calculatedCedar, 
        grassPollen: getLevel(v.grassIndex) || "Low",
        weedPollen: getLevel(v.weedIndex) || "Low",
        carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
        updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
