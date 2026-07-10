"use client";

import { useState } from "react";
import Link from "next/link";

type ProspectSourceResult = {
  source: string;
  retailer: string;
  found: number;
  inserted: number;
  skipped: number;
  scannedPages: number;
  scannedPdfs: number;
  error?: string | null;
};

type ProspectScannerResponse = {
  success: boolean;
  found?: number;
  inserted?: number;
  skipped?: number;
  message?: string;
  error?: string;
  sources?: ProspectSourceResult[];
};

export default function ProspectAdminPage() {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<ProspectSourceResult[]>([]);

  function unlock() {
    if (!pin.trim()) {
      setMessage("Bitte Admin-PIN eingeben.");
      return;
    }

    if (pin !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
      setMessage("Falsche PIN.");
      return;
    }

    setIsUnlocked(true);
    setMessage("Prospekt-Scanner freigeschaltet.");
  }

  async function scanProspects() {
    if (!pin.trim()) {
      setMessage("Bitte Admin-PIN eingeben.");
      return;
    }

    const confirmed = window.confirm(
      "Prospekt-Scanner starten? Das kann etwas dauern.",
    );

    if (!confirmed) return;

    setIsScanning(true);
    setMessage("Prospekte werden gescannt...");
    setResults([]);

    try {
      const response = await fetch("/api/prospect-scanner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": pin,
        },
      });

      const data = (await response.json()) as ProspectScannerResponse;

      if (!response.ok) {
        setMessage(data.error || "Fehler beim Prospekt-Scan.");
        setIsScanning(false);
        return;
      }

      setMessage(data.message || "Prospekt-Scanner fertig.");
      setResults(data.sources || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Prospekt-Scan.",
      );
    }

    setIsScanning(false);
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="poke-button poke-button-secondary px-5 py-3">
            Zur Startseite
          </Link>

          <Link
            href="/admin"
            className="poke-button poke-button-primary px-5 py-3"
          >
            Zurück zum Adminbereich
          </Link>
        </div>

        <header className="poke-hero mb-8 p-6 sm:p-8">
          <div className="relative z-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
              PokéDealRadar
            </p>

            <h1 className="poke-title text-4xl sm:text-6xl">
              Prospekt-Scanner
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Scannt automatisch öffentliche Prospektseiten von Supermärkten und
              sucht nach Pokémon-Karten, Boostern, TCG-Produkten und
              Sammelkarten-Angeboten.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="poke-badge poke-badge-gold">
                Automatischer Scan
              </span>

              <span className="poke-badge poke-badge-dark">
                Supermarkt-Prospekte
              </span>

              <span className="poke-badge poke-badge-dark">
                Lokale Angebote
              </span>
            </div>
          </div>
        </header>

        <section className="poke-panel mb-8 p-6">
          <div className="relative z-10">
            <h2 className="font-poke text-2xl text-yellow-400">
              Scanner starten
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Gib deine Admin-PIN ein und starte danach den automatischen
              Prospekt-Scan. Gefundene Angebote werden direkt in deiner
              Angebotsdatenbank gespeichert.
            </p>

            <div className="poke-divider my-6" />

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    unlock();
                  }
                }}
                placeholder="Admin-PIN eingeben"
                className="poke-input"
              />

              {!isUnlocked ? (
                <button
                  onClick={unlock}
                  className="poke-button poke-button-primary px-6 py-3"
                >
                  Freischalten
                </button>
              ) : (
                <button
                  onClick={scanProspects}
                  disabled={isScanning}
                  className="poke-button poke-button-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? "Scan läuft..." : "Prospekte scannen"}
                </button>
              )}
            </div>

            {isUnlocked && (
              <div className="mt-4">
                <button
                  onClick={scanProspects}
                  disabled={isScanning}
                  className="poke-button poke-button-secondary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? "Bitte warten..." : "Scan erneut starten"}
                </button>
              </div>
            )}
          </div>
        </section>

        {message && (
          <section className="poke-panel mb-8 p-6">
            <div className="relative z-10">
              <h2 className="font-poke text-2xl text-yellow-400">Status</h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {message}
              </p>
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="poke-panel p-6">
            <div className="relative z-10">
              <h2 className="font-poke text-2xl text-yellow-400">
                Scan-Ergebnisse
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Übersicht pro Prospektquelle.
              </p>

              <div className="poke-divider my-6" />

              <div className="grid gap-4">
                {results.map((result) => (
                  <div
                    key={result.source}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          {result.source}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          Händler: {result.retailer}
                        </p>
                      </div>

                      {result.error ? (
                        <span className="poke-badge rounded-full border border-red-500/30 bg-red-950/50 text-red-300">
                          Fehler
                        </span>
                      ) : (
                        <span className="poke-badge poke-badge-gold">
                          Fertig
                        </span>
                      )}
                    </div>

                    {result.error ? (
                      <p className="mt-4 text-sm text-red-300">
                        {result.error}
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-5">
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Treffer
                          </p>
                          <p className="mt-1 text-xl font-black text-white">
                            {result.found}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Neu
                          </p>
                          <p className="mt-1 text-xl font-black text-green-400">
                            {result.inserted}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Doppelt
                          </p>
                          <p className="mt-1 text-xl font-black text-yellow-400">
                            {result.skipped}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Seiten
                          </p>
                          <p className="mt-1 text-xl font-black text-white">
                            {result.scannedPages}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            PDFs
                          </p>
                          <p className="mt-1 text-xl font-black text-white">
                            {result.scannedPdfs}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}