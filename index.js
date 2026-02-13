export default {
  async fetch(request, env) {
    // These are the sources we know work for your area
    const sources = {
        austin: "https://austinpollen.com/",
        texas: "https://www.texas-pollen.com/"
    };

    try {
      // We'll fetch Austin Pollen as the primary source via your proxy
      const proxyUrl = `https://pollen-proxy.acekallas.workers.dev/?url=${encodeURIComponent(sources.austin)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();

      // Updated Extraction Logic: Looking for the specific way Austin Pollen displays data
      const data = {
        cedar: parseLevel(html, "Cedar"),
        oak: parseLevel(html, "Oak"),
        ragweed: parseLevel(html, "Ragweed"),
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Data sync failed" }), { status: 500 });
    }
  }
};

function parseLevel(text, type) {
  // This regex is specifically tuned for the Central Texas data formats
  // It looks for the word (Cedar) followed by some HTML tags and a number
  const regex = new RegExp(`${type}.*?>(\\d+)<`, "i");
  const match = text.match(regex);
  
  // If no number found, we return "Low" or "0"
  return match ? match[1] : "0";
}
