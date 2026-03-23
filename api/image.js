// api/image.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const term = searchParams.get("q") || "";

  if (!term) return Response.json({ img: null });

  const q = encodeURIComponent(term);

  try {
    // Step 1: vqd token
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${q}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
      },
    );

    const html = await tokenRes.text();

    const match =
      html.match(/vqd='([\d-]+)'/) ||
      html.match(/vqd="([\d-]+)"/) ||
      html.match(/vqd=([\d-]+)[&"']/);

    if (!match) {
      console.warn("[DDG Edge] vqd nahi mila:", term);
      return Response.json({ img: null });
    }

    const token = match[1];

    // Step 2: images fetch
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${q}&vqd=${token}&p=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/javascript, */*; q=0.01",
          Referer: `https://duckduckgo.com/?q=${q}&iax=images&ia=images`,
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );

    const data = await imgRes.json();
    const img = data?.results?.[0]?.image || null;

    console.log(`[DDG Edge] ${img ? "✅" : "❌"} "${term}"`);
    return Response.json({ img });
  } catch (err) {
    console.error("[DDG Edge] Error:", err.message);
    return Response.json({ img: null });
  }
}
