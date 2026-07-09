"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Offer = {
  id: number;
  title: string;
  retailer: string;
  price: string;
  category: string;
  valid_until: string;
  image: string;
  source_url: string;
  deal_type: "Online" | "Lokal";
  created_at: string;
  description: string;
  inserted_at?: string;
};

type SortMode = "newest" | "price-asc" | "price-desc";

function parsePrice(priceText: string) {
  if (!priceText) return null;

  const match = priceText.match(/\d{1,4}(?:[,.]\d{1,2})?/);

  if (!match) return null;

  const value = Number(match[0].replace(",", "."));

  if (Number.isNaN(value)) return null;

  return value;
}

function isNewOffer(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();

  const diffInMs = now.getTime() - createdDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return diffInDays <= 3;
}

export default function HomePage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Alle");
  const [selectedRetailer, setSelectedRetailer] = useState("Alle");
  const [selectedDealType, setSelectedDealType] = useState("Alle");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("inserted_at", { ascending: false });

    if (error) {
      setMessage(`Fehler beim Laden: ${error.message}`);
      setOffers([]);
    } else {
      setOffers(data ?? []);
    }

    setLoading(false);
  }

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(offers.map((offer) => offer.category).filter(Boolean)),
    );

    return ["Alle", ...uniqueCategories];
  }, [offers]);

  const retailers = useMemo(() => {
    const uniqueRetailers = Array.from(
      new Set(offers.map((offer) => offer.retailer).filter(Boolean)),
    );

    return ["Alle", ...uniqueRetailers];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const min = minPrice ? Number(minPrice.replace(",", ".")) : null;
    const max = maxPrice ? Number(maxPrice.replace(",", ".")) : null;

    return offers
      .filter((offer) => {
        const searchText =
          `${offer.title} ${offer.retailer} ${offer.category} ${offer.description}`.toLowerCase();

        const searchMatches = searchText.includes(searchTerm.toLowerCase());

        const categoryMatches =
          selectedCategory === "Alle" || offer.category === selectedCategory;

        const retailerMatches =
          selectedRetailer === "Alle" || offer.retailer === selectedRetailer;

        const dealTypeMatches =
          selectedDealType === "Alle" || offer.deal_type === selectedDealType;

        const parsedPrice = parsePrice(offer.price);

        const minMatches =
          min === null || (parsedPrice !== null && parsedPrice >= min);

        const maxMatches =
          max === null || (parsedPrice !== null && parsedPrice <= max);

        return (
          searchMatches &&
          categoryMatches &&
          retailerMatches &&
          dealTypeMatches &&
          minMatches &&
          maxMatches
        );
      })
      .sort((a, b) => {
        if (sortMode === "price-asc") {
          const priceA = parsePrice(a.price);
          const priceB = parsePrice(b.price);

          if (priceA === null && priceB === null) return 0;
          if (priceA === null) return 1;
          if (priceB === null) return -1;

          return priceA - priceB;
        }

        if (sortMode === "price-desc") {
          const priceA = parsePrice(a.price);
          const priceB = parsePrice(b.price);

          if (priceA === null && priceB === null) return 0;
          if (priceA === null) return 1;
          if (priceB === null) return -1;

          return priceB - priceA;
        }

        const dateA = new Date(a.inserted_at || a.created_at).getTime();
        const dateB = new Date(b.inserted_at || b.created_at).getTime();

        return dateB - dateA;
      });
  }, [
    offers,
    searchTerm,
    selectedCategory,
    selectedRetailer,
    selectedDealType,
    minPrice,
    maxPrice,
    sortMode,
  ]);

  function resetFilters() {
    setSearchTerm("");
    setSelectedCategory("Alle");
    setSelectedRetailer("Alle");
    setSelectedDealType("Alle");
    setMinPrice("");
    setMaxPrice("");
    setSortMode("newest");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-400">
              PokéDealRadar
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Pokémon-Karten Deals
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Finde aktuelle Pokémon-Karten-Angebote aus verschiedenen Quellen.
              Preise und Verfügbarkeit bitte immer beim Händler prüfen.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-2xl border border-yellow-400 px-5 py-3 font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950"
          >
            Adminbereich
          </Link>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {message}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
                  Filter
                </p>
                <h2 className="mt-1 text-2xl font-black">Deals eingrenzen</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Sortiere nach Händler, Preis, Kategorie und Deal-Art.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Suche
                  </label>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="z. B. Booster, ETB..."
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Kategorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Händler
                  </label>
                  <select
                    value={selectedRetailer}
                    onChange={(event) =>
                      setSelectedRetailer(event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  >
                    {retailers.map((retailer) => (
                      <option key={retailer}>{retailer}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Deal-Art
                  </label>
                  <select
                    value={selectedDealType}
                    onChange={(event) =>
                      setSelectedDealType(event.target.value)
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  >
                    <option>Alle</option>
                    <option>Online</option>
                    <option>Lokal</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-300">
                      Mindestpreis
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="z. B. 5"
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-300">
                      Maximalpreis
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="z. B. 30"
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">
                    Sortierung
                  </label>
                  <select
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(event.target.value as SortMode)
                    }
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  >
                    <option value="newest">Neueste zuerst</option>
                    <option value="price-asc">Preis aufsteigend</option>
                    <option value="price-desc">Preis absteigend</option>
                  </select>
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-zinc-700 px-4 py-3 font-bold text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </section>
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  {loading
                    ? "Lade Angebote..."
                    : `${filteredOffers.length} von ${offers.length} Angeboten gefunden`}
                </p>

                {(minPrice || maxPrice || selectedRetailer !== "Alle") && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Angebote ohne sauber erkannten Preis werden bei Preisfiltern
                    automatisch ausgeblendet.
                  </p>
                )}
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
                Angebote werden geladen...
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
                Keine passenden Angebote gefunden.
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredOffers.map((offer) => {
                  const parsedPrice = parsePrice(offer.price);

                  return (
                    <Link
                      key={offer.id}
                      href={`/angebot/${offer.id}`}
                      className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl transition hover:-translate-y-1 hover:border-yellow-400"
                    >
                      <div
                        className="relative h-56 bg-cover bg-center"
                        style={{ backgroundImage: `url(${offer.image})` }}
                      >
                        {isNewOffer(offer.created_at) && (
                          <span className="absolute left-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-zinc-950">
                            NEU
                          </span>
                        )}

                        <span className="absolute right-4 top-4 rounded-full bg-zinc-950/80 px-3 py-1 text-xs font-bold text-white">
                          {offer.deal_type}
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-zinc-950">
                            {offer.category}
                          </span>

                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                            {offer.retailer}
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-xl font-black group-hover:text-yellow-400">
                          {offer.title}
                        </h2>

                        <p className="mt-4 text-3xl font-black text-yellow-400">
                          {offer.price}
                        </p>

                        {parsedPrice === null && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Kein sauberer Preis erkannt
                          </p>
                        )}

                        <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                          {offer.description}
                        </p>

                        <p className="mt-4 text-xs text-zinc-500">
                          Gültigkeit: {offer.valid_until}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}