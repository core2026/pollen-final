export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle browser pre-flight check (Fixes the CORS block)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const lat = "29.74"; 
    const lon = "-98.64";
    const apiKey = env.TOMORROW_API_KEY; 
    
    // The "One Liner" fix for Fahrenheit
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
        location: "Fair Oaks Ranch",
        temp: Math.round(v.temperatureApparent),
        uvIndex: v.uvIndex,
        cedar: cedarRisk,
        carWash: carWash,
        clearsUp: v.uvIndex > 6 ? "UV Peaks soon. Seek shade." : "Clear skies for the next few hours.",
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "API Error" }), { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
