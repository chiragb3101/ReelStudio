import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { scheduleSchema } from "@/lib/api-schemas";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = scheduleSchema.safeParse(await req.json());
  if (!body.success) return new Response(body.error.message, { status: 400 });
  const { accessToken, profile_ids, text, scheduled_at, media } = body.data;

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
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const authHeader = req.headers.get("Authorization");
  const action = req.nextUrl.searchParams.get("action");

  if (action === "profiles" && authHeader) {
    const token = authHeader.replace("Bearer ", "");
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
