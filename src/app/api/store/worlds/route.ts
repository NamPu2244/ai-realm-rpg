import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/store/worlds
// Public marketplace listing of published worlds.
//
// Query params (all optional):
//   trope=Isekai      — filter to worlds whose trope_tags array contains this tag
//   sort=popular      — order by player_count desc (default)
//   sort=newest       — order by created_at desc
//   limit=40          — max rows (default 40, capped at 60)
//
// No auth required — the `worlds` table exposes a public SELECT policy.

// This route reads request-specific query params, so it must run per-request.
export const dynamic = "force-dynamic";

// Columns safe to expose publicly (never leak anything sensitive here).
const PUBLIC_COLUMNS =
  "id, creator_id, title, synopsis, cover_url, cover_type, trope_tags, is_premium, price_coins, rating, player_count, created_at";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trope = searchParams.get("trope")?.trim();
    const sort = searchParams.get("sort") === "newest" ? "newest" : "popular";
    const limit = Math.min(Number(searchParams.get("limit")) || 40, 60);

    const supabase = getSupabaseServerClient();

    let query = supabase.from("worlds").select(PUBLIC_COLUMNS);

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
