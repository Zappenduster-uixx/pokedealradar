"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerProgress, setScannerProgress] = useState(0);
  const [scannerElapsedSeconds, setScannerElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!scannerLoading) return;

    setScannerProgress(5);
    setScannerElapsedSeconds(0);

    const startedAt = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setScannerElapsedSeconds(elapsed);

      setScannerProgress((currentProgress) => {
        if (currentProgress < 40) return currentProgress + 5;
        if (currentProgress < 70) return currentProgress + 3;
        if (currentProgress < 88) return currentProgress + 1.5;
        if (currentProgress < 95) return currentProgress + 0.5;
        return currentProgress;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [scannerLoading]);

  function unlockAdmin() {
    if (!pin.trim()) {
      setMessage("Bitte Admin-PIN eingeben.");
      return;
    }

    if (pin !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
      setMessage("Falsche PIN.");
      return;
    }

    setIsUnlocked(true);
    setMessage("Adminbereich freigeschaltet.");
  }

  function lockAdmin() {
    setIsUnlocked(false);
    setPin("");
    setMessage("Adminbereich gesperrt.");
  }

  async function startScanner() {
    if (!pin.trim()) {
      setMessage("Bitte Admin-PIN eingeben.");
      return;
    }

    const confirmed = window.confirm("Scanner starten?");

    if (!confirmed) return;

    setScannerLoading(true);
    setScannerProgress(5);
    setScannerElapsedSeconds(0);
    setMessage("Angebots-Scanner läuft...");

    try {
      const response = await fetch("/api/scanner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": pin,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setScannerProgress(100);
        setMessage(data.error || "Fehler beim Scanner.");
        setScannerLoading(false);
        return;
      }

      setScannerProgress(100);
      setMessage(data.message || "Scanner fertig.");
    } catch (error) {
      setScannerProgress(100);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Scanner.",
      );
    }

    setScannerLoading(false);
  }

  async function deleteAllOffers() {
    if (!pin.trim()) {
      setMessage("Bitte Admin-PIN eingeben.");
      return;
    }

    const confirmed = window.confirm(
      "Wirklich ALLE Angebote löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Letzte Bestätigung: Alle Angebote werden gelöscht. Fortfahren?",
    );

    if (!secondConfirm) return;

    setMessage("Alle Angebote werden gelöscht...");

    try {
      const response = await fetch("/api/offers", {
        method: "DELETE",
        headers: {
          "x-admin-pin": pin,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Fehler beim Löschen.");
        return;
      }

      setMessage("Alle Angebote wurden gelöscht.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unbekannter Fehler beim Löschen.",
      );
    }
  }

  function getScannerText() {
    if (!scannerLoading) return "";

    if (scannerProgress < 30) {
      return "Scanner wird gestartet und Quellen werden vorbereitet...";
    }

    if (scannerProgress < 60) {
      return "Shops und Deal-Seiten werden durchsucht...";
    }

    if (scannerProgress < 85) {
      return "Gefundene Angebote werden geprüft...";
    }

    if (scannerProgress < 95) {
      return "Neue Deals werden in Supabase gespeichert...";
    }

    return "Fast fertig...";
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen px-4 py-8 text-white">
        <section className="mx-auto max-w-xl">
          <header className="poke-hero mb-8 p-6 sm:p-8">
            <div className="relative z-10">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
                PokéDealRadar
              </p>

              <h1 className="poke-title text-4xl sm:text-6xl">
                Adminbereich
              </h1>

              <p className="mt-4 text-sm leading-7 text-zinc-300 sm:text-base">
                Melde dich mit deiner Admin-PIN an, um Scanner und Verwaltung zu
                öffnen.
              </p>
            </div>
          </header>

          <section className="poke-panel p-6">
            <div className="relative z-10">
              <label className="mb-2 block text-sm font-semibold text-zinc-300">
                Admin-PIN
              </label>

              <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    unlockAdmin();
                  }
                }}
                placeholder="PIN eingeben"
                className="poke-input"
              />

              <button
                onClick={unlockAdmin}
                className="poke-button poke-button-primary mt-4 w-full px-5 py-3"
              >
                Freischalten
              </button>

              <Link
                href="/"
                className="poke-button poke-button-secondary mt-3 w-full px-5 py-3"
              >
                Zur Startseite
              </Link>

              {message && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                  {message}
                </p>
              )}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <header className="poke-hero mb-8 p-6 sm:p-8">
          <div className="relative z-10">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
              PokéDealRadar
            </p>

            <h1 className="poke-title text-4xl sm:text-6xl">
              Adminbereich
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Starte den normalen Deal-Scanner, öffne den Prospekt-Scanner oder
              lösche gespeicherte Angebote.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="poke-badge poke-badge-gold">Admin aktiv</span>
              <span className="poke-badge poke-badge-dark">Scanner bereit</span>
              <span className="poke-badge poke-badge-dark">Prospekte</span>
            </div>
          </div>
        </header>

        {message && (
          <section className="poke-panel mb-8 p-5">
            <div className="relative z-10">
              <p className="text-sm leading-6 text-zinc-300">{message}</p>
            </div>
          </section>
        )}

        {(scannerLoading || scannerProgress > 0) && (
          <section className="poke-panel mb-8 p-6">
            <div className="relative z-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-poke text-2xl text-yellow-400">
                    Angebots-Scanner Fortschritt
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    {scannerLoading
                      ? getScannerText()
                      : scannerProgress === 100
                        ? "Scan abgeschlossen."
                        : "Bereit."}
                  </p>
                </div>

                <div className="text-sm font-bold text-zinc-300">
                  {Math.round(scannerProgress)} % · {scannerElapsedSeconds}s
                </div>
              </div>

              <div className="mt-5 h-4 overflow-hidden rounded-full border border-white/10 bg-black/50">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                  style={{ width: `${Math.min(scannerProgress, 100)}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Hinweis: Die Prozentanzeige ist geschätzt. Der Scanner meldet
                echte Ergebnisse erst nach Abschluss der API-Anfrage zurück.
              </p>
            </div>
          </section>
        )}

        <section className="poke-panel p-6">
          <div className="relative z-10">
            <h2 className="font-poke text-2xl text-yellow-400">
              Aktionen
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Wähle aus, was du machen möchtest.
            </p>

            <div className="poke-divider my-6" />

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={startScanner}
                disabled={scannerLoading}
                className="poke-button poke-button-primary px-5 py-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scannerLoading ? "Scanner läuft..." : "Scanner starten"}
              </button>

              <Link
                href="/admin/prospekte"
                className="poke-button poke-button-primary px-5 py-4"
              >
                Prospekt-Scanner
              </Link>

              <Link
                href="/"
                className="poke-button poke-button-secondary px-5 py-4"
              >
                Zur Startseite
              </Link>

              <button
                onClick={deleteAllOffers}
                className="poke-button poke-button-danger px-5 py-4"
              >
                Alle Angebote löschen
              </button>

              <button
                onClick={lockAdmin}
                className="poke-button poke-button-secondary px-5 py-4 sm:col-span-2"
              >
                Sperren
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}