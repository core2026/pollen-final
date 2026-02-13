export default {
  async fetch(request, env) {
    const userCity = request.cf.city || "Local Area";
    const userState = request.cf.regionCode || "USA";
    const lat = request.cf.latitude || "29.74";
    const lon = request.cf.longitude || "-98.64";

    const apiKey = env.TOMORROW_API_KEY; 
    // ADDED &units=imperial to the URL below
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const v = data.data.values;

      let cedarRisk = "Low";
      if (v.humidity < 40 && v.windGust > 15) cedarRisk = "High";
      else if (v.humidity < 50 || v.windGust > 10) cedarRisk = "Moderate";

      let carWash = "🧼 Great Day to Wash!";
      if (v.precipitationProbability > 20) carWash = "❌ Wait (Rain Chance)";
      else if (v.windGust > 20) carWash = "💨 Wait (High Dust)";

      const result = {
        location: `${userCity}, ${userState}`,
        actualTemp: Math.round(v.temperature),       
        feelsLike: Math.round(v.temperatureApparent), 
        uvIndex: v.uvIndex,
        cedar: cedarRisk,
        carWash: carWash,
        clearsUp: v.uvIndex > 6 ? "UV Peaks soon. Seek shade." : "Conditions are stable for now.",
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Error" }), { status: 500 });
    }
  }
};
