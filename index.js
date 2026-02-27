export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    
    // 1. Determine Location
    const lat = urlParams.get("lat") || cf.latitude || "29.74"; 
    const lon = urlParams.get("lon") || cf.longitude || "-98.64";
    let cityName = urlParams.get("city") || cf.city || "Fair Oaks Ranch";

    // 2. If precise GPS is used, try to get the real city name via Reverse Geocoding
    if (urlParams.get("lat")) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            headers: { "User-Agent": "AcekallasDashboard/1.1" }
        });
        const geoData = await geoRes.json();
        cityName = geoData.address.city || geoData.address.town || geoData.address.village || "Precise Location";
      } catch (e) { cityName = "Precise Location"; }
    }

    try {
      const apiKey = env.TOMORROW_API_KEY; 
      const [weatherRes, sunRes, alertRes] = await Promise.all([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`),
        fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, { headers: { "User-Agent": "Acekallas" } })
      ]);

      const wData = await weatherRes.json();
      const sData = await sunRes.json();
      const aData = await alertRes.json();
      
      const v = wData?.data?.values || {};
      const alerts = aData?.features || [];

      return new Response(JSON.stringify({
        city: cityName,
        lat, lon,
        isProxy: (cf.asOrganization || "").includes("Apple") || (cf.asOrganization || "").includes("Cloudflare"),
        temp: v.temperature !== undefined ? Math.round(v.temperature) : "--",
        feelsLike: v.temperatureApparent !== undefined ? Math.round(v.temperatureApparent) : "--",
        uv: v.uvIndex || 0,
        tree: v.treeIndex || 0,
        humidity: v.humidity || 0,
        wind: v.windSpeed || 0,
        sunrise: sData?.results?.sunrise,
        sunset: sData?.results?.sunset,
        activeAlert: alerts[0]?.properties?.headline || null,
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Timeout" }), { status: 500, headers: corsHeaders });
    }
  }
};
