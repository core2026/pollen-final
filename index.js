export default {
  async fetch(request, env) {
    // 1. Define CORS headers manually for maximum compatibility
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // 2. Handle the browser's "pre-flight" check
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      // 3. Fallback Location Data (In case request.cf is undefined)
      const city = request.cf?.city || "San Antonio";
      const state = request.cf?.regionCode || "TX";
      const lat = request.cf?.latitude || "29.74";
      const lon = request.cf?.longitude || "-98.64";

      // 4. Verify API Key exists
      if (!env.TOMORROW_API_KEY) {
        return new Response(JSON.stringify({ error: "API Key missing in Worker Settings" }), { status: 500, headers });
      }

      // 5. Fetch with Imperial Units
      const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      // Check if API actually returned weather data
      if (!data.data || !data.data.values) {
        return new Response(JSON.stringify({ error: "Tomorrow.io API Error", details: data }), { status: 500, headers });
      }

      const v = data.data.values;

      // 6. Logic
      const cedarRisk = (v.humidity < 45 && v.windGust > 12) ? "Moderate" : "Low";
      const carWash = v.precipitationProbability > 20 ? "❌ Wait" : "🧼 Good";

      const result = {
        location: `${city}, ${state}`,
        actualTemp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uvIndex: v.uvIndex || 0,
        cedar: cedarRisk,
        carWash: carWash,
        clearsUp: "Stable conditions.",
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: '2-digit', minute: '2-digit' })
      };

      return new Response(JSON.stringify(result), { status: 200, headers });

    } catch (err) {
      // 7. If the code crashes, return the actual error text so we can see it in the console
      return new Response(JSON.stringify({ error: "Worker Crash", message: err.message }), { status: 500, headers });
    }
  }
};
