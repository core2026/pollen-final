export default {
  async fetch(request, env) {
    // 1. Safe Geolocation (Adding fallbacks to prevent 500 errors)
    const cf = request.cf || {};
    const userCity = cf.city || "San Antonio";
    const userState = cf.regionCode || "TX";
    const lat = cf.latitude || "29.74";
    const lon = cf.longitude || "-98.64";

    const apiKey = env.TOMORROW_API_KEY; 
    
    // 2. Imperial Units for Fahrenheit
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${apiKey}`;

    // Standard CORS headers to keep the browser happy
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle "Options" pre-flight request from browser
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Tomorrow.io API failed with status ${response.status}`);
      }

      const data = await response.json();
      const v = data.data.values;

      // 3. Cedar Risk Logic
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
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    } catch (err) {
      // If it fails, we STILL send the CORS headers so you can see the real error message
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
};
