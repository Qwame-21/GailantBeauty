import { supabase } from "./supabase";

export type UploadedImage = { url: string; publicId: string };

const readDimensions = (file: File) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const url = URL.createObjectURL(file); const preview = new Image();
  preview.onload = () => { URL.revokeObjectURL(url); resolve({ width: preview.naturalWidth, height: preview.naturalHeight }); };
  preview.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The image could not be read.")); };
  preview.src = url;
});

export async function uploadImage(file: File, onProgress?: (percent: number) => void): Promise<UploadedImage> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_ASSET_FOLDER || "gailant_admin";
  if (!cloud || !preset) throw new Error("Cloudinary uploads are not configured.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
  const dimensions = await readDimensions(file);
  if (dimensions.width < 600 || dimensions.height < 600) throw new Error("Images must be at least 600 × 600 pixels.");
  const body = new FormData();
  body.append("file", file); body.append("upload_preset", preset); body.append("folder", folder);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open("POST", `https://api.cloudinary.com/v1_1/${cloud}/image/upload`);
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("Image upload failed. Check the connection and retry."));
    request.onload = () => { let result: { secure_url?: string; public_id?: string; error?: { message?: string } } = {}; try { result = JSON.parse(request.responseText) as typeof result; } catch { reject(new Error("Cloudinary returned an invalid response.")); return; } if (request.status < 200 || request.status >= 300 || !result.secure_url || !result.public_id) { reject(new Error(result.error?.message || "Image upload failed.")); return; } onProgress?.(100); resolve({ url: result.secure_url, publicId: result.public_id }); };
    request.send(body);
  });
}

export async function cleanupImages(publicIds: string[]) {
  const failures: string[] = [];
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  await Promise.all(publicIds.map(async publicId => {
    try {
      const response = await fetch("/api/admin/delete-image", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ public_id: publicId }) });
      if (!response.ok) throw new Error(await response.text());
    } catch (error) { console.error("Orphaned Cloudinary asset", { publicId, error }); failures.push(publicId); }
  }));
  return failures;
}
