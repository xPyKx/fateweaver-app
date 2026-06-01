import { getSessionUser, supabase } from "../supabase/client";

const MAX_DIMENSION = 1100;
const PREVIEW_DIMENSION = 900;
const IMAGE_QUALITY = 0.76;
const STORAGE_BUCKET = "fateweaver-assets";

export async function fileToPersistentImageUrl(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    const uploaded = await uploadImageBlob(file, "svg");
    return uploaded ?? readFileAsDataUrl(file);
  }

  const canvas = await fileToCompressedCanvas(file, MAX_DIMENSION);
  if (!canvas) return readFileAsDataUrl(file);
  return canvasToPersistentImageUrl(canvas, "webp", IMAGE_QUALITY);
}

export async function fileToPreviewImageUrl(file: File): Promise<string> {
  if (file.type === "image/svg+xml") return readFileAsDataUrl(file);

  const canvas = await fileToCompressedCanvas(file, PREVIEW_DIMENSION);
  if (!canvas) return readFileAsDataUrl(file);
  return canvas.toDataURL("image/webp", IMAGE_QUALITY);
}

async function fileToCompressedCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement | undefined> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return undefined;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas;
}

export async function canvasToPersistentImageUrl(canvas: HTMLCanvasElement, extension = "webp", quality = IMAGE_QUALITY): Promise<string> {
  const mimeType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/webp";
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const uploaded = await uploadImageBlob(blob, extension);
  return uploaded ?? canvas.toDataURL(mimeType, quality);
}

async function uploadImageBlob(blob: Blob, extension: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  const userId = (await getSessionUser())?.id;
  if (!userId) return undefined;

  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExtension}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    cacheControl: "31536000",
    contentType: blob.type || "image/jpeg",
    upsert: false
  });
  if (error) return undefined;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? dataUrlToBlob(canvas.toDataURL(type, quality))), type, quality);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, content] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
