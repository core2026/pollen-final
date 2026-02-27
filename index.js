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
    
    // Standardize coordinates to 4 decimal places for API stability
    const lat = parseFloat(urlParams.get("lat") || cf.latitude || "29.7408").toFixed(4);
    const lon = parseFloat(urlParams.get("lon") || cf.longitude || "-98.6444").toFixed(4);
    
    // Initial city name guess from Cloudflare Edge
    let cityName = urlParams.get("city") || cf.city || "San Antonio";

    try {
      const apiKey = env.TOMORROW_API_KEY;
      
      // Fetch Weather and Sun data in parallel for speed
      const [wRes, sRes] = await Promise.allSettled([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      let weatherData = {};
      if (wRes.status === "fulfilled") {
        const wJson = await wRes.value.json();
        weatherData = wJson.data?.values || {};
        
        // Use Tomorrow.io's built-in geocoding to get a clean city name
        if (wJson.data?.location?.name) {
          // Extracts "San Antonio" from "San Antonio, Texas, United States"
          cityName = wJson.data.location.name.split(',')[0].trim();
        }
      }

      let sunData = sRes.status === "fulfilled" ? (await sRes.value.json()).results : {};

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
      return new Response(JSON.stringify({ error: "Sync Error", city: cityName }), { headers: corsHeaders });
    }
  }
};
