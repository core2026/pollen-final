export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    const lat = urlParams.get("lat") || cf.latitude || "29.74"; 
    const lon = urlParams.get("lon") || cf.longitude || "-98.64";
    const city = urlParams.get("city") || cf.city || "Local Area";
    const zip = urlParams.get("zip") || cf.postalCode || "78015";
    const region = cf.regionCode || "";

    const apiKey = env.TOMORROW_API_KEY; 
    const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;
    const sunUrl = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;

    try {
      // Fetch both Weather and Sun data simultaneously
      const [weatherRes, sunRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(sunUrl)
      ]);

      const wData = await weatherRes.json();
      const sData = await sunRes.json();
      const v = wData.data.values;

      const month = new Date().getMonth();
      const isTexas = region === "TX" || city.includes("Fair Oaks") || city.includes("San Antonio");
      const isOakSeason = isTexas && (month >= 1 && month <= 4); 

      const getLevel = (val, type) => {
        const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
        let label = levels[Math.round(val)] || "None";
        if (type === 'tree' && isOakSeason && val < 2) label = "Elevated (Oak)";
        return label;
      };

      const rainChance = v.precipitationProbability || 0;
      const treeLevel = getLevel(v.treeIndex, 'tree');
      const pollenAlert = isTexas && (v.treeIndex > 2 || treeLevel.includes("Elevated"));

      const result = {
        city, zip, lat, lon, isTexas,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex || 0,
        tree: treeLevel,
        humidity: v.humidity,
        wind: Math.round(v.windSpeed),
        humDesc: v.humidity < 30 ? "🌵 Dry Air" : v.humidity > 65 ? "💧 Muggy" : "Comfortable",
        pollenAlert,
        sunset: sData.results.sunset, // ISO Format from API
        washAdvice: (rainChance >= 25 || pollenAlert) ? "⚠️ Skip Wash" : "✨ Wash OK",
        washColor: (rainChance >= 25 || pollenAlert) ? "#fbbf24" : "#22c55e",
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
