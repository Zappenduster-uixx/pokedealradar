import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProspectSource = {
  source: string;
  retailer: string;
  url: string;
  baseUrl: string;
};

type ProspectDeal = {
  title: string;
  retailer: string;
  price: string;
  category: string;
  valid_until: string;
  image: string;
  source_url: string;
  deal_type: "Online" | "Lokal";
  description: string;
};

type ProspectScanResult = {
  source: string;
  retailer: string;
  found: number;
  inserted: number;
  skipped: number;
  scannedPages: number;
  scannedPdfs: number;
  error?: string | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1200&auto=format&fit=crop";

const FETCH_TIMEOUT_MS = 10000;
const PDF_TIMEOUT_MS = 15000;
const MAX_LINKS_PER_SOURCE = 6;
const MAX_DEEP_LINKS_PER_PAGE = 3;

const prospectSources: ProspectSource[] = [
  {
    source: "Aldi Süd Prospekt",
    retailer: "Aldi Süd",
    url: "https://www.aldi-sued.de/prospekte",
    baseUrl: "https://www.aldi-sued.de",
  },
  {
    source: "Aldi Nord Prospekt",
    retailer: "Aldi Nord",
    url: "https://www.aldi-nord.de/prospekte/aldi-aktuell.html",
    baseUrl: "https://www.aldi-nord.de",
  },
  {
    source: "Lidl Prospekt",
    retailer: "Lidl",
    url: "https://www.lidl.de/c/online-prospekte/s10005610",
    baseUrl: "https://www.lidl.de",
  },
  {
    source: "Netto Prospekt",
    retailer: "Netto",
    url: "https://www.netto-online.de/ueber-netto/Online-Prospekte.chtm",
    baseUrl: "https://www.netto-online.de",
  },
  {
    source: "Kaufland Prospekt",
    retailer: "Kaufland",
    url: "https://filiale.kaufland.de/prospekte.html",
    baseUrl: "https://filiale.kaufland.de",
  },
  {
    source: "REWE Angebote",
    retailer: "REWE",
    url: "https://www.rewe.de/angebote/nationale-angebote/",
    baseUrl: "https://www.rewe.de",
  },
  {
    source: "Penny Angebote",
    retailer: "Penny",
    url: "https://www.penny.de/angebote",
    baseUrl: "https://www.penny.de",
  },
  {
    source: "EDEKA Angebote",
    retailer: "EDEKA",
    url: "https://www.edeka.de/eh/angebote.jsp",
    baseUrl: "https://www.edeka.de",
  },
  {
    source: "Marktkauf Angebote",
    retailer: "Marktkauf",
    url: "https://www.marktkauf.de/angebote/angebote.jsp",
    baseUrl: "https://www.marktkauf.de",
  },
  {
    source: "Müller Prospekte",
    retailer: "Müller",
    url: "https://www.mueller.de/prospekte/",
    baseUrl: "https://www.mueller.de",
  },
  {
    source: "Müller Online-Angebote",
    retailer: "Müller",
    url: "https://www.mueller.de/c/online-angebote/",
    baseUrl: "https://www.mueller.de",
  },
  {
    source: "ROSSMANN Prospekte",
    retailer: "ROSSMANN",
    url: "https://www.rossmann.de/de/angebote/prospekte",
    baseUrl: "https://www.rossmann.de",
  },
  {
    source: "ROSSMANN Angebote",
    retailer: "ROSSMANN",
    url: "https://www.rossmann.de/de/angebote",
    baseUrl: "https://www.rossmann.de",
  },
  {
    source: "KODi Angebote",
    retailer: "KODi",
    url: "https://www.kodi.de/angebote",
    baseUrl: "https://www.kodi.de",
  },
  {
    source: "TEDi Prospekt",
    retailer: "TEDi",
    url: "https://www.tedi.com/prospekt",
    baseUrl: "https://www.tedi.com",
  },
  {
    source: "Action Angebote",
    retailer: "Action",
    url: "https://www.action.com/de-de/angebote/",
    baseUrl: "https://www.action.com",
  },
  {
    source: "Smyths Toys Angebote",
    retailer: "Smyths Toys",
    url: "https://www.smythstoys.com/de/de-de/angebote",
    baseUrl: "https://www.smythstoys.com",
  },
];

function isAllowed(request: Request) {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin && adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;
}

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeout };
}

function decodeEscapedText(value: string) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");
}

function cleanText(value: string) {
  return decodeEscapedText(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&euro;/g, "€")
    .replace(/\s+/g, " ")
    .trim();
}

function extractScriptAndJsonText(html: string) {
  const scriptTexts = Array.from(
    html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi),
  )
    .map((match) => match[1])
    .join(" ");

  const jsonLikeText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/[{}[\],]/g, " ")
    .replace(/["']/g, " ");

  return cleanText(`${scriptTexts} ${jsonLikeText}`);
}

function makeSearchableText(value: string) {
  return `${cleanText(value)} ${extractScriptAndJsonText(value)}`
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(href: string, baseUrl: string) {
  if (!href) return "";

  const cleanedHref = href.replace(/&amp;/g, "&").trim();

  if (cleanedHref.startsWith("http")) {
    return cleanedHref.split("#")[0];
  }

  if (cleanedHref.startsWith("//")) {
    return `https:${cleanedHref}`.split("#")[0];
  }

  if (cleanedHref.startsWith("/")) {
    return `${baseUrl}${cleanedHref}`.split("#")[0];
  }

  return `${baseUrl}/${cleanedHref}`.split("#")[0];
}

function hasPokemonCardText(text: string) {
  const lower = text.toLowerCase();

  const hasPokemon =
    lower.includes("pokemon") ||
    lower.includes("pokémon") ||
    lower.includes("pok%c3%a9mon") ||
    lower.includes("pok\\u00e9mon");

  const hasCardWord =
    lower.includes("sammelkarten") ||
    lower.includes("sammelkarte") ||
    lower.includes("booster") ||
    lower.includes("boosterpack") ||
    lower.includes("booster pack") ||
    lower.includes("display") ||
    lower.includes("top-trainer") ||
    lower.includes("top trainer") ||
    lower.includes("trainer box") ||
    lower.includes("elite trainer box") ||
    lower.includes("etb") ||
    lower.includes("tcg") ||
    lower.includes("trading card") ||
    lower.includes("trading cards") ||
    lower.includes("blister") ||
    lower.includes("tin") ||
    lower.includes("kollektion") ||
    lower.includes("collection") ||
    lower.includes("deck") ||
    lower.includes("kampfdeck") ||
    lower.includes("starter deck");

  const forbidden =
    lower.includes("lego") ||
    lower.includes("plüsch") ||
    lower.includes("plush") ||
    lower.includes("kuscheltier") ||
    lower.includes("figur") ||
    lower.includes("actionfigur") ||
    lower.includes("spielzeugfigur") ||
    lower.includes("puzzle") ||
    lower.includes("bettwäsche") ||
    lower.includes("t-shirt") ||
    lower.includes("socken") ||
    lower.includes("rucksack") ||
    lower.includes("tasche") ||
    lower.includes("trinkflasche") ||
    lower.includes("brotdose") ||
    lower.includes("malbuch") ||
    lower.includes("stickerbuch") ||
    lower.includes("nintendo switch") ||
    lower.includes("switch spiel") ||
    lower.includes("videospiel") ||
    lower.includes("monopoly") ||
    lower.includes("adventskalender") ||
    lower.includes("pokemon go plus") ||
    lower.includes("pokémon go plus");

  return hasPokemon && hasCardWord && !forbidden;
}

function guessCategory(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("display")) return "Displays";

  if (
    lower.includes("top-trainer") ||
    lower.includes("top trainer") ||
    lower.includes("trainer box") ||
    lower.includes("elite trainer") ||
    lower.includes("etb")
  ) {
    return "ETB";
  }

  if (lower.includes("tin")) return "Tins";

  if (
    lower.includes("kollektion") ||
    lower.includes("collection") ||
    lower.includes("premium")
  ) {
    return "Kollektion";
  }

  if (lower.includes("deck")) return "Decks";

  return "Booster";
}

function extractPrice(text: string) {
  const normalized = text.replace(/\s+/g, " ");

  const pricePatterns = [
    /\d{1,4}\s?[,.]\s?\d{2}\s?€/,
    /\d{1,4}[,.]\d{2}\s?€/,
    /€\s?\d{1,4}[,.]\d{2}/,
    /\d{1,4}\s?€/,
  ];

  for (const pattern of pricePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      return match[0]
        .replace(/\s?,\s?/g, ",")
        .replace(/\s?\.\s?/g, ",")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "Preis im Prospekt prüfen";
}

function getPokemonContext(text: string) {
  const lower = text.toLowerCase();

  const keywords = [
    "pokémon",
    "pokemon",
    "booster",
    "sammelkarten",
    "sammelkarte",
    "tcg",
    "top-trainer",
    "top trainer",
    "elite trainer",
    "display",
    "blister",
    "kollektion",
    "trading card",
    "trading cards",
  ];

  const firstIndex = keywords
    .map((keyword) => lower.indexOf(keyword))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0];

  if (firstIndex === undefined) {
    return text.slice(0, 1200);
  }

  return text.slice(
    Math.max(0, firstIndex - 900),
    Math.min(text.length, firstIndex + 1400),
  );
}

function buildDealFromText(
  text: string,
  source: ProspectSource,
  sourceUrl: string,
): ProspectDeal | null {
  const searchableText = makeSearchableText(text);
  const context = getPokemonContext(searchableText);

  if (!hasPokemonCardText(context)) {
    return null;
  }

  const category = guessCategory(context);
  const price = extractPrice(context);

  return {
    title: `${source.retailer}: Pokémon-Karten im Prospekt gefunden`,
    retailer: source.retailer,
    price,
    category,
    valid_until: "Aktueller Prospekt",
    image: FALLBACK_IMAGE,
    source_url: sourceUrl,
    deal_type: "Lokal",
    description: `Automatisch im aktuellen Prospekt, digitalen Blätterkatalog oder Angebotsbereich gefunden. Erkannter Ausschnitt: ${context.slice(
      0,
      700,
    )}`,
  };
}

async function fetchHtml(url: string) {
  const { controller, timeout } = createTimeoutController(FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPdfText(url: string) {
  const { controller, timeout } = createTimeoutController(PDF_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/pdf,*/*",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PDF Status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });

    try {
      const parsedPdf = await parser.getText();
      return parsedPdf.text || "";
    } finally {
      await parser.destroy();
    }
  } finally {
    clearTimeout(timeout);
  }
}

function extractLinks(html: string, baseUrl: string) {
  const links = new Set<string>();

  const hrefMatches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi));

  for (const match of hrefMatches) {
    const href = match[1];

    if (!href) continue;

    const normalizedUrl = normalizeUrl(href, baseUrl);

    if (!normalizedUrl) continue;

    links.add(normalizedUrl);
  }

  const rawUrlMatches = Array.from(
    html.matchAll(/https?:\\?\/\\?\/[^"' <>)]+/gi),
  );

  for (const match of rawUrlMatches) {
    const rawUrl = match[0]
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .trim();

    if (!rawUrl) continue;

    links.add(rawUrl.split("#")[0]);
  }

  return Array.from(links);
}

function isProspectRelatedLink(url: string) {
  const lower = url.toLowerCase();

  return (
    lower.includes("prospekt") ||
    lower.includes("prospect") ||
    lower.includes("angebote") ||
    lower.includes("angebot") ||
    lower.includes("aktion") ||
    lower.includes("aktionen") ||
    lower.includes("flyer") ||
    lower.includes("leaflet") ||
    lower.includes("catalog") ||
    lower.includes("katalog") ||
    lower.includes("wochenangebot") ||
    lower.includes("wochenangebote") ||
    lower.includes("werbung") ||
    lower.includes("handzettel") ||
    lower.includes("blaetterkatalog") ||
    lower.includes("blätterkatalog") ||
    lower.includes("brochure") ||
    lower.includes("leaflets") ||
    lower.includes("flippingbook") ||
    lower.includes("flipbook") ||
    lower.includes("yumpu") ||
    lower.includes("issuu")
  );
}

function isPdfLink(url: string) {
  return url.toLowerCase().includes(".pdf");
}

async function insertDealIfNew(deal: ProspectDeal) {
  const { data: existingOffer, error: existingError } = await supabaseAdmin
    .from("offers")
    .select("id")
    .eq("source_url", deal.source_url)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingOffer) {
    return "skipped";
  }

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabaseAdmin.from("offers").insert({
    title: deal.title,
    retailer: deal.retailer,
    price: deal.price,
    category: deal.category,
    valid_until: deal.valid_until,
    image: deal.image,
    source_url: deal.source_url,
    deal_type: deal.deal_type,
    created_at: today,
    description: deal.description,
  });

  if (error) {
    throw new Error(error.message);
  }

  return "inserted";
}

async function scanSingleUrl(
  url: string,
  source: ProspectSource,
  startHtml?: string,
) {
  let found = 0;
  let inserted = 0;
  let skipped = 0;
  let scannedPages = 0;
  let scannedPdfs = 0;

  if (isPdfLink(url)) {
    const pdfText = await fetchPdfText(url);
    scannedPdfs++;

    const deal = buildDealFromText(pdfText, source, url);

    if (deal) {
      found++;

      const insertResult = await insertDealIfNew(deal);

      if (insertResult === "inserted") inserted++;
      if (insertResult === "skipped") skipped++;
    }

    return {
      found,
      inserted,
      skipped,
      scannedPages,
      scannedPdfs,
      html: "",
    };
  }

  const html = startHtml ?? (await fetchHtml(url));
  scannedPages++;

  const deal = buildDealFromText(html, source, url);

  if (deal) {
    found++;

    const insertResult = await insertDealIfNew(deal);

    if (insertResult === "inserted") inserted++;
    if (insertResult === "skipped") skipped++;
  }

  return {
    found,
    inserted,
    skipped,
    scannedPages,
    scannedPdfs,
    html,
  };
}

async function scanProspectSource(
  source: ProspectSource,
): Promise<ProspectScanResult> {
  let found = 0;
  let inserted = 0;
  let skipped = 0;
  let scannedPages = 0;
  let scannedPdfs = 0;

  try {
    const startHtml = await fetchHtml(source.url);
    scannedPages++;

    const urlsToScan = new Set<string>();
    urlsToScan.add(source.url);

    const startLinks = extractLinks(startHtml, source.baseUrl);

    const prospectLinks = startLinks
      .filter((link) => isProspectRelatedLink(link) || isPdfLink(link))
      .slice(0, MAX_LINKS_PER_SOURCE);

    for (const link of prospectLinks) {
      urlsToScan.add(link);
    }

    for (const url of Array.from(urlsToScan)) {
      try {
        const result = await scanSingleUrl(
          url,
          source,
          url === source.url ? startHtml : undefined,
        );

        found += result.found;
        inserted += result.inserted;
        skipped += result.skipped;

        if (url !== source.url) {
          scannedPages += result.scannedPages;
        }

        scannedPdfs += result.scannedPdfs;

        if (result.html) {
          const pageLinks = extractLinks(result.html, source.baseUrl);

          const deeperLinks = pageLinks
            .filter((link) => isProspectRelatedLink(link) || isPdfLink(link))
            .slice(0, MAX_DEEP_LINKS_PER_PAGE);

          for (const deeperUrl of deeperLinks) {
            try {
              const deeperResult = await scanSingleUrl(deeperUrl, source);

              found += deeperResult.found;
              inserted += deeperResult.inserted;
              skipped += deeperResult.skipped;
              scannedPages += deeperResult.scannedPages;
              scannedPdfs += deeperResult.scannedPdfs;
            } catch {
              // Einzelne tiefere Prospektseiten ignorieren.
            }
          }
        }
      } catch {
        // Einzelne Unterseiten ignorieren.
      }
    }

    return {
      source: source.source,
      retailer: source.retailer,
      found,
      inserted,
      skipped,
      scannedPages,
      scannedPdfs,
      error: null,
    };
  } catch (error) {
    return {
      source: source.source,
      retailer: source.retailer,
      found,
      inserted,
      skipped,
      scannedPages,
      scannedPdfs,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function POST(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const results: ProspectScanResult[] = [];

  for (const source of prospectSources) {
    const result = await scanProspectSource(source);
    results.push(result);
  }

  const totalFound = results.reduce((sum, result) => sum + result.found, 0);
  const totalInserted = results.reduce((sum, result) => sum + result.inserted, 0);
  const totalSkipped = results.reduce((sum, result) => sum + result.skipped, 0);

  const summary = results
    .map((result) => {
      if (result.error) {
        return `${result.source}: Fehler ${result.error}`;
      }

      return `${result.source}: ${result.found} gefunden, ${result.inserted} gespeichert, ${result.skipped} übersprungen, ${result.scannedPages} Seiten, ${result.scannedPdfs} PDFs`;
    })
    .join(" | ");

  return NextResponse.json({
    success: true,
    found: totalFound,
    inserted: totalInserted,
    skipped: totalSkipped,
    message: `Prospekt-Scanner fertig. ${totalFound} Treffer gefunden, ${totalInserted} gespeichert, ${totalSkipped} übersprungen. ${summary}`,
    sources: results,
  });
}