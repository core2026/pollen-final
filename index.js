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

    const apiKey = env.TOMORROW_API_KEY; 
    
    try {
      const [weatherRes, sunRes, alertRes] = await Promise.all([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`),
        fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
          headers: { "User-Agent": "AcekallasDashboard/1.0" }
        })
      ]);

      const wData = await weatherRes.json();
      const sData = await sunRes.json();
      const aData = await alertRes.json();
      const v = wData.data.values;

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const localUpdate = formatter.format(new Date());

      const month = new Date().getMonth();
      const isTexas = cf.regionCode === "TX" || city.includes("Fair Oaks");
      const isOakSeason = isTexas && (month >= 1 && month <= 4); 

      const getLevel = (val, type) => {
        const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
        let label = levels[Math.round(val)] || "None";
        if (type === 'tree' && isOakSeason && val < 2) label = "Elevated (Oak)";
        return label;
      };

      const treeLevel = getLevel(v.treeIndex, 'tree');
      const rainChance = v.precipitationProbability || 0;
      
      const result = {
        city, lat, lon, isTexas,
        activeAlert: aData.features?.[0]?.properties?.headline || null,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex || 0,
        tree: treeLevel,
        humidity: v.humidity,
        wind: Math.round(v.windSpeed),
        humDesc: v.humidity < 30 ? "🌵 Dry Air" : v.humidity > 65 ? "💧 Muggy" : "Comfortable",
        pollenAlert: isTexas && (v.treeIndex > 2 || treeLevel.includes("Elevated")),
        sunset: sData.results.sunset, 
        washAdvice: (rainChance >= 25 || (isTexas && v.treeIndex > 2)) ? "⚠️ Skip Wash" : "✨ Wash OK",
        washColor: (rainChance >= 25 || (isTexas && v.treeIndex > 2)) ? "#fbbf24" : "#22c55e",
        isPrecise: !!urlParams.get("lat"),
        updated: localUpdate
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
