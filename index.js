export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. Check the Cache first
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (response) {
      console.log("Cache Hit!");
      // Pass through with cache hit header visible to client
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set("X-Cache", "HIT");
      return new Response(response.body, { headers: cachedHeaders });
    }

    // 2. If not in cache, do the work
    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};
    const lat = urlParams.get("lat") || cf.latitude || "29.7408";
    const lon = urlParams.get("lon") || cf.longitude || "-98.6444";
    const cityName = urlParams.get("name") || cf.city || "San Antonio";
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');

    try {
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      const res = await fetch(apiUrl);
      const j = await res.json();

      if (!j.data) throw new Error("API Limit");

      const v = j.data.values;

      // FIX: Use Intl.DateTimeFormat for proper Central Time with automatic DST support
      // Workers always run in UTC, so getTimezoneOffset() is always 0 — don't use it.
      const formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date());

      const data = JSON.stringify({
        city: cityName,
        slug: citySlug,
        lat: parseFloat(lat).toFixed(2),
        lon: parseFloat(lon).toFixed(2),
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex,
        humidity: Math.round(v.humidity),
        wind: Math.round(v.windSpeed),
        updated: formattedTime
      });

      // 3. Create response — cache for 10 minutes at edge AND browser
      response = new Response(data, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // s-maxage: Cloudflare edge cache TTL
          // max-age: browser cache TTL (reduces repeated Worker invocations)
          "Cache-Control": "public, s-maxage=600, max-age=600",
          "X-Cache": "MISS"
        }
      });

      // Store in Cloudflare Cache API while returning to user
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;

    } catch (e) {
      console.error("Worker error:", e.message);
      return new Response(JSON.stringify({ error: "Service Busy" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
