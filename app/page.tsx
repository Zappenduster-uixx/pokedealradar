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
};

const filters = ["Alle", "Booster", "ETB", "Tins", "Kollektion", "Displays"];
const dealTypeFilters = ["Alle", "Online", "Lokal"];

function isNewOffer(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();

  const differenceInMs = now.getTime() - createdDate.getTime();
  const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);

  return differenceInDays <= 3;
}

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [activeRetailer, setActiveRetailer] = useState("Alle Händler");
  const [activeDealType, setActiveDealType] = useState("Alle");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadOffers() {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden:", error.message);
      } else {
        setOffers(data ?? []);
      }

      setLoading(false);
    }

    loadOffers();
  }, []);

  const retailers = useMemo(() => {
    const uniqueRetailers = Array.from(
      new Set(offers.map((offer) => offer.retailer)),
    );

    return ["Alle Händler", ...uniqueRetailers];
  }, [offers]);

  const filteredOffers = offers.filter((offer) => {
    const matchesCategory =
      activeFilter === "Alle" || offer.category === activeFilter;

    const matchesRetailer =
      activeRetailer === "Alle Händler" || offer.retailer === activeRetailer;

    const matchesDealType =
      activeDealType === "Alle" || offer.deal_type === activeDealType;

    const search = searchTerm.toLowerCase();

    const matchesSearch =
      offer.title.toLowerCase().includes(search) ||
      offer.retailer.toLowerCase().includes(search) ||
      offer.category.toLowerCase().includes(search) ||
      offer.price.toLowerCase().includes(search) ||
      offer.valid_until.toLowerCase().includes(search) ||
      offer.deal_type.toLowerCase().includes(search) ||
      offer.description.toLowerCase().includes(search);

    return matchesCategory && matchesRetailer && matchesDealType && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-400">
              Pokémon Karten Deals
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              PokéDealRadar
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-300">
              Aktuelle Angebote für Pokémon-Karten, Booster, Top-Trainer-Boxen,
              Tins und Kollektionen aus Online-Shops und Prospekten.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-2xl border border-yellow-400 px-5 py-3 font-bold text-yellow-400 hover:bg-yellow-400 hover:text-zinc-950"
          >
            Angebot eintragen
          </Link>
        </div>

        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
          <label className="mb-2 block text-sm font-semibold text-zinc-300">
            Angebot suchen
          </label>

          <input
            type="text"
            placeholder="Suche nach Booster, Müller, ETB, Display..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
          />
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Kategorie</p>

          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={
                  activeFilter === filter
                    ? "rounded-full border border-yellow-400 bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950"
                    : "rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-yellow-400 hover:text-yellow-400"
                }
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Händler</p>

          <div className="flex flex-wrap gap-3">
            {retailers.map((retailer) => (
              <button
                key={retailer}
                onClick={() => setActiveRetailer(retailer)}
                className={
                  activeRetailer === retailer
                    ? "rounded-full border border-yellow-400 bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950"
                    : "rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-yellow-400 hover:text-yellow-400"
                }
              >
                {retailer}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Deal-Art</p>

          <div className="flex flex-wrap gap-3">
            {dealTypeFilters.map((dealType) => (
              <button
                key={dealType}
                onClick={() => setActiveDealType(dealType)}
                className={
                  activeDealType === dealType
                    ? "rounded-full border border-yellow-400 bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950"
                    : "rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-yellow-400 hover:text-yellow-400"
                }
              >
                {dealType}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <p>
            {loading
              ? "Lade Angebote..."
              : `${filteredOffers.length} Angebot${filteredOffers.length === 1 ? "" : "e"} gefunden`}
          </p>

          {(searchTerm ||
            activeFilter !== "Alle" ||
            activeRetailer !== "Alle Händler" ||
            activeDealType !== "Alle") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setActiveFilter("Alle");
                setActiveRetailer("Alle Händler");
                setActiveDealType("Alle");
              }}
              className="text-yellow-400 hover:text-yellow-300"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        {!loading && filteredOffers.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-lg font-semibold">Keine Angebote gefunden.</p>
            <p className="mt-2 text-zinc-400">
              Für deine Suche gibt es aktuell noch keine Einträge.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOffers.map((offer) => (
              <Link
                key={offer.id}
                href={`/angebot/${offer.id}`}
                className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl transition hover:-translate-y-1 hover:border-yellow-400"
              >
                <div
                  className="relative h-48 bg-cover bg-center"
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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-zinc-950">
                      {offer.category}
                    </span>

                    <span className="text-sm text-zinc-400">
                      {offer.retailer}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold">{offer.title}</h2>

                  <p className="mt-3 text-3xl font-black text-yellow-400">
                    {offer.price}
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    {offer.valid_until}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm text-zinc-500">
                    {offer.description}
                  </p>

                  <div className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-4 py-3 font-bold text-zinc-950">
                    Details ansehen
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}