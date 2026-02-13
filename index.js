export default {
  async fetch(request, env) {
    // Get location data directly from Cloudflare's Edge
    const userCity = request.cf.city || "Your City";
    const userState = request.cf.region || "USA";
    const lat = request.cf.latitude || "29.74";
    const lon = request.cf.longitude || "-98.64";

    const apiKey = env.TOMORROW_API_KEY; 
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const v = data.data.values;

      // --- CEDAR SURROGATE LOGIC ---
      let cedarRisk = "Low";
      if (v.humidity < 40 && v.windGust > 15) cedarRisk = "High";
      else if (v.humidity < 50 || v.windGust > 10) cedarRisk = "Moderate";

      // --- CAR WASH LOGIC ---
      let carWash = "🧼 Great Day to Wash!";
      if (v.precipitationProbability > 20) carWash = "❌ Wait (Rain Chance)";
      else if (v.windGust > 20) carWash = "💨 Wait (High Dust)";

      const result = {
        location: `${userCity}, ${userState}`, // This sends the dynamic city name
        temp: Math.round(v.temperatureApparent),
        cedar: cedarRisk,
        uvIndex: v.uvIndex,
        carWash: carWash,
        clearsUp: v.uvIndex > 6 ? "UV Peaks soon. Seek shade." : "Clear skies for the next few hours.",
        funFact: getFact(cedarRisk),
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Sync Failed" }), { status: 500 });
    }
  }
};

function getFact(risk) {
  const facts = [
    "UV rays are strongest between 10 AM and 4 PM.",
    "Humidity over 50% often keeps pollen closer to the ground.",
    "A 'Feels Like' temp accounts for wind chill and moisture.",
    "Dry, windy days are the primary drivers for Cedar dispersal."
  ];
  return facts[Math.floor(Math.random() * facts.length)];
}
