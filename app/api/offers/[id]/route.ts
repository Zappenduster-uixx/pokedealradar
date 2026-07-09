import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type OfferRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

function isAllowed(request: Request) {
  const adminPin = request.headers.get("x-admin-pin");
  return adminPin && adminPin === process.env.NEXT_PUBLIC_ADMIN_PIN;
}

export async function DELETE(request: Request, context: OfferRouteProps) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const params = await context.params;
  const offerId = Number(params.id);

  if (!offerId || Number.isNaN(offerId)) {
    return NextResponse.json(
      { error: "Ungültige Angebots-ID." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("offers")
    .delete()
    .eq("id", offerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, context: OfferRouteProps) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }

  const params = await context.params;
  const offerId = Number(params.id);

  if (!offerId || Number.isNaN(offerId)) {
    return NextResponse.json(
      { error: "Ungültige Angebots-ID." },
      { status: 400 },
    );
  }

  const body = await request.json();

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

  const { error } = await supabaseAdmin
    .from("offers")
    .update({
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
      description:
        description ||
        "Für dieses Angebot wurde noch keine Beschreibung hinterlegt.",
    })
    .eq("id", offerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}