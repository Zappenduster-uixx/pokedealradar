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
    .replace(/&#034;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&euro;/g, "€")
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
    lower.includes("premium collection") ||
    lower.includes("premium-kollektion") ||
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
    { name: "Elbenwald", keywords: ["elbenwald"] },
    { name: "Thalia", keywords: ["thalia"] },
    { name: "LottiCards", keywords: ["lotticards", "lotti cards"] },
    { name: "God of Cards", keywords: ["godofcards", "god of cards"] },
    { name: "Gate to the Games", keywords: ["gate to the games", "gttg"] },
    { name: "FantasyWelt", keywords: ["fantasywelt", "fantasy welt"] },
    { name: "Toynova", keywords: ["toynova"] },
    { name: "Coolshop", keywords: ["coolshop"] },
    { name: "Otto", keywords: ["otto.de", " otto "] },
    { name: "GameStop", keywords: ["gamestop", "game stop"] },
    { name: "eBay", keywords: ["ebay"] },
    { name: "Cardmarket", keywords: ["cardmarket"] },
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
    lower.includes("pokmon") ||
    lower.includes("pok%c3%a9mon") ||
    lower.includes("pok%C3%A9mon".toLowerCase())
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
    "weiß schwarz",
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

function hasForbiddenToyWord(text: string) {
  const lower = text.toLowerCase();

  const forbiddenWords = [
    "lego",
    "bauset",
    "bausteine",
    "mega construx",
    "mega pokémon",
    "mega pokemon",
    "plüsch",
    "plush",
    "kuscheltier",
    "squishmallow",
    "figur",
    "figuren",
    "actionfigur",
    "spielzeugfigur",
    "funko",
    "pop!",
    "poster",
    "bettwäsche",
    "shirt",
    "t-shirt",
    "socken",
    "puzzle",
    "monopoly",
    "dvd",
    "blu-ray",
    "switch",
    "nintendo switch",
    "spiel",
    "brettspiel",
    "adventskalender",
    "stickerbuch",
    "malbuch",
    "brotdose",
    "trinkflasche",
    "rucksack",
    "tasche",
    "lampe",
    "wecker",
  ];

  return forbiddenWords.some((word) => lower.includes(word));
}

function hasStrictCardWord(text: string) {
  const lower = text.toLowerCase();

  const strictCardWords = [
    "pokemon karten",
    "pokémon karten",
    "pokemon-karte",
    "pokémon-karte",
    "pokemon sammlekarten",
    "pokemon sammelkarten",
    "pokémon sammelkarten",
    "sammelkarten",
    "sammelkarte",
    "booster",
    "boosterpack",
    "booster pack",
    "display",
    "top-trainer",
    "top trainer",
    "trainer box",
    "elite trainer box",
    "etb",
    "tcg",
    "trading card",
    "trading cards",
    "blister",
    "mini tin",
    "tin-box",
    "tin box",
    "kampfdeck",
    "deck",
    "starter deck",
    "premium-kollektion",
    "premium collection",
    "kollektion",
    "collection",
    "sammelkoffer",
  ];

  return strictCardWords.some((word) => lower.includes(word));
}

function isPokemonCardDeal(text: string) {
  return (
    hasPokemonWord(text) &&
    hasStrictCardWord(text) &&
    !hasForbiddenCardBrand(text) &&
    !hasForbiddenToyWord(text)
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
    .replace(/\\\//g, "/")
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
    articleHtml.match(/"image"\s*:\s*"([^"]+)"/i) ||
    articleHtml.match(/"imageUrl"\s*:\s*"([^"]+)"/i) ||
    articleHtml.match(/"thumbnail"\s*:\s*"([^"]+)"/i);

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
    .replace(/_/g, " ")
    .replace(/\bpokemon\b/gi, "Pokémon")
    .replace(/\bpokémon\b/gi, "Pokémon")
    .replace(/\bkarten\b/gi, "Karten")
    .replace(/\bsammelkartenspiel\b/gi, "Sammelkartenspiel")
    .replace(/\btcg\b/gi, "TCG")
    .replace(/\bund\b/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictRetailerPokemonTitle(title: string, href: string) {
  const combined = `${title} ${href}`;

  return (
    hasPokemonWord(combined) &&
    hasStrictCardWord(combined) &&
    !hasForbiddenCardBrand(combined) &&
    !hasForbiddenToyWord(combined)
  );
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

    const linkText = cleanText(linkMatch[2]);
    const titleFromUrl = makeNiceTitleFromUrl(href);
    const preliminaryCandidate = `${href} ${linkText} ${titleFromUrl}`;

    /*
      Ganz wichtig:
      Händlerseiten werden jetzt bereits vor dem Umfeld-Scan streng geprüft.
      Wenn Link, Linktext oder URL-Titel nicht nach Pokémon-Karten aussehen,
      wird der Treffer ignoriert.
    */
    if (!isPokemonCardDeal(preliminaryCandidate)) continue;

    const sourceUrl = normalizeUrl(href, config.baseUrl);

    if (deals.some((deal) => deal.source_url === sourceUrl)) continue;

    const matchIndex = linkMatch.index ?? html.indexOf(linkMatch[0]);

    const surroundingHtml =
      matchIndex >= 0
        ? html.slice(
            Math.max(0, matchIndex - 2500),
            Math.min(html.length, matchIndex + 4500),
          )
        : linkMatch[0];

    const surroundingText = cleanText(surroundingHtml);

    const titleMatch =
      surroundingHtml.match(/title="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/alt="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/aria-label="([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/"name"\s*:\s*"([^"]*Pok[^"]+)"/i) ||
      surroundingHtml.match(/"title"\s*:\s*"([^"]*Pok[^"]+)"/i);

    let title = titleMatch?.[1]
      ? cleanText(titleMatch[1])
      : linkText.length >= 10
        ? linkText
        : titleFromUrl;

    title = title
      .replace(/\bpokemon\b/gi, "Pokémon")
      .replace(/\bpokémon\b/gi, "Pokémon")
      .replace(/\bkarten\b/gi, "Karten")
      .replace(/\btcg\b/gi, "TCG")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || title.length < 8) continue;

    /*
      Finale Prüfung nur mit Titel + Link.
      Das Umfeld darf den Treffer nicht mehr retten.
      Dadurch fliegen LEGO, Figuren und normales Spielzeug zuverlässig raus.
    */
    if (!isStrictRetailerPokemonTitle(title, href)) continue;

    /*
      Umfeld darf nur noch für Preis, Bild und Kategorie genutzt werden,
      nicht mehr für die Entscheidung, ob es ein Pokémon-Kartenprodukt ist.
    */
    deals.push({
      title: title.length > 180 ? `${title.slice(0, 177)}...` : title,
      source_url: sourceUrl,
      retailer: config.retailer,
      price: extractPrice(surroundingText),
      category: guessCategory(`${title} ${href}`),
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
  {
    source: "Elbenwald",
    retailer: "Elbenwald",
    url: "https://www.elbenwald.de/pokemon/sammelkarten",
    baseUrl: "https://www.elbenwald.de",
    validUntil: "Elbenwald-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Elbenwald. Bitte Preis und Verfügbarkeit direkt bei Elbenwald prüfen.",
  },
  {
    source: "Thalia",
    retailer: "Thalia",
    url: "https://www.thalia.de/kategorie/sammelkarten-34316/",
    baseUrl: "https://www.thalia.de",
    validUntil: "Thalia-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Thalia. Bitte Preis und Verfügbarkeit direkt bei Thalia prüfen.",
  },
  {
    source: "LottiCards",
    retailer: "LottiCards",
    url: "https://www.lotticards.de/pokemon-sammelkarten",
    baseUrl: "https://www.lotticards.de",
    validUntil: "LottiCards-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von LottiCards. Bitte Preis und Verfügbarkeit direkt bei LottiCards prüfen.",
  },
  {
    source: "God of Cards",
    retailer: "God of Cards",
    url: "https://godofcards.com/en-nl/collections/pokemon-cards",
    baseUrl: "https://godofcards.com",
    validUntil: "God-of-Cards-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von God of Cards. Bitte Preis und Verfügbarkeit direkt bei God of Cards prüfen.",
  },
  {
    source: "Gate to the Games",
    retailer: "Gate to the Games",
    url: "https://www.gate-to-the-games.de/",
    baseUrl: "https://www.gate-to-the-games.de",
    validUntil: "Gate-to-the-Games-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Gate to the Games. Bitte Preis und Verfügbarkeit direkt bei Gate to the Games prüfen.",
  },
  {
    source: "FantasyWelt",
    retailer: "FantasyWelt",
    url: "https://www.fantasywelt.de/Pokemon-DEEN_1",
    baseUrl: "https://www.fantasywelt.de",
    validUntil: "FantasyWelt-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von FantasyWelt. Bitte Preis und Verfügbarkeit direkt bei FantasyWelt prüfen.",
  },
  {
    source: "Toynova",
    retailer: "Toynova",
    url: "https://www.toynova.de/pokemon",
    baseUrl: "https://www.toynova.de",
    validUntil: "Toynova-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Toynova. Bitte Preis und Verfügbarkeit direkt bei Toynova prüfen.",
  },
  {
    source: "Coolshop",
    retailer: "Coolshop",
    url: "https://www.coolshop.nl/s/merk%3Dpokemon%2Cpokemon/",
    baseUrl: "https://www.coolshop.nl",
    validUntil: "Coolshop-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Coolshop. Bitte Preis und Verfügbarkeit direkt bei Coolshop prüfen.",
  },
  {
    source: "Otto",
    retailer: "Otto",
    url: "https://www.otto.de/spielzeug/spiele/sammelkarten/?marke=_pokemon",
    baseUrl: "https://www.otto.de",
    validUntil: "Otto-Fund",
    description:
      "Automatisch gefundener Pokémon-Karten-Artikel von Otto. Bitte Preis, Verkäufer und Verfügbarkeit direkt bei Otto prüfen.",
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