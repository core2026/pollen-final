export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const urlParams = new URL(request.url).searchParams;
    const cf = request.cf || {};

    // Check relay BEFORE cache — this is per-request, never cached
    const asOrg = (cf.asOrganization || '').toLowerCase();
    const isRelay = asOrg.includes('apple') || asOrg.includes('icloud') ||
                    asOrg.includes('private') || asOrg.includes('relay') ||
                    asOrg.includes('mullvad') || asOrg.includes('nord') ||
                    asOrg.includes('express') || asOrg.includes('proton') ||
                    asOrg.includes('tor project') || asOrg.includes('vpn');

    const lat = urlParams.get("lat") || cf.latitude || "29.7408";
    const lon = urlParams.get("lon") || cf.longitude || "-98.6444";
    const cityName = urlParams.get("name") || cf.city || "San Antonio";
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');

    // Cache weather data (not relay status — that's injected fresh each time)
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (response) {
      // Serve cached weather but inject fresh isRelay for this specific request
      const cached = await response.json();
      cached.isRelay = isRelay;
      cached.asOrg = cf.asOrganization || "";
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set("X-Cache", "HIT");
      return new Response(JSON.stringify(cached), { headers: cachedHeaders });
    }

    try {
      const apiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;
      const res = await fetch(apiUrl);
      const j = await res.json();

      if (!j.data) throw new Error("API Limit");

      const v = j.data.values;

      const formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(new Date());

      const data = JSON.stringify({
        city: cityName,
        slug: citySlug,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        temp: Math.round(v.temperature),
        feelsLike: Math.round(v.temperatureApparent),
        uv: v.uvIndex,
        humidity: Math.round(v.humidity),
        wind: Math.round(v.windSpeed),
        precipChance: Math.round(v.precipitationProbability || 0),
        weatherCode: v.weatherCode || 1000,
        visibility: Math.round(v.visibility || 10),
        updated: formattedTime,
        isRelay: isRelay,
        asOrg: cf.asOrganization || ""
      });

      response = new Response(data, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=600, max-age=600",
          "X-Cache": "MISS"
        }
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (e) {
      return new Response(JSON.stringify({ error: "Service Busy" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
