import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/store/worlds/[id]
// Full detail for a single published world, including the world_config needed
// to load it into a fresh game. Public — no auth required.

export const dynamic = "force-dynamic";

const DETAIL_COLUMNS =
  "id, creator_id, title, synopsis, cover_url, cover_type, trope_tags, world_config, is_premium, price_coins, rating, player_count, created_at";

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("worlds")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[store/worlds/:id] supabase error:", error.message);
      return NextResponse.json({ error: "Failed to load world" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }

    return NextResponse.json({ world: data });
  } catch (err) {
    console.error("[store/worlds/:id] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/store/worlds/[id] — register a play (bumps player_count atomically).
// Public: anyone launching a world from the store counts. Failure is non-fatal
// to the caller — the play itself must not depend on the counter succeeding.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("increment_world_players", { world_id: id });
    if (error) {
      console.error("[store/worlds/:id] increment error:", error.message);
      return NextResponse.json({ error: "Failed to register play" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[store/worlds/:id] unexpected POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/store/worlds/[id] — creator removes their own listing.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const token = bearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Scope the delete to the caller's own row so no one can remove others' worlds.
    const { data, error } = await supabase
      .from("worlds")
      .delete()
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[store/worlds/:id] delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete world" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[store/worlds/:id] unexpected DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
