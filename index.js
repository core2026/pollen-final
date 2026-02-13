export default {
  async fetch(request, env) {
    // Your specific pollen data source
    const sourceUrl = "YOUR_POLLEN_DATA_SOURCE_URL";

    try {
      const response = await fetch(sourceUrl);
      const text = await response.text();

      // Example Parsing Logic: 
      // This looks for a tree name and the number following it.
      const data = {
        oak: parseValue(text, "Oak"),
        cedar: parseValue(text, "Cedar"),
        pine: parseValue(text, "Pine"),
        updated: new Date().toLocaleString(),
      };

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allows your site to read this
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  },
};

function parseValue(str, type) {
  const reg = new RegExp(`${type}:\\s*(\\d+)`, "i");
  const match = str.match(reg);
  return match ? parseInt(match[1]) : 0;
}
