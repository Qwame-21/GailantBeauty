export type UploadedImage = { url: string; publicId: string };

export async function uploadImage(file: File): Promise<UploadedImage> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_ASSET_FOLDER || "gailant-beauty";
  if (!cloud || !preset) throw new Error("Cloudinary uploads are not configured.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
  const body = new FormData(); body.append("file", file); body.append("upload_preset", preset); body.append("folder", folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const result = await response.json() as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url || !result.public_id) throw new Error(result.error?.message || "Image upload failed.");
  return { url: result.secure_url, publicId: result.public_id };
}

export async function cleanupImages(publicIds: string[]) {
  const failures: string[] = [];
  const token=(await supabase?.auth.getSession())?.data.session?.access_token;
  await Promise.all(publicIds.map(async public_id => {
    try { const response = await fetch("/api/admin/delete-image", { method: "POST", headers: { "content-type": "application/json",...(token?{authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ public_id }) }); if (!response.ok) throw new Error(await response.text()); }
    catch (error) { console.error("Orphaned Cloudinary asset", { public_id, error }); failures.push(public_id); }
  }));
  return failures;
}
import { supabase } from "./supabase";
