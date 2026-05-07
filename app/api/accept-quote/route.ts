import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = String(body.slug || "").trim();

    console.log("ACCEPT QUOTE SLUG RECEIVED:", slug);

    if (!slug) {
      return NextResponse.json(
        { error: "Missing quote slug." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: now,
      })
      .eq("quote_slug", slug)
      .select()
      .maybeSingle();

    if (error) {
      console.error("ACCEPT QUOTE SUPABASE ERROR:", error);
      return NextResponse.json(
        { error: "Could not accept quote.", details: error },
        { status: 500 }
      );
    }

    if (!data) {
      console.error("NO QUOTE FOUND FOR SLUG:", slug);

      return NextResponse.json(
        {
          error: "No quote found for this link.",
          slugReceived: slug,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: data,
    });
  } catch (error) {
    console.error("ACCEPT QUOTE API ERROR:", error);

    return NextResponse.json(
      { error: "Accept quote server error." },
      { status: 500 }
    );
  }
}