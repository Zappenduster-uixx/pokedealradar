import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

type ScannerDeal = {
  title: string;
  source_url: string;
  retailer: string;
  price: string;
  category: string;
  deal_type: "Online" | "Lokal";
  valid_until: string;
  image: string;
  description: string;
};

type ScannerResult = {
  source: string;
  deals: ScannerDeal[];
  error?: string;
};

type RetailerScannerConfig = {
  source: string;
  retailer: string;
  url: string;
  baseUrl: string;
  validUntil: string;
  description: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1200&auto=format&fit=crop";

function isAllowed(request: Request) {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin && adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;
}

function cleanText(value: string) {
  return value
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
    .replace(/\s+/g, " ")
    .trim();
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
    lower.includes("box") ||
    lower.includes("bundle")
  ) {
    return "Kollektion";
  }

  return "Booster";
}

function extractPrice(text: string) {
  const normalized = text.replace(/\s+/g, " ");

  const pricePatterns = [
    /\d{1,4}\s?[,.]\s?\d{2}\s?€/,
    /\d{1,4}[,.]\d{2}\s?€/,
    /\d{1,4}\s?€/,
    /€\s?\d{1,4}[,.]\d{2}/,
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

  return "Preis prüfen";
}

function detectRetailer(text: string) {
  const lower = text.toLowerCase();

  const retailers = [
    { name: "Smyths Toys", keywords: ["smyths", "smythstoys"] },
    { name: "Müller", keywords: ["müller", "mueller"] },
    { name: "Amazon", keywords: ["amazon"] },
    { name: "MediaMarkt", keywords: ["mediamarkt", "media markt"] },
    { name: "Saturn", keywords: ["saturn"] },
    { name: "Rossmann", keywords: ["rossmann"] },
    { name: "Netto", keywords: ["netto"] },
    { name: "Kaufland", keywords: ["kaufland"] },
    { name: "REWE", keywords: ["rewe"] },
    { name: "Lidl", keywords: ["lidl"] },
    { name: "Aldi", keywords: ["aldi"] },
    { name: "GameStop", keywords: ["gamestop", "game stop"] },
    { name: "eBay", keywords: ["ebay"] },
    { name: "Cardmarket", keywords: ["cardmarket"] },
    { name: "Thalia", keywords: ["thalia"] },
    { name: "dm", keywords: ["dm-drogerie", "dm drogerie", "dm.de"] },
    { name: "Marktkauf", keywords: ["marktkauf"] },
    { name: "Galeria", keywords: ["galeria"] },
    { name: "Otto", keywords: ["otto.de", " otto "] },
    { name: "Alternate", keywords: ["alternate"] },
    { name: "Coolshop", keywords: ["coolshop"] },
    { name: "Alza", keywords: ["alza"] },
    { name: "Proshop", keywords: ["proshop"] },
    { name: "Toynova", keywords: ["toynova"] },
    { name: "FantasyWelt", keywords: ["fantasywelt", "fantasy welt"] },
    { name: "Elbenwald", keywords: ["elbenwald"] },
    { name: "Manga-Mafia", keywords: ["manga-mafia", "manga mafia"] },
    { name: "Gate to the Games", keywords: ["gate to the games", "gttg"] },
    { name: "World of Games", keywords: ["world of games", "wog.ch"] },
    { name: "Pokémon Center", keywords: ["pokemon center", "pokémon center"] },
  ];

  const foundRetailer = retailers.find((retailer) =>
    retailer.keywords.some((keyword) => lower.includes(keyword)),
  );

  if (foundRetailer) {
    return foundRetailer.name;
  }

  const beiMatch = text.match(/\bbei\s+([A-ZÄÖÜa-zäöüß0-9 .&-]{2,40})/);

  if (beiMatch?.[1]) {
    const possibleRetailer = beiMatch[1]
      .split(" für ")[0]
      .split(" ab ")[0]
      .split(" mit ")[0]
      .split(" - ")[0]
      .split("|")[0]
      .trim();

    if (possibleRetailer.length >= 2 && possibleRetailer.length <= 40) {
      return possibleRetailer;
    }
  }

  return "MyDealz";
}

function hasPokemonWord(text: string) {
  const lower = text.toLowerCase();

  return (
    lower.includes("pokemon") ||
    lower.includes("pokémon") ||
    lower.includes("pokmon")
  );
}

function hasForbiddenCardBrand(text: string) {
  const lower = text.toLowerCase();

  const forbiddenWords = [
    "yu-gi-oh",
    "yugioh",
    "yu gi oh",
    "one piece",
    "onepiece",
    "lorcana",
    "magic the gathering",
    "mtg",
    "digimon",
    "dragon ball",
    "dragonball",
    "star wars unlimited",
    "union arena",
    "weiss schwarz",
    "weiss schwarz",
    "final fantasy",
    "flesh and blood",
    "altered tcg",
    "panini",
    "topps",
    "match attax",
    "adrenalyn",
  ];

  return forbiddenWords.some((word) => lower.includes(word));
}

function hasCardWord(text: string) {
  const lower = text.toLowerCase();

  const cardWords = [
    "karten",
    "sammelkarten",
    "booster",
    "display",
    "tcg",
    "top-trainer",
    "top trainer",
    "trainer box",
    "elite trainer",
    "etb",
    "tin",
    "kollektion",
    "collection",
    "bundle",
    "box",
    "blister",
    "sammelkoffer",
    "kampfdeck",
    "ex",
  ];

  return cardWords.some((word) => lower.includes(word));
}

function isPokemonCardDeal(text: string) {
  const lower = text.toLowerCase();

  const excludeWords = [
    "switch",
    "nintendo",
    "plüsch",
    "plush",
    "figur",
    "funko",
    "lego",
    "bettwäsche",
    "poster",
    "shirt",
    "socken",
    "puzzle",
    "monopoly",
    "dvd",
    "blu-ray",
    "spielzeugfigur",
    "bauset",
    "kuscheltier",
  ];

  const hasExcludedWord = excludeWords.some((word) => lower.includes(word));

  return (
    hasPokemonWord(text) &&
    hasCardWord(text) &&
    !hasForbiddenCardBrand(text) &&
    !hasExcludedWord
  );
}

function normalizeUrl(href: string, baseUrl: string) {
  if (href.startsWith("http")) {
    return href.split("?")[0];
  }

  if (href.startsWith("//")) {
    return `https:${href}`.split("?")[0];
  }

  if (href.startsWith("/")) {
    return `${baseUrl}${href}`.split("?")[0];
  }

  return `${baseUrl}/${href}`.split("?")[0];
}

function normalizeMyDealzUrl(href: string) {
  return normalizeUrl(href, "https://www.mydealz.de");
}

function normalizeImageUrl(url: string, baseUrl: string) {
  if (!url) return FALLBACK_IMAGE;

  const cleanedUrl = url
    .replace(/&amp;/g, "&")
    .trim()
    .split(" ")[0];

  if (cleanedUrl.startsWith("//")) {
    return `https:${cleanedUrl}`;
  }

  if (cleanedUrl.startsWith("http")) {
    return cleanedUrl;
  }

  if (cleanedUrl.startsWith("/")) {
    return `${baseUrl}${cleanedUrl}`;
  }

  return FALLBACK_IMAGE;
}

function extractImageFromArticle(articleHtml: string, baseUrl: string) {
  const srcSetMatch =
    articleHtml.match(/<source[^>]+srcset="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+srcset="([^"]+)"/i);

  if (srcSetMatch?.[1]) {
    const firstSrcSetUrl = srcSetMatch[1].split(",")[0]?.trim().split(" ")[0];

    if (firstSrcSetUrl) {
      return normalizeImageUrl(firstSrcSetUrl, baseUrl);
    }
  }

  const imageMatch =
    articleHtml.match(/<img[^>]+data-src="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+data-lazy-src="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+src="([^"]+)"/i) ||
    articleHtml.match(/"image"\s*:\s*"([^"]+)"/i);

  if (imageMatch?.[1]) {
    return normalizeImageUrl(imageMatch[1], baseUrl);
  }

  return FALLBACK_IMAGE;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PokedealradarBot/0.1; +https://pokedealradar.vercel.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Status: ${response.status}`);
  }

  return response.text();
}

function extractMyDealzDealsFromHtml(html: string): ScannerDeal[] {
  const deals: ScannerDeal[] = [];

  const articleRegex = /<article[\s\S]*?<\/article>/gi;
  const articleMatches = Array.from(html.matchAll(articleRegex));

  for (const articleMatch of articleMatches) {
    const articleHtml = articleMatch[0];
    const articleText = cleanText(articleHtml);

    if (!isPokemonCardDeal(articleText)) continue;

    const linkMatches = Array.from(
      articleHtml.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
    );

    const dealLink = linkMatches.find((match) => {
      const href = match[1];
      return href.includes("/deals/") || /-\d{6,}/.test(href);
    });

    if (!dealLink) continue;

    const sourceUrl = normalizeMyDealzUrl(dealLink[1]);

    if (deals.some((deal) => deal.source_url === sourceUrl)) continue;

    let title = cleanText(dealLink[2]);

    if (!title || title.length < 15) {
      const titleMatch =
        articleHtml.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) ||
        articleHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
        articleHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);

      title = titleMatch ? cleanText(titleMatch[1]) : articleText.slice(0, 120);
    }

    if (!title) continue;
    if (!isPokemonCardDeal(`${title} ${articleText}`)) continue;

    deals.push({
      title,
      source_url: sourceUrl,
      retailer: detectRetailer(`${title} ${articleText}`),
      price: extractPrice(articleText),
      category: guessCategory(articleText),
      deal_type: "Online",
      valid_until: "MyDealz-Fund",
      image: extractImageFromArticle(articleHtml, "https://www.mydealz.de"),
      description:
        "Automatisch gefundener Pokémon-Karten-Deal aus der MyDealz-Pokémon-Gruppe. Bitte Preis, Händler und Verfügbarkeit auf MyDealz prüfen.",
    });
  }

  return deals.slice(0, 10);
}

function makeNiceTitleFromUrl(href: string) {
  const withoutQuery = href.split("?")[0];

  const urlPart =
    withoutQuery
      .split("/p/")[0]
      .split("/")
      .filter(Boolean)
      .pop() || "";

  if (!urlPart) return "";

  return decodeURIComponent(urlPart)
    .replace(/-/g, " ")
    .replace(/\bpokemon\b/gi, "Pokémon")
    .replace(/\bpokémon\b/gi, "Pokémon")
    .replace(/\bkarten\b/gi, "Karten")
    .replace(/\bsammelkartenspiel\b/gi, "Sammelkartenspiel")
    .replace(/\btcg\b/gi, "TCG")
    .replace(/\bex\b/gi, "ex")
    .replace(/\bund\b/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictRetailerPokemonTitle(title: string, href: string) {
  const combined = `${title} ${href}`;

  if (!hasPokemonWord(combined)) return false;
  if (hasForbiddenCardBrand(combined)) return false;

  return true;
}

function extractRetailerDealsFromHtml(
  html: string,
  config: RetailerScannerConfig,
): ScannerDeal[] {
  const deals: ScannerDeal[] = [];

  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const linkMatches = Array.from(html.matchAll(linkRegex));

  for (const linkMatch of linkMatches) {
    const href = linkMatch[1];

    if (!href) continue;

    const hrefLower = href.toLowerCase();

    const looksLikeProductUrl =
      hrefLower.includes("pokemon") ||
      hrefLower.includes("pok%C3%A9mon".toLowerCase()) ||
      hrefLower.includes("pok%C3%A9") ||
      hrefLower.includes("/p/") ||
      hrefLower.includes("/product/") ||
      hrefLower.includes("sammelkarten");

    if (!looksLikeProductUrl) continue;

    const sourceUrl = normalizeUrl(href, config.baseUrl);

    if (deals.some((deal) => deal.source_url === sourceUrl)) continue;

    const matchIndex = linkMatch.index ?? html.indexOf(linkMatch[0]);

    const surroundingHtml =
      matchIndex >= 0
        ? html.slice(
            Math.max(0, matchIndex - 3000),
            Math.min(html.length, matchIndex + 6000),
          )
        : linkMatch[0];

    const linkText = cleanText(linkMatch[2]);
    const surroundingText = cleanText(surroundingHtml);

    const titleMatch =
      surroundingHtml.match(/title="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/alt="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/aria-label="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/"name"\s*:\s*"([^"]*Pok[^"]+)"/i);

    let title = titleMatch?.[1]
      ? cleanText(titleMatch[1])
      : linkText.length >= 10
        ? linkText
        : makeNiceTitleFromUrl(href);

    title = title
      .replace(/\bpokemon\b/gi, "Pokémon")
      .replace(/\bkarten\b/gi, "Karten")
      .replace(/\btcg\b/gi, "TCG")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || title.length < 8) continue;

    /*
      Wichtig:
      Bei Händlerseiten prüfen wir jetzt streng nur Titel + URL.
      Dadurch werden Yu-Gi-Oh, One Piece, Lorcana usw. nicht mehr durchgelassen,
      nur weil irgendwo auf der Sammelkarten-Seite auch Pokémon vorkommt.
    */
    if (!isStrictRetailerPokemonTitle(title, href)) continue;

    /*
      Danach prüfen wir zusätzlich, ob Titel oder Umfeld wie ein Kartenprodukt aussieht.
      Aber Pokémon muss weiterhin im Titel oder Link stehen.
    */
    if (!hasCardWord(`${title} ${href} ${surroundingText}`)) continue;

    deals.push({
      title: title.length > 180 ? `${title.slice(0, 177)}...` : title,
      source_url: sourceUrl,
      retailer: config.retailer,
      price: extractPrice(surroundingText),
      category: guessCategory(`${title} ${surroundingText}`),
      deal_type: "Online",
      valid_until: config.validUntil,
      image: extractImageFromArticle(surroundingHtml, config.baseUrl),
      description: config.description,
    });
  }

  return deals.slice(0, 10);
}

async function scanMyDealz(): Promise<ScannerResult> {
  try {
    const html = await fetchHtml("https://www.mydealz.de/gruppe/pokemon");
    const deals = extractMyDealzDealsFromHtml(html);

    return {
      source: "MyDealz",
      deals,
    };
  } catch (error) {
    return {
      source: "MyDealz",
      deals: [],
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

async function scanRetailer(
  config: RetailerScannerConfig,
): Promise<ScannerResult> {
  try {
    const html = await fetchHtml(config.url);
    const deals = extractRetailerDealsFromHtml(html, config);

    return {
      source: config.source,
      deals,
    };
  } catch (error) {
    return {
      source: config.source,
      deals: [],
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

const retailerScanners: RetailerScannerConfig[] = [
  {
    source: "Müller",
    retailer: "Müller",
    url: "https://www.mueller.de/c/spielwaren/spiele-puzzles/spiele/sammelkarten/pokemon/",
    baseUrl: "https://www.mueller.de",
    validUntil: "Müller-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Müller. Bitte Preis und Verfügbarkeit direkt bei Müller prüfen.",
  },
  {
    source: "MediaMarkt",
    retailer: "MediaMarkt",
    url: "https://www.mediamarkt.de/de/search.html?query=pokemon%20karten",
    baseUrl: "https://www.mediamarkt.de",
    validUntil: "MediaMarkt-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von MediaMarkt. Bitte Preis und Verfügbarkeit direkt bei MediaMarkt prüfen.",
  },
  {
    source: "Rossmann",
    retailer: "Rossmann",
    url: "https://www.rossmann.de/de/search/?text=pokemon%20karten",
    baseUrl: "https://www.rossmann.de",
    validUntil: "Rossmann-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Rossmann. Bitte Preis und Verfügbarkeit direkt bei Rossmann prüfen.",
  },
  {
    source: "Netto",
    retailer: "Netto",
    url: "https://www.netto-online.de/suche?text=pokemon%20karten",
    baseUrl: "https://www.netto-online.de",
    validUntil: "Netto-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Netto. Bitte Preis und Verfügbarkeit direkt bei Netto prüfen.",
  },
  {
    source: "Kaufland",
    retailer: "Kaufland",
    url: "https://www.kaufland.de/s/?search_value=pokemon%20karten",
    baseUrl: "https://www.kaufland.de",
    validUntil: "Kaufland-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Kaufland. Bitte Preis, Verkäufer und Verfügbarkeit direkt bei Kaufland prüfen.",
  },
  {
    source: "REWE",
    retailer: "REWE",
    url: "https://www.rewe.de/suche/produkte?search=pokemon%20karten",
    baseUrl: "https://www.rewe.de",
    validUntil: "REWE-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von REWE. Bitte Preis und Verfügbarkeit direkt bei REWE prüfen.",
  },
  {
    source: "Lidl",
    retailer: "Lidl",
    url: "https://www.lidl.de/q/search?q=pokemon%20karten",
    baseUrl: "https://www.lidl.de",
    validUntil: "Lidl-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Lidl. Bitte Preis und Verfügbarkeit direkt bei Lidl prüfen.",
  },
  {
    source: "Aldi",
    retailer: "Aldi",
    url: "https://www.aldi-onlineshop.de/suche?text=pokemon%20karten",
    baseUrl: "https://www.aldi-onlineshop.de",
    validUntil: "Aldi-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Aldi. Bitte Preis und Verfügbarkeit direkt bei Aldi prüfen.",
  },
];

export async function POST(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const scannerResults = await Promise.all([
    scanMyDealz(),
    ...retailerScanners.map((scanner) => scanRetailer(scanner)),
  ]);

  const foundDeals = scannerResults.flatMap((result) => result.deals);

  if (foundDeals.length === 0) {
    const errorMessages = scannerResults
      .filter((result) => result.error)
      .map((result) => `${result.source}: ${result.error}`)
      .join(" | ");

    const sourceSummary = scannerResults
      .map((result) => {
        if (result.error) {
          return `${result.source}: Fehler ${result.error}`;
        }

        return `${result.source}: ${result.deals.length} gefunden`;
      })
      .join(" | ");

    return NextResponse.json({
      success: true,
      inserted: 0,
      skipped: 0,
      message: errorMessages
        ? `Scanner lief durch, aber es wurden keine Deals gefunden. Fehler: ${errorMessages}. ${sourceSummary}`
        : `Scanner lief durch, aber es wurden keine passenden Pokémon-Karten-Deals gefunden. ${sourceSummary}`,
      sources: scannerResults.map((result) => ({
        source: result.source,
        found: result.deals.length,
        error: result.error ?? null,
      })),
    });
  }

  let inserted = 0;
  let skipped = 0;

  for (const deal of foundDeals) {
    const { data: existingOffer, error: existingError } = await supabaseAdmin
      .from("offers")
      .select("id")
      .eq("source_url", deal.source_url)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 },
      );
    }

    if (existingOffer) {
      skipped++;
      continue;
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    inserted++;
  }

  const sourceSummary = scannerResults
    .map((result) => {
      if (result.error) {
        return `${result.source}: Fehler ${result.error}`;
      }

      return `${result.source}: ${result.deals.length} gefunden`;
    })
    .join(" | ");

  return NextResponse.json({
    success: true,
    inserted,
    skipped,
    message: `Scanner fertig. ${inserted} neue Deals gespeichert, ${skipped} übersprungen. ${sourceSummary}`,
    sources: scannerResults.map((result) => ({
      source: result.source,
      found: result.deals.length,
      error: result.error ?? null,
    })),
  });
}