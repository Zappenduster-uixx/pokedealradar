import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

function isAllowed(request: Request) {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin && adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;
}

export async function POST(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const testSourceUrl = "https://example.com/pokemon-test-deal";

  const { data: existingOffer, error: existingError } = await supabaseAdmin
    .from("offers")
    .select("id")
    .eq("source_url", testSourceUrl)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (existingOffer) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      skipped: 1,
      message: "Scanner-Testdeal existiert bereits.",
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabaseAdmin.from("offers").insert({
    title: "Automatisch gefundener Pokémon Test-Deal",
    retailer: "Scanner-Test",
    price: "4,49 €",
    category: "Booster",
    valid_until: "Testangebot",
    image:
      "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1200&auto=format&fit=crop",
    source_url: testSourceUrl,
    deal_type: "Online",
    created_at: today,
    description:
      "Dieser Eintrag wurde automatisch über den Scanner-Test erstellt. Wenn du ihn siehst, funktioniert die Scanner-Pipeline.",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    inserted: 1,
    skipped: 0,
    message: "Scanner-Testdeal wurde gespeichert.",
  });
}