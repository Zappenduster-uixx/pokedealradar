"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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

const categories = ["Booster", "ETB", "Tins", "Kollektion", "Displays"];
const dealTypes: Offer["deal_type"][] = ["Online", "Lokal"];

const emptyForm = {
  title: "",
  retailer: "",
  price: "",
  category: "Booster",
  valid_until: "",
  image: "",
  source_url: "",
  deal_type: "Online" as Offer["deal_type"],
  description: "",
};

export default function AdminPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const [pinInput, setPinInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);

  const adminPin = process.env.NEXT_PUBLIC_ADMIN_PIN;

  useEffect(() => {
    const savedUnlock = sessionStorage.getItem("pokedealradar_admin_unlocked");

    if (savedUnlock === "true") {
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadOffers();
    }
  }, [isUnlocked]);

  function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pinInput === adminPin) {
      setIsUnlocked(true);
      sessionStorage.setItem("pokedealradar_admin_unlocked", "true");
      setMessage("");
    } else {
      setMessage("Falsche PIN.");
    }
  }

  function logoutAdmin() {
    sessionStorage.removeItem("pokedealradar_admin_unlocked");
    setIsUnlocked(false);
    setPinInput("");
    setEditingOfferId(null);
    setForm(emptyForm);
  }

  async function loadOffers() {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("inserted_at", { ascending: false });

    if (error) {
      setMessage(`Fehler beim Laden: ${error.message}`);
    } else {
      setOffers(data ?? []);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const url = editingOfferId ? `/api/offers/${editingOfferId}` : "/api/offers";
    const method = editingOfferId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": pinInput || process.env.NEXT_PUBLIC_ADMIN_PIN || "",
      },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(
        editingOfferId
          ? `Fehler beim Aktualisieren: ${result.error}`
          : `Fehler beim Speichern: ${result.error}`,
      );
      return;
    }

    setMessage(
      editingOfferId
        ? "Angebot wurde aktualisiert."
        : "Angebot wurde gespeichert.",
    );

    setForm(emptyForm);
    setEditingOfferId(null);
    loadOffers();
  }

  async function deleteOffer(id: number) {
    setMessage("");

    const response = await fetch(`/api/offers/${id}`, {
      method: "DELETE",
      headers: {
        "x-admin-pin": pinInput || process.env.NEXT_PUBLIC_ADMIN_PIN || "",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(`Fehler beim Löschen: ${result.error}`);
      return;
    }

    setMessage("Angebot wurde gelöscht.");
    loadOffers();

    if (editingOfferId === id) {
      setEditingOfferId(null);
      setForm(emptyForm);
    }
  }

  function startEditing(offer: Offer) {
    setEditingOfferId(offer.id);
    setForm({
      title: offer.title,
      retailer: offer.retailer,
      price: offer.price,
      category: offer.category,
      valid_until: offer.valid_until,
      image: offer.image,
      source_url: offer.source_url,
      deal_type: offer.deal_type,
      description: offer.description,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    setMessage(`Du bearbeitest jetzt: ${offer.title}`);
  }

  function cancelEditing() {
    setEditingOfferId(null);
    setForm(emptyForm);
    setMessage("Bearbeitung abgebrochen.");
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
        <section className="mx-auto max-w-md">
          <Link href="/" className="text-yellow-400 hover:text-yellow-300">
            ← Zur Startseite
          </Link>

          <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-400">
              Adminbereich
            </p>

            <h1 className="text-3xl font-black">PIN eingeben</h1>

            <p className="mt-3 text-zinc-400">
              Dieser Bereich ist geschützt. Gib die Admin-PIN ein.
            </p>

            {message && (
              <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
                {message}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="mt-6">
              <input
                type="password"
                value={pinInput}
                onChange={(event) => setPinInput(event.target.value)}
                placeholder="Admin-PIN"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />

              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-5 py-4 text-lg font-black text-zinc-950 hover:bg-yellow-300"
              >
                Entsperren
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-400">
              Adminbereich
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Angebote verwalten
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Trage neue Pokémon-Karten-Angebote ein oder bearbeite bestehende
              Einträge.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 font-bold text-zinc-200 hover:border-yellow-400 hover:text-yellow-400"
            >
              Zur Startseite
            </Link>

            <button
              onClick={logoutAdmin}
              className="inline-flex items-center justify-center rounded-2xl border border-red-900 px-5 py-3 font-bold text-red-400 hover:bg-red-950"
            >
              Sperren
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-yellow-400">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={
            editingOfferId
              ? "mb-10 rounded-3xl border border-yellow-400 bg-zinc-900 p-5 sm:p-6"
              : "mb-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
          }
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {editingOfferId ? "Angebot bearbeiten" : "Neues Angebot"}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {editingOfferId
                  ? "Ändere die Daten und speichere die Aktualisierung."
                  : "Fülle die Felder aus und speichere ein neues Angebot."}
              </p>
            </div>

            {editingOfferId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
              >
                Bearbeitung abbrechen
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Titel
              </label>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="z. B. Pokémon Booster Angebot"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Händler
              </label>
              <input
                required
                value={form.retailer}
                onChange={(event) =>
                  setForm({ ...form, retailer: event.target.value })
                }
                placeholder="z. B. Müller"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Preis
              </label>
              <input
                required
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                placeholder="z. B. 3,99 €"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Kategorie
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
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
                Deal-Art
              </label>
              <select
                value={form.deal_type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    deal_type: event.target.value as Offer["deal_type"],
                  })
                }
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
              >
                {dealTypes.map((dealType) => (
                  <option key={dealType}>{dealType}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Gültigkeit
              </label>
              <input
                required
                value={form.valid_until}
                onChange={(event) =>
                  setForm({ ...form, valid_until: event.target.value })
                }
                placeholder="z. B. bis Samstag"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Angebotslink
              </label>
              <input
                value={form.source_url}
                onChange={(event) =>
                  setForm({ ...form, source_url: event.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Bild-URL optional
              </label>
              <input
                value={form.image}
                onChange={(event) =>
                  setForm({ ...form, image: event.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Beschreibung
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Kurze Beschreibung des Angebots..."
                rows={4}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-5 py-4 text-lg font-black text-zinc-950 hover:bg-yellow-300"
          >
            {editingOfferId ? "Änderungen speichern" : "Angebot speichern"}
          </button>
        </form>

        <h2 className="mb-4 text-2xl font-black">Gespeicherte Angebote</h2>

        <div className="space-y-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={
                editingOfferId === offer.id
                  ? "flex flex-col gap-4 rounded-2xl border border-yellow-400 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between"
                  : "flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center sm:justify-between"
              }
            >
              <div>
                <p className="font-bold">{offer.title}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {offer.retailer} · {offer.price} · {offer.category} ·{" "}
                  {offer.deal_type}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => startEditing(offer)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
                >
                  Bearbeiten
                </button>

                <button
                  onClick={() => deleteOffer(offer.id)}
                  className="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}