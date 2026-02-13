export default {
  async fetch(request, env) {
    const sourceUrl = "https://www.austinpollen.com/";
    const proxyUrl = `https://pollen-proxy.acekallas.workers.dev/?url=${encodeURIComponent(sourceUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();

      // NEW LOGIC: Target the Google Charts data format you found
      const data = {
        cedar: extractChartValue(html, "Cedar"),
        oak: extractChartValue(html, "Trees"), // Using "Trees" since Oak is usually bundled there on this chart
        ragweed: extractChartValue(html, "Molds"), // Austin currently showing Molds/PM2.5
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Chart data error" }), { status: 500 });
    }
  }
};

function extractChartValue(html, label) {
    // This looks for: ['Label', Number,
    const regex = new RegExp(`'${label}',\\s*(\\d+)`, "i");
    const match = html.match(regex);
    
    if (match && match[1]) {
        return match[1]; // Returns the raw number (e.g., 602 for Cedar)
    }
    return "0";
}
