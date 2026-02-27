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
    
    const asName = cf.asOrganization || "";
    const isProxy = asName.includes("Apple") || asName.includes("Cloudflare") || asName.includes("Proxy");

    const lat = urlParams.get("lat") || cf.latitude || "29.74"; 
    const lon = urlParams.get("lon") || cf.longitude || "-98.64";
    // If we have precise lat/lon but no city name from the URL, we use a fallback or the CF city
    const city = urlParams.get("city") || cf.city || "Local Area";

    const apiKey = env.TOMORROW_API_KEY; 
    
    try {
      const [weatherRes, sunRes, alertRes] = await Promise.all([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`),
        fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
          headers: { "User-Agent": "AcekallasDashboard/1.1" }
        })
      ]);

      const wData = await weatherRes.json().catch(() => ({}));
      const sData = await sunRes.json().catch(() => ({}));
      const aData = await alertRes.json().catch(() => ({}));
      
      const v = wData?.data?.values || {};
      const alerts = aData?.features || [];

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const result = {
        city: city === "User Location" ? "Precise Location" : city,
        lat, lon, isProxy,
        activeAlert: alerts[0]?.properties?.headline || null,
        temp: v.temperature !== undefined ? Math.round(v.temperature) : "--",
        feelsLike: v.temperatureApparent !== undefined ? Math.round(v.temperatureApparent) : "--",
        uv: v.uvIndex || 0,
        tree: v.treeIndex || 0,
        humidity: v.humidity || 0,
        wind: v.windSpeed !== undefined ? Math.round(v.windSpeed) : 0,
        sunrise: sData?.results?.sunrise || null,
        sunset: sData?.results?.sunset || null,
        isPrecise: !!urlParams.get("lat"),
        updated: formatter.format(new Date())
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Sync Error" }), { status: 500, headers: corsHeaders });
    }
  }
};
