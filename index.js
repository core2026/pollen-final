export default {
  async fetch(request, env) {
    const target = "https://www.texas-pollen.com/current-levels"; 
    
    // BYPASS THE 530: Use the direct .workers.dev link here.
    // This is much more stable for internal communication.
    const proxyUrl = `https://pollen-proxy.acekallas.workers.dev/?url=${encodeURIComponent(target)}`;

    try {
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Proxy Status: ${response.status}` }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });
      }

      const text = await response.text();
      const result = {
        cedar: extractValue(text, "Cedar"),
        oak: extractValue(text, "Oak"),
        ragweed: extractValue(text, "Ragweed"),
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" }),
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fetch Error", details: err.message }), { status: 500 });
    }
  }
};

function extractValue(text, type) {
  const reg = new RegExp(`${type}:\\s*(\\d+)`, "i");
  const match = text.match(reg);
  return match ? parseInt(match[1]) : 0;
}
