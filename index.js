export default {
  async fetch(request, env) {
    const sourceUrl = "https://www.austinpollen.com/";
    const proxyUrl = `https://pollen-proxy.acekallas.workers.dev/?url=${encodeURIComponent(sourceUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();

      // We are looking for: ['Cedar', 602,
      // The Regex below handles both single and double quotes just in case
      const data = {
        cedar: scrapeChart(html, "Cedar"),
        oak: scrapeChart(html, "Trees"),    // Mapping "Trees" to Oak for now
        ragweed: scrapeChart(html, "Molds"), // Mapping "Molds" to Ragweed for now
        updated: new Date().toLocaleTimeString("en-US", { 
          timeZone: "America/Chicago",
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      return new Response(JSON.stringify(data), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Data Sync Error" }), { status: 500 });
    }
  }
};

function scrapeChart(html, label) {
    // This regex looks for: ['Label', 123
    // It is very specific to the Google Chart code you pasted.
    const regex = new RegExp(`['"]${label}['"],\\s*(\\d+)`, "i");
    const match = html.match(regex);
    
    if (match && match[1]) {
        return match[1]; 
    }
    return "0"; // Default to 0 if not found
}
