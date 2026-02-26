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
    const region = cf.regionCode || ""; // e.g., "TX"

    const apiKey = env.TOMORROW_API_KEY; 
    const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

    try {
      const apiResponse = await fetch(apiUrl);
      const data = await apiResponse.json();
      const v = data.data.values;

      const month = new Date().getMonth();
      const isTexas = region === "TX" || city.includes("Fair Oaks") || city.includes("San Antonio");

      // TEXAS SEASONALITY
      const isOakSeason = isTexas && (month >= 1 && month <= 4); 
      const isCedarSeason = isTexas && (month === 11 || month <= 1);

      const getLevel = (val, type) => {
        const levels = ["None", "Very Low", "Low", "Medium", "High", "Very High"];
        let label = levels[Math.round(val)] || "None";
        if (type === 'tree' && (isOakSeason || isCedarSeason) && val < 3) label = "High (Seasonal)";
        return label;
      };

      const rainChance = v.precipitationProbability || 0;
      const pollenAlert = (v.treeIndex > 3 || isOakSeason || isCedarSeason);
      
      // CAR WASH LOGIC
      let washAdvice = "✨ Great day for a wash!";
      let washColor = "#22c55e"; // Green
      if (rainChance >= 25) {
        washAdvice = "🌧️ Skip it: Rain likely.";
        washColor = "#38bdf8";
      } else if (pollenAlert && isTexas) {
        washAdvice = "⚠️ Skip it: High Pollen Layer.";
        washColor = "#fbbf24"; // Gold/Warning
      }

      const result = {
        city, zip, lat, lon, isTexas,
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex || 0,
        tree: getLevel(v.treeIndex, 'tree'),
        humidity: v.humidity,
        humDesc: v.humidity < 30 ? "🌵 Dry Air" : v.humidity > 65 ? "💧 Muggy" : "Comfortable",
        pollenAlert: pollenAlert,
        washAdvice,
        washColor,
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
