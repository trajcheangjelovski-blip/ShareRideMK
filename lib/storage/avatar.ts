// Uploads a profile photo to the public `avatars` bucket and returns its URL.
// Uses a service-role client (server-only) so it works during registration too.
import { createAdminClient } from "@/lib/supabase/server";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("Сликата е задолжителна.");
  if (!ALLOWED.includes(file.type)) throw new Error("Дозволени се само JPG, PNG или WEBP слики.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Сликата мора да е под 5MB.");

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${userId}/portrait.${extFromType(file.type)}`;

  const { error } = await admin.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  // cache-bust so a re-uploaded photo refreshes immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}
