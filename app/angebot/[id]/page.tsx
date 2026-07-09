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
};

export default function OfferDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);

  useEffect(() => {
    async function loadOffer() {
      const offerId = Number(id);

      if (!offerId || Number.isNaN(offerId)) {
        setOffer(null);
        return;
      }

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .maybeSingle();

      if (error) {
        console.error("Fehler beim Laden:", error.message);
        setOffer(null);
      } else {
        setOffer(data ?? null);
      }
    }

    loadOffer();
  }, [id]);

  if (offer === undefined) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl">
          <p className="text-zinc-400">Lade Angebot...</p>
        </section>
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl">
          <Link href="/" className="text-yellow-400 hover:text-yellow-300">
            ← Zurück zur Startseite
          </Link>

          <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
            <h1 className="text-3xl font-black">Angebot nicht gefunden</h1>
            <p className="mt-3 text-zinc-400">
              Dieses Angebot existiert nicht oder wurde entfernt.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300">
          ← Zurück zur Startseite
        </Link>

        <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div
            className="relative h-72 bg-cover bg-center"
            style={{ backgroundImage: `url(${offer.image})` }}
          >
            <span className="absolute left-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-zinc-950">
              {offer.deal_type}
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-zinc-950">
                {offer.category}
              </span>

              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                {offer.retailer}
              </span>
            </div>

            <h1 className="text-3xl font-black sm:text-5xl">{offer.title}</h1>

            <p className="mt-5 text-5xl font-black text-yellow-400">
              {offer.price}
            </p>

            <p className="mt-5 text-zinc-300">{offer.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Händler</p>
                <p className="mt-1 font-bold">{offer.retailer}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Gültigkeit</p>
                <p className="mt-1 font-bold">{offer.valid_until}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Kategorie</p>
                <p className="mt-1 font-bold">{offer.category}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Deal-Art</p>
                <p className="mt-1 font-bold">{offer.deal_type}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Gefunden am</p>
                <p className="mt-1 font-bold">{offer.created_at}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">Status</p>
                <p className="mt-1 font-bold text-green-400">Aktiv</p>
              </div>
            </div>

            <a
              href={offer.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-5 py-4 text-lg font-black text-zinc-950 hover:bg-yellow-300"
            >
              Zum Angebot / zur Quelle
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}