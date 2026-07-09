export type Offer = {
  id: number;
  title: string;
  retailer: string;
  price: string;
  category: string;
  validUntil: string;
  image: string;
  sourceUrl: string;
  dealType: "Online" | "Lokal";
  createdAt: string;
  description: string;
};

export const defaultOffers: Offer[] = [
  {
    id: 1,
    title: "Pokémon Karmesin & Purpur Booster",
    retailer: "Müller",
    price: "3,99 €",
    category: "Booster",
    validUntil: "Nur solange der Vorrat reicht",
    image:
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?q=80&w=1200&auto=format&fit=crop",
    sourceUrl: "https://www.mueller.de/",
    dealType: "Lokal",
    createdAt: "2026-07-09",
    description:
      "Beispiel-Angebot für ein Pokémon Booster Pack im stationären Handel.",
  },
  {
    id: 2,
    title: "Pokémon Top-Trainer-Box",
    retailer: "Smyths Toys",
    price: "39,99 €",
    category: "ETB",
    validUntil: "Online-Angebot",
    image:
      "https://images.unsplash.com/photo-1628968434441-f9c8f0a8b7d5?q=80&w=1200&auto=format&fit=crop",
    sourceUrl: "https://www.smythstoys.com/",
    dealType: "Online",
    createdAt: "2026-07-09",
    description:
      "Beispiel-Angebot für eine Pokémon Top-Trainer-Box beziehungsweise Elite Trainer Box.",
  },
  {
    id: 3,
    title: "Pokémon Sammelkarten Kollektion",
    retailer: "MediaMarkt",
    price: "24,99 €",
    category: "Kollektion",
    validUntil: "Diese Woche",
    image:
      "https://images.unsplash.com/photo-1606503153255-59d8b8b82176?q=80&w=1200&auto=format&fit=crop",
    sourceUrl: "https://www.mediamarkt.de/",
    dealType: "Online",
    createdAt: "2026-07-08",
    description:
      "Beispiel-Angebot für eine Pokémon Sammelkarten-Kollektion.",
  },
  {
    id: 4,
    title: "Pokémon Mini Tin",
    retailer: "Saturn",
    price: "9,99 €",
    category: "Tins",
    validUntil: "Online verfügbar",
    image:
      "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1200&auto=format&fit=crop",
    sourceUrl: "https://www.saturn.de/",
    dealType: "Online",
    createdAt: "2026-07-07",
    description: "Beispiel-Angebot für eine Pokémon Mini Tin.",
  },
  {
    id: 5,
    title: "Pokémon Display Box",
    retailer: "GameStop",
    price: "129,99 €",
    category: "Displays",
    validUntil: "Limitierter Vorrat",
    image:
      "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?q=80&w=1200&auto=format&fit=crop",
    sourceUrl: "https://www.gamestop.de/",
    dealType: "Online",
    createdAt: "2026-07-06",
    description:
      "Beispiel-Angebot für ein Pokémon Display beziehungsweise eine größere Booster-Box.",
  },
];