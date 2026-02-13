export default {
  async fetch(request, env) {
    const LAT = "29.74"; // Fair Oaks Ranch area
    const LON = "-98.64";
    const API_KEY = env.TOMORROW_API_KEY; 
    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${LAT},${LON}&apikey=${API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const current = data.get.timeline.minutely[0].values; // Simplified for example

      // Logic for Car Wash and Forecast
      const cedar = current.treeIndex || 0;
      const rainChance = current.precipitationProbability || 0;
      
      let carWash = "Great Day to Wash!";
      if (cedar > 3) carWash = "Wait - High Pollen";
      if (rainChance > 40) carWash = "Wait - Rain Expected";

      const result = {
        cedar: cedar,
        oak: current.grassIndex || 0, // Tomorrow.io uses indices 0-5
        carWash: carWash,
        funFact: getFunFact(cedar),
        clearsUp: "Looking better by Tuesday", // You can calculate this from daily data
        updated: new Date().toLocaleTimeString()
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Failure" }), { status: 500 });
    }
  }
};

function getFunFact(level) {
  const facts = [
    "Cedar trees are actually Junipers!",
    "Pollen can travel up to 400 miles over the Gulf.",
    "A single Cedar tree can produce a billion pollen grains.",
    "Bees use static electricity to attract pollen to their bodies."
  ];
  return facts[Math.floor(Math.random() * facts.length)];
}
