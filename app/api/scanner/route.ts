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
    lower.includes("box")
  ) {
    return "Kollektion";
  }

  return "Booster";
}

function extractPrice(text: string) {
  const normalized = text.replace(/\s+/g, " ");

  const pricePatterns = [
    /\d{1,4}[,.]\d{2}\s?€/,
    /\d{1,4}\s?€/,
    /€\s?\d{1,4}[,.]\d{2}/,
  ];

  for (const pattern of pricePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      return match[0].replace(".", ",").trim();
    }
  }

  return "Preis auf MyDealz prüfen";
}

function detectRetailer(text: string) {
  const lower = text.toLowerCase();

  const retailers = [
    { name: "Smyths Toys", keywords: ["smyths", "smythstoys"] },
    { name: "Müller", keywords: ["müller", "mueller"] },
    { name: "Amazon", keywords: ["amazon"] },
    { name: "MediaMarkt", keywords: ["mediamarkt", "media markt"] },
    { name: "Saturn", keywords: ["saturn"] },
    { name: "GameStop", keywords: ["gamestop", "game stop"] },
    { name: "eBay", keywords: ["ebay"] },
    { name: "Cardmarket", keywords: ["cardmarket"] },
    { name: "Thalia", keywords: ["thalia"] },
    { name: "Rossmann", keywords: ["rossmann"] },
    { name: "dm", keywords: ["dm-drogerie", "dm drogerie", "dm.de"] },
    { name: "Lidl", keywords: ["lidl"] },
    { name: "Aldi", keywords: ["aldi"] },
    { name: "Kaufland", keywords: ["kaufland"] },
    { name: "REWE", keywords: ["rewe"] },
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

function isPokemonCardDeal(text: string) {
  const lower = text.toLowerCase();

  const hasPokemon = lower.includes("pokemon") || lower.includes("pokémon");

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
  ];

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
  ];

  const hasCardWord = cardWords.some((word) => lower.includes(word));
  const hasExcludedWord = excludeWords.some((word) => lower.includes(word));

  return hasPokemon && hasCardWord && !hasExcludedWord;
}

function normalizeMyDealzUrl(href: string) {
  if (href.startsWith("http")) {
    return href.split("?")[0];
  }

  return `https://www.mydealz.de${href}`.split("?")[0];
}

function normalizeImageUrl(url: string) {
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
    return `https://www.mydealz.de${cleanedUrl}`;
  }

  return FALLBACK_IMAGE;
}

function extractImageFromArticle(articleHtml: string) {
  const srcSetMatch =
    articleHtml.match(/<source[^>]+srcset="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+srcset="([^"]+)"/i);

  if (srcSetMatch?.[1]) {
    const firstSrcSetUrl = srcSetMatch[1].split(",")[0]?.trim().split(" ")[0];

    if (firstSrcSetUrl) {
      return normalizeImageUrl(firstSrcSetUrl);
    }
  }

  const imageMatch =
    articleHtml.match(/<img[^>]+data-src="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+data-lazy-src="([^"]+)"/i) ||
    articleHtml.match(/<img[^>]+src="([^"]+)"/i);

  if (imageMatch?.[1]) {
    return normalizeImageUrl(imageMatch[1]);
  }

  return FALLBACK_IMAGE;
}

function extractDealsFromHtml(html: string): ScannerDeal[] {
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

    if (!title || !isPokemonCardDeal(`${title} ${articleText}`)) continue;

    deals.push({
      title,
      source_url: sourceUrl,
      retailer: detectRetailer(`${title} ${articleText}`),
      price: extractPrice(articleText),
      category: guessCategory(articleText),
      deal_type: "Online",
      valid_until: "MyDealz-Fund",
      image: extractImageFromArticle(articleHtml),
      description:
        "Automatisch gefundener Pokémon-Karten-Deal aus der MyDealz-Pokémon-Gruppe. Bitte Preis, Händler und Verfügbarkeit auf MyDealz prüfen.",
    });
  }

  return deals.slice(0, 10);
}

export async function POST(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const searchUrl = "https://www.mydealz.de/gruppe/pokemon";

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PokedealradarBot/0.1; +https://pokedealradar.vercel.app)",
      Accept: "text/html",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `MyDealz konnte nicht geladen werden. Status: ${response.status}`,
      },
      { status: 500 },
    );
  }

  const html = await response.text();
  const foundDeals = extractDealsFromHtml(html);

  if (foundDeals.length === 0) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      skipped: 0,
      message:
        "Scanner lief durch, aber es wurden keine passenden Pokémon-Karten-Deals gefunden.",
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

  return NextResponse.json({
    success: true,
    inserted,
    skipped,
    message: `Scanner fertig. ${inserted} neue Deals gespeichert, ${skipped} übersprungen.`,
  });
}