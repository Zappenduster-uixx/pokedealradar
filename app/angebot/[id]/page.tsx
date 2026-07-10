"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

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

function parseDate(dateText: string) {
  if (!dateText) return "Unbekannt";

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function OfferDetailPage() {
  const params = useParams();
  const offerId = Number(params.id);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadOffer() {
      setLoading(true);
      setMessage("");

      if (!offerId || Number.isNaN(offerId)) {
        setMessage("Ungültige Angebots-ID.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .maybeSingle();

      if (error) {
        setMessage(`Fehler beim Laden: ${error.message}`);
        setOffer(null);
      } else {
        setOffer(data);
      }

      setLoading(false);
    }

    loadOffer();
  }, [offerId]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 text-white">
        <section className="mx-auto max-w-5xl">
          <div className="poke-panel p-8 text-zinc-400">
            Angebot wird geladen...
          </div>
        </section>
      </main>
    );
  }

  if (message || !offer) {
    return (
      <main className="min-h-screen px-4 py-8 text-white">
        <section className="mx-auto max-w-5xl">
          <div className="poke-panel p-8">
            <p className="text-red-300">
              {message || "Angebot nicht gefunden."}
            </p>

            <Link
              href="/"
              className="poke-button poke-button-primary mt-6 px-5 py-3"
            >
              Zurück zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="poke-button poke-button-secondary px-5 py-3">
            Zurück
          </Link>

          <Link
            href="/admin"
            className="poke-button poke-button-primary px-5 py-3"
          >
            Adminbereich
          </Link>
        </div>

        <article className="poke-panel overflow-hidden">
          <div
            className="h-[280px] bg-cover bg-center sm:h-[420px]"
            style={{ backgroundImage: `url(${offer.image})` }}
          />

          <div className="relative z-10 p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap gap-3">
              <span className="poke-badge poke-badge-gold">
                {offer.category}
              </span>

              <span className="poke-badge poke-badge-dark">
                {offer.retailer}
              </span>

              <span className="poke-badge poke-badge-dark">
                {offer.deal_type}
              </span>
            </div>

            <h1 className="poke-title text-4xl sm:text-6xl">{offer.title}</h1>

            <p className="poke-price mt-6 text-5xl">{offer.price}</p>

            <div className="poke-divider my-8" />

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Händler
                </p>
                <p className="mt-2 font-bold text-white">{offer.retailer}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Gültigkeit
                </p>
                <p className="mt-2 font-bold text-white">
                  {offer.valid_until}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Gefunden am
                </p>
                <p className="mt-2 font-bold text-white">
                  {parseDate(offer.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-poke text-2xl text-yellow-400">
                Beschreibung
              </h2>

              <p className="mt-3 whitespace-pre-line leading-7 text-zinc-300">
                {offer.description ||
                  "Für dieses Angebot wurde noch keine Beschreibung hinterlegt."}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={offer.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="poke-button poke-button-primary px-6 py-4"
              >
                Angebot öffnen
              </a>

              <Link
                href="/"
                className="poke-button poke-button-secondary px-6 py-4"
              >
                Weitere Deals ansehen
              </Link>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}