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
    <main className="min-h-screen px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <header className="poke-hero mb-8 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
                PokéDealRadar
              </p>

              <h1 className="poke-title text-4xl sm:text-6xl">
                Pokémon-Karten Deals
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
                Finde aktuelle Pokémon-Karten-Angebote aus verschiedenen Quellen.
                Durchsuche Händler, filtere nach Preis und entdecke neue Booster,
                ETBs, Displays und Kollektionen schneller.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="poke-badge poke-badge-gold">
                  {offers.length} Angebote gesamt
                </span>

                <span className="poke-badge poke-badge-dark">
                  Schneller Deal-Überblick
                </span>

                <span className="poke-badge poke-badge-dark">
                  Nur Pokémon-Karten
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="poke-button poke-button-primary px-5 py-3"
              >
                Adminbereich
              </Link>
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {message}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="poke-panel p-5">
              <div className="relative z-10">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-400">
                  Filter
                </p>

                <h2 className="font-poke mt-2 text-2xl text-white">
                  Deals eingrenzen
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Suche gezielt nach Händler, Produkttyp und Preis.
                </p>

                <div className="poke-divider my-5" />

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-zinc-300">
                      Suche
                    </label>
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="z. B. Booster, ETB..."
                      className="poke-input"
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
                      className="poke-select"
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
                      className="poke-select"
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
                      className="poke-select"
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
                        className="poke-input"
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
                        className="poke-input"
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
                      className="poke-select"
                    >
                      <option value="newest">Neueste zuerst</option>
                      <option value="price-asc">Preis aufsteigend</option>
                      <option value="price-desc">Preis absteigend</option>
                    </select>
                  </div>

                  <button
                    onClick={resetFilters}
                    className="poke-button poke-button-secondary w-full px-4 py-3"
                  >
                    Filter zurücksetzen
                  </button>
                </div>
              </div>
            </section>
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-300">
                  {loading
                    ? "Lade Angebote..."
                    : `${filteredOffers.length} von ${offers.length} Angeboten gefunden`}
                </p>

                {(minPrice || maxPrice) && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Angebote ohne sauber erkannten Preis werden bei Preisfiltern
                    ausgeblendet.
                  </p>
                )}
              </div>
            </div>

            {loading ? (
              <div className="poke-panel p-8 text-zinc-400">
                Angebote werden geladen...
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="poke-panel p-8 text-zinc-400">
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
                      className="poke-card group"
                    >
                      <div
                        className="poke-card-image"
                        style={{ backgroundImage: `url(${offer.image})` }}
                      >
                        <div className="absolute left-4 top-4 z-10 flex gap-2">
                          {isNewOffer(offer.created_at) && (
                            <span className="poke-badge poke-badge-gold">
                              Neu
                            </span>
                          )}
                        </div>

                        <div className="absolute right-4 top-4 z-10">
                          <span className="poke-badge poke-badge-dark">
                            {offer.deal_type}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="poke-badge poke-badge-gold">
                            {offer.category}
                          </span>

                          <span className="poke-badge poke-badge-dark">
                            {offer.retailer}
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-xl font-black text-white transition group-hover:text-yellow-400">
                          {offer.title}
                        </h2>

                        <p className="poke-price mt-4 text-3xl">
                          {offer.price}
                        </p>

                        {parsedPrice === null && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Kein sauberer Preis erkannt
                          </p>
                        )}

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
                          {offer.description}
                        </p>

                        <div className="poke-divider my-4" />

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-zinc-500">
                            Gültigkeit: {offer.valid_until}
                          </p>

                          <span className="poke-button poke-button-primary px-4 py-2 text-sm">
                            Zum Deal
                          </span>
                        </div>
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