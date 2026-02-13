export default {
  async fetch(request, env) {
    const sources = [
      "https://austinpollen.com/",
      "https://www.texas-pollen.com/"
    ];

    try {
      // We fetch the main Austin site through your stable proxy
      const proxyUrl = `https://pollen-proxy.acekallas.workers.dev/?url=${encodeURIComponent(sources[0])}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();

      // NEW LOGIC: This captures both numbers and words (like "High" or "Moderate")
      const data = {
        cedar: extractPollen(html, "Cedar"),
        oak: extractPollen(html, "Oak"),
        ragweed: extractPollen(html, "Ragweed") || extractPollen(html, "Weeds"),
        updated: new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago" })
      };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Sync failed" }), { status: 500 });
    }
  }
};

function extractPollen(html, type) {
  // 1. Try to find a specific number first (e.g., "Cedar: 150")
  const numRegex = new RegExp(`${type}.*?>(\\d+)<`, "i");
  const numMatch = html.match(numRegex);
  if (numMatch) return numMatch[1];

  // 2. If no number, look for status words (e.g., "High", "Moderate", "Low")
  const statusRegex = new RegExp(`${type}.*?>(High|Moderate|Low|Very High)<`, "i");
  const statusMatch = html.match(statusRegex);
  return statusMatch ? statusMatch[1] : "N/A";
}
