export default {
  async fetch(request, env) {
    // Fair Oaks Ranch Coordinates
    const lat = "29.74"; 
    const lon = "-98.64";
    const apiKey = env.TOMORROW_API_KEY; 
    
    // We request weather (for car wash) and pollen (for the stats)
    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Navigate the Tomorrow.io data tree
      const current = data.timelines.minutely[0].values;
      const daily = data.timelines.daily;

      const cedar = current.treeIndex || 0; // 0-5 scale
      const rainChance = current.precipitationProbability || 0;

      // 1. Car Wash Logic
      let carWash = "🧼 Great Day to Wash!";
      if (cedar > 2) carWash = "❌ Wait (High Pollen)";
      if (rainChance > 30) carWash = "❌ Wait (Rain Coming)";

      // 2. Clearing Up Logic (Look at the 3-day forecast)
      let clearingMsg = "High levels expected all week.";
      if (daily[2].values.treeIndex < daily[0].values.treeIndex) {
          clearingMsg = "Improvement expected in 48 hours!";
      }

      const result = {
        cedar: translateIndex(cedar),
        oak: translateIndex(current.grassIndex || 0),
        carWash: carWash,
        clearsUp: clearingMsg,
        funFact: getFunFact(),
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      // If the API fails or key is missing, this is why you get the 500 error
      return new Response(JSON.stringify({ error: "API Error", details: err.message }), { status: 500 });
    }
  }
};

function translateIndex(val) {
    if (val >= 4) return "Very High";
    if (val >= 3) return "High";
    if (val >= 2) return "Moderate";
    return "Low";
}

function getFunFact() {
  const facts = [
    "Cedar 'berries' are actually tiny pine cones!",
    "Pollen is the 'fingerprint' of nature; every plant has a unique shape.",
    "A single cedar tree can release a billion grains of pollen.",
    "Rain actually 'washes' the air, bringing temporary relief."
  ];
  return facts[Math.floor(Math.random() * facts.length)];
}
