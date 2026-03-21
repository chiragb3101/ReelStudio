export interface BufferScheduleOptions {
  accessToken: string;
  profileIds: string[];
  text: string;
  scheduledAt?: string; // ISO 8601
  mediaUrl?: string;
}

export async function scheduleToBuffer(
  options: BufferScheduleOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      profile_ids: options.profileIds,
      text: options.text,
      scheduled_at: options.scheduledAt,
    };

    if (options.mediaUrl) {
      body.media = { photo: options.mediaUrl };
    }

    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        accessToken: options.accessToken,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getBufferProfiles(
  accessToken: string
): Promise<{ id: string; service: string; formatted_username: string }[]> {
  const res = await fetch("/api/schedule?action=profiles", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.profiles ?? [];
}
