require("dotenv").config();
const express = require("express");
const https = require("https");
const path = require("path");

const app = express();
const username = "huzaifa_fFa1D";
const password = "+Fazian12345";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

const imgCache = new Map();

async function fetchGoogleImage(productName) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;

  const term = productName
    .replace(/[^\w\s]/g, " ") 
    .replace(/\s+/g, " ") 
    .trim();

  if (!term || term.length < 2) return null;
  if (imgCache.has(term)) return imgCache.get(term);

  const queryString = [
    `key=${GOOGLE_API_KEY}`,
    `cx=${GOOGLE_CX}`,
    `searchType=image`,
    `num=1`,
    `imgSize=LARGE`,
    `safe=active`,
    `q=${encodeURIComponent(term)}`,
  ].join("&");

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: "www.googleapis.com",
        port: 443,
        path: `/customsearch/v1?${queryString}`,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Node.js/PakSearch",
        },
      };

      const req = https.request(options, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              console.error(
                `[IMG] API Error ${parsed.error.code}: ${parsed.error.message}`,
              );
              resolve(null);
              return;
            }
            resolve(parsed);
          } catch {
            resolve(null);
          }
        });
      });

      req.on("error", (e) => {
        console.error("[IMG] Request error:", e.message);
        resolve(null);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });

    const img = result?.items?.[0]?.link || null;
    imgCache.set(term, img);
    console.log(`[IMG] ${img ? "done" : "noi imhg"} "${term}" → ${img || "not found"}`);
    return img;
  } catch (err) {
    console.warn(`[IMG] failed: ${err.message}`);
    imgCache.set(term, null);
    return null;
  }
}
async function fetchDuckImage(productName) {
  try {
    const term = productName
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!term || term.length < 2) return null;

    const cacheKey = "ddg_" + term;
    if (imgCache.has(cacheKey)) return imgCache.get(cacheKey);

    const q = encodeURIComponent(term);

    const tokenPage = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "duckduckgo.com",
          path: `/?q=${q}&iax=images&ia=images`,
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "keep-alive",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
          },
        },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            resolve("");
            return;
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        },
      );
      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        resolve("");
      });
      req.end();
    });

    if (!tokenPage) return null;

    const match =
      tokenPage.match(/vqd='([\d-]+)'/) ||
      tokenPage.match(/vqd="([\d-]+)"/) ||
      tokenPage.match(/vqd=([\d-]+)[&"']/);

    if (!match) {
      console.warn(`[DDG] vqd nahi mila: "${term}"`);
      imgCache.set(cacheKey, null);
      return null;
    }

    const token = match[1];

    await new Promise((r) => setTimeout(r, 400));

    const json = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "duckduckgo.com",
          path: `/i.js?q=${q}&vqd=${token}&p=1`,
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: `https://duckduckgo.com/?q=${q}&iax=images&ia=images`,
            "X-Requested-With": "XMLHttpRequest",
            Connection: "keep-alive",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        },
      );
      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        resolve("");
      });
      req.end();
    });

    if (!json) return null;

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      imgCache.set(cacheKey, null);
      return null;
    }

    const img = parsed?.results?.[0]?.image || null;
    imgCache.set(cacheKey, img);
    console.log(`[DDG] ${img ? "done" : "no image"} "${term}" → ${img || "not found"}`);
    return img;
  } catch (err) {
    console.warn("[DDG] failed:", err.message);
    return null;
  }
}

const PAKISTAN_CITIES = [
  { name: "Karachi", geo: "Karachi,Sindh,Pakistan" },
  { name: "Lahore", geo: "Lahore,Punjab,Pakistan" },
  { name: "Islamabad", geo: "Islamabad,Pakistan" },
  { name: "Rawalpindi", geo: "Rawalpindi,Punjab,Pakistan" },
  { name: "Faisalabad", geo: "Faisalabad,Punjab,Pakistan" },
  { name: "Multan", geo: "Multan,Punjab,Pakistan" },
  { name: "Peshawar", geo: "Peshawar,Khyber Pakhtunkhwa,Pakistan" },
  { name: "Quetta", geo: "Quetta,Balochistan,Pakistan" },
  { name: "Hyderabad", geo: "Hyderabad,Sindh,Pakistan" },
  { name: "Sialkot", geo: "Sialkot,Punjab,Pakistan" },
];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function oxylabsRequest(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);

    console.log("\n========================================");
    console.log("📤 OXYLABS REQUEST");
    console.log("========================================");
    console.log("source    :", body.source);
    console.log("query     :", body.query);
    console.log("geo       :", body.geo_location);

    const options = {
      hostname: "realtime.oxylabs.io",
      path: "/v1/queries",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      console.log("HTTP Status:", res.statusCode);
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          const content = parsed?.results?.[0]?.content;
          if (content) {
            console.log("content keys:", Object.keys(content));

            if (content.results) {
              console.log(
                "content.results keys:",
                Object.keys(content.results),
              );
              Object.entries(content.results).forEach(([k, v]) => {
                if (Array.isArray(v)) {
                  console.log(`  → content.results.${k}[] = ${v.length} items`);
                  if (v.length > 0) {
                    console.log(`     [0] keys:`, Object.keys(v[0]));
                    console.log(
                      `     [0] data:`,
                      JSON.stringify(v[0], null, 4),
                    );
                  }
                }
              });
            }

            [
              "organic",
              "results",
              "products",
              "items",
              "shopping_results",
            ].forEach((k) => {
              if (Array.isArray(content[k])) {
                console.log(`content.${k}[] = ${content[k].length} items`);
                if (content[k].length > 0) {
                  console.log(`   [0] keys:`, Object.keys(content[k][0]));
                  console.log(
                    `   [0] data:`,
                    JSON.stringify(content[k][0], null, 4),
                  );
                }
              }
            });
          } else {
            console.log(" No content in response");
            console.log("Full response:", JSON.stringify(parsed, null, 2));
          }

          resolve(parsed);
        } catch (e) {
          console.error("Parse Error:", e.message);
          reject(new Error("Parse error"));
        }
      });
    });

    req.on("error", (err) => {
      console.error("Request Error:", err.message);
      reject(err);
    });
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(bodyStr);
    req.end();
  });
}

function formatPrice(val) {
  if (!val && val !== 0) return null;
  if (typeof val === "number") return "Rs " + val.toLocaleString("en-PK");
  const s = String(val).trim();
  if (/(?:Rs\.?|PKR|₨)/i.test(s)) return s;
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num)) return "Rs " + num.toLocaleString("en-PK");
  return s || null;
}

function extractPriceFromText(text) {
  if (!text) return null;
  const m =
    text.match(/(?:Rs\.?|PKR|₨)\s?[\d,]+(?:\.\d{1,2})?/i) ||
    text.match(/[\d]{2,3}[,\d]+(?:\.\d{0,2})?/);
  return m ? formatPrice(m[0]) : null;
}

function getBestPrice(item) {
  if (typeof item.price === "number") return formatPrice(item.price);
  if (item.price_str) return item.price_str;
  if (item.price && typeof item.price === "string")
    return formatPrice(item.price);
  if (Array.isArray(item.additional_info) && item.additional_info[0]) {
    const p = extractPriceFromText(String(item.additional_info[0]));
    if (p) return p;
  }
  if (item.desc) {
    const p = extractPriceFromText(item.desc);
    if (p) return p;
  }
  return null;
}

function faviconOf(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}

function extractProducts(oxyResponse, source) {
  console.log(`Extracting — source: ${source}`);
  try {
    const content = oxyResponse?.results?.[0]?.content;
    if (!content) {
      console.log(" No content");
      return [];
    }

    const candidates = [
      content?.results?.organic,
      content?.results?.shopping,
      content?.results?.paid,
      content?.organic,
      content?.results,
      content?.products,
      content?.items,
      content?.shopping_results,
    ].filter((a) => Array.isArray(a) && a.length > 0);

    console.log(`Candidate arrays found: ${candidates.length}`);
    candidates.forEach((arr, i) =>
      console.log(
        `   [${i}] length=${arr.length}, keys=${JSON.stringify(Object.keys(arr[0]))}`,
      ),
    );

    let best = [];
    for (const arr of candidates) {
      const useful = arr.filter(
        (x) => x.thumbnail || x.image || x.price || x.price_str || x.title,
      );
      if (useful.length > best.length) best = useful;
    }

    if (!best.length && candidates.length) best = candidates[0];

    console.log(`Best array: ${best.length} items`);
    if (best[0])
      console.log("Sample item:", JSON.stringify(best[0], null, 2));

    return best.map((item, i) => {
      const link = item.url || item.product_url || item.link || "#";
      return {
        id: i + 1,
        name: item.title || item.name || "Unknown Product",
        price: getBestPrice(item) || "See website",
        source:
          item.merchant?.name ||
          item.seller ||
          item.favicon_text ||
          item.store ||
          (link !== "#"
            ? new URL(link).hostname.replace("www.", "")
            : "Google"),
        link,
        image: item.thumbnail || item.image || null,
        rating: item.rating || null,
        reviews: item.reviews_count || item.reviews || null,
      };
    });
  } catch (e) {
    console.error("Extract error:", e.message);
    return [];
  }
}

async function searchProducts(query, geoLocation) {
  console.log(`searchProducts: "${query}" | "${geoLocation}"`);

  const attempts = [
    {
      source: "google_shopping",
      query,
      geo_location: geoLocation,
      parse: true,
    },
    {
      source: "google_search",
      query: `${query} price buy`,
      geo_location: geoLocation,
      parse: true,
    },
  ];

  for (const body of attempts) {
    try {
      console.log(`\n Trying: ${body.source}`);
      const data = await oxylabsRequest(body);
      const products = extractProducts(data, body.source);

      if (products.length) {
        console.log(
          `\n SUCCESS: ${products.length} products from ${body.source}`,
        );
        return products;
      }
      console.log(` 0 from ${body.source}, trying next...`);
    } catch (err) {
      console.error(`${body.source} failed:`, err.message);
    }
  }

  console.log("All sources exhausted.");
  return [];
}

app.get("/api/cities", (_req, res) => res.json(PAKISTAN_CITIES));

app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  const city = req.query.city || "Karachi,Sindh,Pakistan";
  const page = Math.max(1, parseInt(req.query.page || "1"));
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "8")));

  if (!query || query.length < 2)
    return res
      .status(400)
      .json({ error: "Please enter at least 2 characters." });

  try {
    const all = await searchProducts(query, city);

    
    const noImg = all.filter((p) => !p.image);
    console.log(
      `[DDG] ${noImg.length} products ki images fetch ho rahi hain`,
    );

 
    await Promise.all(
      noImg.map(async (p) => {
   
        const searchTerm = `${p.name} ${query}`.slice(0, 100);
        const img = await fetchDuckImage(searchTerm);
        p.image = img || null; 
      }),
    );

    const start = (page - 1) * limit;
    const paginated = all.slice(start, start + limit);
    const totalPages = Math.ceil(all.length / limit);

    res.json({
      products: paginated,
      total: all.length,
      page,
      limit,
      totalPages,
      query,
      city,
    });
  } catch (err) {
    console.error("[API] Fatal:", err.message);
    res.status(500).json({ error: "Search failed: " + err.message });
  }
});

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n PakSearch → http://localhost:${PORT}`);
  console.log(`Pakistan Product TM Price Search`);
  console.log(`Dir: ${__dirname}\n`);
});
