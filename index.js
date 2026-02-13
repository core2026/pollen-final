export default {
  async fetch(request, env) {
    // 1. Define standard headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Handle browser "permission" check
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 3. Check for API Key immediately
      if (!env.TOMORROW_API_KEY) {
        throw new Error("API Key is missing in Worker Settings");
      }

      const lat = "29.74"; 
      const lon = "-98.64";
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      // 4. Handle API-specific errors (Rate limits, etc.)
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: "Tomorrow.io Error", 
          message: data.message || "Unknown API Issue" 
        }), { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const v = data.data.values;
      const result = {
        location: "Fair Oaks Ranch",
        temp: Math.round(v.temperatureApparent),
        uvIndex: v.uvIndex,
        cedar: (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low",
        carWash: v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good",
        clearsUp: "Stable conditions.",
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      // 5. Catch crashes and send a JSON error instead of a blank 500
      return new Response(JSON.stringify({ 
        error: "Worker Crash", 
        message: err.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
};
