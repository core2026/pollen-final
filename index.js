export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    
    // 1. COORDINATE LOGIC: Force 4 decimal places to prevent API rejection (Laptop Fix)
    const rawLat = urlParams.get("lat") || cf.latitude || "29.7400";
    const rawLon = urlParams.get("lon") || cf.longitude || "-98.6400";
    const lat = parseFloat(rawLat).toFixed(4);
    const lon = parseFloat(rawLon).toFixed(4);
    
    // 2. CITY LOGIC: Start with Cloudflare's guess, override if GPS is provided
    let cityName = urlParams.get("city") || cf.city || "Local Area";

    // 3. REVERSE GEOCODING: If the user provides GPS, get the actual neighborhood/city name
    if (urlParams.get("lat")) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { "User-Agent": "AcekallasWeatherDashboard/1.3" }
        });
        const geoData = await geoRes.json();
        cityName = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || "Precise Location";
      } catch (e) {
        cityName = "Precise Location";
      }
    }

    try {
      const apiKey = env.TOMORROW_API_KEY; 
      
      // 4. DATA FETCHING: Weather and Solar data in parallel
      const [weatherRes, sunRes] = await Promise.all([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      const wData = await weatherRes.json();
      const sData = await sunRes.json();
      
      // Safety check for Tomorrow.io structure
      const v = wData?.data?.values || {};

      // 5. CONSTRUCT PAYLOAD: Ensure no values are 'undefined' to prevent UI blanks
      const responsePayload = {
        city: cityName,
        lat: lat,
        lon: lon,
        temp: (v.temperature !== undefined) ? Math.round(v.temperature) : "--",
        feelsLike: (v.temperatureApparent !== undefined) ? Math.round(v.temperatureApparent) : "--",
        uv: v.uvIndex || 0,
        tree: v.treeIndex || 0,
        humidity: v.humidity || 0,
        wind: v.windSpeed !== undefined ? Math.round(v.windSpeed) : 0,
        sunrise: sData?.results?.sunrise || null,
        sunset: sData?.results?.sunset || null,
        // Detect VPN/Private Relay
        isProxy: (cf.asOrganization || "").includes("Apple") || (cf.asOrganization || "").includes("Cloudflare") || (cf.asOrganization || "").includes("Proxy"),
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };

      return new Response(JSON.stringify(responsePayload), {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      });

    } catch (err) {
      // Return a clean error object instead of crashing
      return new Response(JSON.stringify({ 
        error: "Data Fetching Error",
        details: err.message,
        city: cityName,
        temp: "--"
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
