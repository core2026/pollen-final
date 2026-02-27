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
    
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.74").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.64").toFixed(4);
    
    // 1. Determine City Name Priority
    let cityName = urlParams.get("name") || cf.city || "San Antonio";

    try {
      const apiKey = env.TOMORROW_API_KEY;
      const [wRes, sRes] = await Promise.allSettled([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      let weatherData = {};
      let sunData = {};

      // 2. Safely Extract Weather Data
      if (wRes.status === "fulfilled") {
        const wJson = await wRes.value.json();
        weatherData = wJson.data?.values || {};
        
        // If we didn't search by ZIP, use Tomorrow.io's name if available
        if (!urlParams.get("name") && wJson.data?.location?.name) {
          cityName = wJson.data.location.name.split(',')[0].trim();
        }
      }

      // 3. Safely Extract Sun Data
      if (sRes.status === "fulfilled") {
        const sJson = await sRes.value.json();
        sunData = sJson.results || {};
      }

      // 4. Build Final Payload (with "Safety Fallbacks")
      const payload = {
        city: cityName,
        lat: lat,
        lon: lon,
        temp: weatherData.temperature !== undefined ? Math.round(weatherData.temperature) : "--",
        feelsLike: weatherData.temperatureApparent !== undefined ? Math.round(weatherData.temperatureApparent) : "--",
        uv: weatherData.uvIndex || 0,
        humidity: weatherData.humidity || 0,
        wind: weatherData.windSpeed !== undefined ? Math.round(weatherData.windSpeed) : 0,
        sunrise: sunData.sunrise || null,
        sunset: sunData.sunset || null,
        isPrecise: !!urlParams.get("lat"),
        updated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(payload), { headers: corsHeaders });

    } catch (err) {
      // Return something so the frontend doesn't hang
      return new Response(JSON.stringify({ error: "Worker Error", city: cityName }), { headers: corsHeaders });
    }
  }
};
