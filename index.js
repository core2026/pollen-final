export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const lat = "29.74"; 
    const lon = "-98.64";
    
    // Safety check: Is the key actually there?
    if (!env.TOMORROW_API_KEY) {
      return new Response(JSON.stringify({ error: "Worker cannot see TOMORROW_API_KEY. Check your Cloudflare Variables." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // If Tomorrow.io returns an error (like 429 or 403), show us why
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: "Tomorrow.io Rejected Request", 
          status: response.status,
          message: data.message || "Check API Key/Rate Limits"
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
      return new Response(JSON.stringify({ error: "Worker Crash", message: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
};
