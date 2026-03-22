// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  ACEKALLAS WEATHER — CLOUDFLARE WORKER                                      ║
// ║  ai-deploy-rules: index_pollen-final.js                                     ║
// ╠══════════════════════════════════════════════════════════════════════════════╣
// ║  ⚠️  AI ASSISTANT — READ THIS BEFORE EDITING                                ║
// ║                                                                             ║
// ║  DEPLOYMENT: This file goes to Cloudflare Workers dashboard ONLY.           ║
// ║    URL: pollen-data.acekallas.com                                           ║
// ║    Worker name in dashboard: pollen-data (or similar)                      ║
// ║    DO NOT push this to GitHub Pages — it won't work there.                 ║
// ║                                                                             ║
// ║  ENVIRONMENT VARIABLES (set in Cloudflare dashboard → Settings → Variables)║
// ║    TOMORROW_API_KEY — Tomorrow.io API key (free tier)                      ║
// ║    Do NOT hardcode the key in this file.                                   ║
// ║                                                                             ║
// ║  WHAT THIS WORKER RETURNS (all fields expected by index.html):             ║
// ║    city, slug, lat, lon                                                    ║
// ║    temp, feelsLike, humidity, wind, uv, dewPoint                           ║
// ║    precipChance, weatherCode, visibility                                   ║
// ║    hourly[12] — next 12 hours: time,temp,feelsLike,precip,                ║
// ║                  weatherCode,wind,uv,humidity,dewPoint                     ║
// ║    daily[5]  — next 5 days: time,tempHigh,tempLow,precip,                 ║
// ║                 weatherCode,wind,uvMax,humidity                            ║
// ║    isRelay, asOrg — VPN/Private Relay detection via Cloudflare ASN        ║
// ║    updated — formatted time string (America/Chicago)                      ║
// ║                                                                             ║
// ║  CACHING: 10-minute Cloudflare cache. isRelay is injected fresh on every  ║
// ║    request even when serving cached weather data.                          ║
// ║                                                                             ║
// ║  ERROR RESPONSE: { error: "Service Busy" } with HTTP 429                  ║
// ║    index.html handles this via !r.ok check — do not change the status.    ║
// ║                                                                             ║
// ║  AFTER EDITING: Deploy in Cloudflare dashboard → Save and Deploy.         ║
// ║  Also bump sw.js CACHE_VERSION and index.html version comment.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

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

    const asOrg = (cf.asOrganization || '').toLowerCase();
    const asn = cf.asn || 0;
    const isRelay =
      asn === 714   ||
      asn === 54113 ||
      asn === 20940 ||
      asn === 394699||
      asOrg.includes('apple') || asOrg.includes('icloud') ||
      asOrg.includes('private') || asOrg.includes('relay') ||
      asOrg.includes('mullvad') || asOrg.includes('nord') ||
      asOrg.includes('express') || asOrg.includes('proton') ||
      asOrg.includes('tor project') || asOrg.includes('vpn') ||
      asOrg.includes('fastly') || asOrg.includes('akamai');

    const lat = urlParams.get("lat") || cf.latitude || "29.7408";
    const lon = urlParams.get("lon") || cf.longitude || "-98.6444";
    const cityName = urlParams.get("name") || cf.city || "San Antonio";
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');

    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    let response = await cache.match(cacheKey);

    if (response) {
      const cached = await response.json();
      cached.isRelay = isRelay;
      cached.asOrg = cf.asOrganization || "";
      const cachedHeaders = new Headers(response.headers);
      cachedHeaders.set("X-Cache", "HIT");
      return new Response(JSON.stringify(cached), { headers: cachedHeaders });
    }

    try {
      // Realtime call (existing fields)
      const realtimeUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&units=imperial&apikey=${env.TOMORROW_API_KEY}`;

      // Forecast call — hourly + daily in one request, free plan fields only
      const forecastFields = [
        'temperature','temperatureApparent','humidity','windSpeed',
        'precipitationProbability','weatherCode','uvIndex','visibility','dewPoint'
      ].join(',');
      const forecastUrl = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&units=imperial&timesteps=1h,1d&fields=${forecastFields}&apikey=${env.TOMORROW_API_KEY}`;

      const [realtimeRes, forecastRes] = await Promise.all([
        fetch(realtimeUrl),
        fetch(forecastUrl)
      ]);

      const realtimeJson = await realtimeRes.json();
      const forecastJson = await forecastRes.json();

      if (!realtimeJson.data) throw new Error("Realtime API limit or error");

      const v = realtimeJson.data.values;

      const formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(new Date());

      // Next 12 hours
      const hourlyRaw = forecastJson?.timelines?.hourly || [];
      const hourly = hourlyRaw.slice(0, 12).map(h => ({
        time: h.time,
        temp: Math.round(h.values.temperature),
        feelsLike: Math.round(h.values.temperatureApparent),
        precip: Math.round(h.values.precipitationProbability || 0),
        weatherCode: h.values.weatherCode || 1000,
        wind: Math.round(h.values.windSpeed || 0),
        uv: h.values.uvIndex || 0,
        humidity: Math.round(h.values.humidity || 0),
        dewPoint: Math.round(h.values.dewPoint || 0)
      }));

      // Next 5 days
      const dailyRaw = forecastJson?.timelines?.daily || [];
      const daily = dailyRaw.slice(0, 5).map(d => ({
        time: d.time,
        tempHigh: Math.round(d.values.temperatureMax ?? d.values.temperature),
        tempLow:  Math.round(d.values.temperatureMin ?? d.values.temperature),
        precip: Math.round(d.values.precipitationProbabilityAvg || 0),
        weatherCode: d.values.weatherCodeMax || d.values.weatherCode || 1000,
        wind: Math.round(d.values.windSpeedAvg || 0),
        uvMax: Math.round(d.values.uvIndexMax || 0),
        humidity: Math.round(d.values.humidityAvg || 0)
      }));

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
        dewPoint: Math.round(v.dewPoint || 0),
        updated: formattedTime,
        isRelay: isRelay,
        asOrg: cf.asOrganization || "",
        hourly,
        daily
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
      return new Response(JSON.stringify({ error: "Service Busy", detail: e.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
