import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, saveSlotId } = body as { message?: unknown; saveSlotId?: unknown };

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length < 5 ||
      message.length > 2000
    ) {
      return NextResponse.json(
        { error: "Message must be between 5 and 2000 characters" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("feedback").insert({
      message: message.trim(),
      save_slot_id: typeof saveSlotId === "string" ? saveSlotId : null,
    });

    if (error) {
      console.error("[feedback] insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
