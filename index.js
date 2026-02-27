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
    
    // Clean Coordinates
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.74").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.64").toFixed(4);
    let cityName = urlParams.get("city") || cf.city || "San Antonio";

    // 1. Safe Geocoding
    try {
      if (urlParams.get("lat")) {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { "User-Agent": "AcekallasDash/1.4" }
        });
        const geoData = await geoRes.json();
        cityName = geoData.address.city || geoData.address.town || "Local Area";
      }
    } catch (e) { cityName = "Local Area"; }

    // 2. Safe Weather & Sun Fetch
    let weatherData = {};
    let sunData = {};

    try {
      const [wRes, sRes] = await Promise.allSettled([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      if (wRes.status === "fulfilled") {
        const json = await wRes.value.json();
        weatherData = json.data?.values || {};
      }
      if (sRes.status === "fulfilled") {
        const json = await sRes.value.json();
        sunData = json.results || {};
      }
    } catch (e) { console.error("API Fetch Error"); }

    // 3. Guaranteed Response (No more 500 errors)
    const payload = {
      city: cityName,
      lat: lat,
      lon: lon,
      temp: weatherData.temperature !== undefined ? Math.round(weatherData.temperature) : "--",
      feelsLike: weatherData.temperatureApparent !== undefined ? Math.round(weatherData.temperatureApparent) : "--",
      uv: weatherData.uvIndex || 0,
      tree: weatherData.treeIndex || 0,
      humidity: weatherData.humidity || 0,
      wind: weatherData.windSpeed !== undefined ? Math.round(weatherData.windSpeed) : 0,
      sunrise: sunData.sunrise || null,
      sunset: sunData.sunset || null,
      isPrecise: !!urlParams.get("lat"),
      updated: new Date().toLocaleTimeString()
    };

    return new Response(JSON.stringify(payload), { headers: corsHeaders });
  }
};
