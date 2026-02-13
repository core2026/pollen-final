export default {
  async fetch(request, env) {
    // 1. The Real Data Source
    const target = "https://www.texas-pollen.com/current-levels"; 
    
    // 2. Your Proxy URL - Ensure this exactly matches your proxy worker's custom domain
    const proxyUrl = `https://pollen-api.acekallas.com/?url=${encodeURIComponent(target)}`;

    try {
      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        // This will show us if the proxy is the one failing
        return new Response(JSON.stringify({ 
          error: `Proxy Error: ${response.status}`,
          debug: `Attempted to fetch: ${proxyUrl}`
        }), { status: response.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

      const text = await response.text();

      // 3. Clean and return
      return new Response(JSON.stringify({
        cedar: extractValue(text, "Cedar"),
        oak: extractValue(text, "Oak"),
        ragweed: extractValue(text, "Ragweed"),
        updated: new Date().toLocaleTimeString(),
        status: "Healthy"
      }), {
        headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // Allows acekallas.com to read this
        }
      });

    } catch (err) {
      // This catches DNS or SSL failures
      return new Response(JSON.stringify({ error: "Network/SSL Failure", details: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }
};

function extractValue(text, type) {
  const reg = new RegExp(`${type}:\\s*(\\d+)`, "i");
  const match = text.match(reg);
  return match ? parseInt(match[1]) : 0;
}
