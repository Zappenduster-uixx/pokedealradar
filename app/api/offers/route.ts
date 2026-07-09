import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

function isAllowed(request: Request) {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin && adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isAllowed(request)) {
      return NextResponse.json(
        { error: "Nicht erlaubt. PIN stimmt nicht." },
        { status: 401 },
      );
    }

    const {
      title,
      retailer,
      price,
      category,
      valid_until,
      image,
      source_url,
      deal_type,
      description,
    } = body;

    if (!title || !retailer || !price || !category || !valid_until || !deal_type) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen." },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseAdmin
      .from("offers")
      .insert({
        title,
        retailer,
        price,
        category,
        valid_until,
        image:
          image ||
          "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1200&auto=format&fit=crop",
        source_url: source_url || "#",
        deal_type,
        created_at: today,
        description:
          description ||
          "Für dieses Angebot wurde noch keine Beschreibung hinterlegt.",
      })
      .select();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unbekannter Serverfehler.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from("offers")
    .delete()
    .gte("id", 0);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Alle Angebote wurden gelöscht.",
  });
}