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
    
    let cityName = urlParams.get("city") || cf.city || "San Antonio";

    // Reverse Geocode attempt
    if (urlParams.get("lat")) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { "User-Agent": "AcekallasDash/1.6" }
        });
        const geoData = await geoRes.json();
        cityName = geoData.address.neighborhood || geoData.address.suburb || geoData.address.city || geoData.address.town || `GPS: ${lat}, ${lon}`;
      } catch (e) {
        cityName = `GPS: ${lat}, ${lon}`;
      }
    }

    try {
      const [wRes, sRes] = await Promise.allSettled([
        fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`),
        fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
      ]);

      let weatherData = wRes.status === "fulfilled" ? (await wRes.value.json()).data?.values : {};
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
      return new Response(JSON.stringify({ error: "API Timeout", city: cityName }), { headers: corsHeaders });
    }
  }
};
