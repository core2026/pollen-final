export default {
  async fetch(request, env) {
    const lat = "29.74"; 
    const lon = "-98.64";
    const apiKey = env.TOMORROW_API_KEY; 
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const v = data.data.values;

      // 1. Car Wash Logic
      let carWash = "🧼 Great Day to Wash!";
      if (v.precipitationProbability > 20) carWash = "❌ Wait (Rain Chance)";
      else if (v.windGust > 20) carWash = "💨 Wait (High Dust/Wind)";

      // 2. Outdoor Window / "Clears Up"
      let outdoorMsg = "Conditions are perfect for the patio!";
      if (v.uvIndex > 6) outdoorMsg = "High UV - Seek shade until sunset.";
      else if (v.humidity > 80) outdoorMsg = "Very humid - Stay hydrated.";

      const result = {
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        humidity: v.humidity,
        uvIndex: v.uvIndex,
        carWash: carWash,
        clearsUp: outdoorMsg,
        funFact: getAtmosphericFact(v.moonPhase),
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

function getAtmosphericFact(moon) {
  const facts = [
    "Fair Oaks Ranch: Sound travels further in humid air!",
    "UV rays can pass through clouds—don't let a gray sky fool you.",
    "Low pressure often leads to joint sensitivity for some people.",
    "The 'Feels Like' temp factors in wind chill and humidity."
  ];
  return facts[Math.floor(Math.random() * facts.length)];
}
