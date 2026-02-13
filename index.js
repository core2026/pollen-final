export default {
  async fetch(request, env) {
    // 1. Define the actual source of the pollen data
    const rawDataSource = "https://example-pollen-provider.com/data.txt";
    
    // 2. Call your proxy using your NEW custom subdomain
    const proxyUrl = `https://pollen-api.acekallas.com/?url=${encodeURIComponent(rawDataSource)}`;

    try {
      const response = await fetch(proxyUrl);
      const text = await response.text();

      // 3. Clean the data (Logic depends on your source's text format)
      const result = {
        cedar: extractValue(text, "Cedar"),
        oak: extractValue(text, "Oak"),
        ragweed: extractValue(text, "Ragweed"),
        updated: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
        source: "acekallas.com Data Engine"
      };

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://acekallas.com", // Security: only allow your main site
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Data fetch failed" }), { status: 500 });
    }
  },
};

function extractValue(text, type) {
  const reg = new RegExp(`${type}:\\s*(\\d+)`, "i");
  const match = text.match(reg);
  return match ? parseInt(match[1]) : 0;
}
