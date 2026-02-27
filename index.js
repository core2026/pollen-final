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
    
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.7408").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.6444").toFixed(4);
    
    // PRIORITY: 1. Manual name from search, 2. Cloudflare City, 3. Default
    let cityName = urlParams.get("name") || cf.city || "San Antonio";

    try {
      const apiKey = env.TOMORROW_API_KEY;
      const [wRes, sRes] = await Promise.allSettled([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      if (wRes.status === "fulfilled") {
        const wJson = await wRes.value.json();
        // If we DON'T have a manual search name, try Tomorrow.io's detailed name
        if (!urlParams.get("name") && wJson.data?.location?.name) {
          cityName = wJson.data.location.name.split(',')[0].trim();
        }
      }

      let weatherData = wRes.status === "fulfilled" ? (await wRes.value.json()).data?.values : {};
      let sunData = sRes.status === "fulfilled" ? (await sRes.value.json()).results : {};

      return new Response(JSON.stringify({
        city: cityName,
        lat: lat,
        lon: lon,
        temp: Math.round(weatherData.temperature || 0),
        feelsLike: Math.round(weatherData.temperatureApparent || 0),
        uv: weatherData.uvIndex || 0,
        humidity: weatherData.humidity || 0,
        wind: Math.round(weatherData.windSpeed || 0),
        sunrise: sunData.sunrise,
        sunset: sunData.sunset,
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Error", city: cityName }), { headers: corsHeaders });
    }
  }
};
