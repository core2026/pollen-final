export default {
  async fetch(request, env) {
    // 1. Get dynamic location from the user's IP address
    // Cloudflare provides these fields automatically in the request.cf object
    const userCity = request.cf.city || "San Antonio";
    const userState = request.cf.regionCode || "TX";
    const lat = request.cf.latitude || "29.74";
    const lon = request.cf.longitude || "-98.64";

    const apiKey = env.TOMORROW_API_KEY; 
    
    // 2. The URL now explicitly includes &units=imperial for Fahrenheit
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const v = data.data.values;

      // 3. Cedar Risk Logic (Estimating based on weather triggers)
      // High risk = Low humidity (<40%) and significant wind (>15 mph)
      let cedarRisk = "Low";
      if (v.humidity < 40 && v.windGust > 15) {
        cedarRisk = "High";
      } else if (v.humidity < 50 || v.windGust > 10) {
        cedarRisk = "Moderate";
      }

      // 4. Car Wash Index Logic
      let carWash = "🧼 Great Day to Wash!";
      if (v.precipitationProbability > 20) {
        carWash = "❌ Wait (Rain Chance)";
      } else if (v.windGust > 25) {
        carWash = "💨 Wait (High Dust/Wind)";
      }

      // 5. Construct the response object
      const result = {
        location: `${userCity}, ${userState}`,
        actualTemp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uvIndex: v.uvIndex,
        cedar: cedarRisk,
        carWash: carWash,
        clearsUp: v.uvIndex > 6 ? "UV Peaks soon. Seek shade." : "Conditions are stable for now.",
        updated: new Date().toLocaleTimeString("en-US", { 
          timeZone: "America/Chicago",
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      return new Response(JSON.stringify(result), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ 
        error: "API Sync Failed", 
        details: err.message 
      }), { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
