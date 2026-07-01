import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// /api/store/worlds — public marketplace listing + publish.
//
// GET query params (all optional):
//   trope=Isekai      — filter to worlds whose trope_tags array contains this tag
//   sort=popular      — order by player_count desc (default)
//   sort=newest       — order by created_at desc
//   mine=1            — only worlds created by the caller (requires Bearer token)
//   limit=40          — max rows (default 40, capped at 60)
//
// POST — publish a new world (requires Bearer token). The world_config is copied
// from one of the caller's own save slots so listings are always playable.

// This route reads request-specific query params / auth, so it must run per-request.
export const dynamic = "force-dynamic";

// Columns safe to expose publicly (never leak world_config or anything sensitive here).
const PUBLIC_COLUMNS =
  "id, creator_id, title, synopsis, cover_url, cover_type, trope_tags, is_premium, price_coins, rating, player_count, created_at";

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trope = searchParams.get("trope")?.trim();
    const sort = searchParams.get("sort") === "newest" ? "newest" : "popular";
    const mine = searchParams.get("mine") === "1";
    const limit = Math.min(Number(searchParams.get("limit")) || 40, 60);

    const supabase = getSupabaseServerClient();

    let query = supabase.from("worlds").select(PUBLIC_COLUMNS);

    // "My Library" — scope to the authenticated creator.
    if (mine) {
      const token = bearerToken(req);
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      query = query.eq("creator_id", user.id);
    }

    // Filter by trope tag (Postgres array containment: trope_tags @> {trope}).
    if (trope && trope.toLowerCase() !== "all") {
      query = query.contains("trope_tags", [trope]);
    }

    // Sort.
    query =
      sort === "newest"
        ? query.order("created_at", { ascending: false })
        : query.order("player_count", { ascending: false });

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error("[store/worlds] supabase error:", error.message);
      return NextResponse.json({ error: "Failed to load worlds" }, { status: 500 });
    }

    return NextResponse.json({ worlds: data ?? [] });
  } catch (err) {
    console.error("[store/worlds] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate: require a valid Supabase access token.
    const token = bearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const {
      saveSlotId,
      title,
      synopsis,
      tropeTags,
      isPremium,
      priceCoins,
      coverUrl,
      coverType,
    } = body as {
      saveSlotId?: string;
      title?: string;
      synopsis?: string;
      tropeTags?: string[];
      isPremium?: boolean;
      priceCoins?: number;
      coverUrl?: string | null;
      coverType?: string;
    };

    const cleanTitle = title?.trim();
    if (!cleanTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!saveSlotId) {
      return NextResponse.json({ error: "A save slot is required to publish" }, { status: 400 });
    }

    // Pull the world_config from the caller's own save slot — this guarantees the
    // published listing is actually playable and can't be spoofed by the client.
    const { data: slot, error: slotError } = await supabase
      .from("save_slots")
      .select("world_config, world_name")
      .eq("id", saveSlotId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (slotError || !slot?.world_config) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const price = Math.max(0, Math.min(Number(priceCoins) || 0, 100000));
    const tags = Array.isArray(tropeTags)
      ? tropeTags.filter((t) => typeof t === "string").slice(0, 6)
      : [];

    const { data, error } = await supabase
      .from("worlds")
      .insert({
        creator_id: user.id,
        title: cleanTitle.slice(0, 120),
        synopsis: (synopsis ?? "").trim().slice(0, 600),
        cover_url: coverUrl?.trim() || null,
        cover_type: coverType === "upload" ? "upload" : "auto",
        trope_tags: tags,
        world_config: slot.world_config,
        is_premium: !!isPremium,
        price_coins: price,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[store/worlds] publish error:", error?.message);
      return NextResponse.json({ error: "Failed to publish world" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    console.error("[store/worlds] unexpected POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
