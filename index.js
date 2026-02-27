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
    
    // DETECT PRIVATE RELAY / VPN
    // Apple Private Relay usually shows up with specific ASNs or "Apple Inc"
    const asName = cf.asOrganization || "";
    const isProxy = asName.includes("Apple") || asName.includes("Google") || asName.includes("Cloudflare") || asName.includes("Proxy");

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
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const result = {
        city, lat, lon, isProxy,
        activeAlert: aData.features?.[0]?.properties?.headline || null,
        temp: Math.round(wData.data.values.temperature),
        feelsLike: Math.round(wData.data.values.temperatureApparent),
        uv: wData.data.values.uvIndex || 0,
        tree: wData.data.values.treeIndex, // Sending raw index for better logic
        humidity: wData.data.values.humidity,
        wind: Math.round(wData.data.values.windSpeed),
        sunrise: sData.results.sunrise,
        sunset: sData.results.sunset,
        isPrecise: !!urlParams.get("lat"),
        updated: formatter.format(new Date())
      };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Offline" }), { status: 500, headers: corsHeaders });
    }
  }
};
