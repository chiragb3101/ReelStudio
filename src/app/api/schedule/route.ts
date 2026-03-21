import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accessToken, profile_ids, text, scheduled_at, media } = body;

  if (!accessToken) {
    return new Response("Missing Buffer access token", { status: 400 });
  }

  try {
    const bufferBody: Record<string, unknown> = {
      profile_ids,
      text,
      scheduled_at,
    };

    if (media) {
      bufferBody.media = media;
    }

    const res = await fetch("https://api.bufferapp.com/1/updates/create.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(bufferBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(errText, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  const action = req.nextUrl.searchParams.get("action");

  if (action === "profiles" && auth) {
    const token = auth.replace("Bearer ", "");
    try {
      const res = await fetch(
        `https://api.bufferapp.com/1/profiles.json?access_token=${token}`
      );
      if (!res.ok) return new Response("Failed", { status: res.status });
      const profiles = await res.json();
      return NextResponse.json({ profiles });
    } catch {
      return new Response("Buffer API error", { status: 500 });
    }
  }

  return new Response("Unknown action", { status: 400 });
}
