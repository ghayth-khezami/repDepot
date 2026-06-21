import { extname, join } from "path";
import * as fs from "fs";

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

let sharpModule: typeof import("sharp") | null = null;

async function getSharp() {
  if (sharpModule) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default;
    return sharpModule;
  } catch {
    return null;
  }
}

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function isCompressibleImagePath(filePath: string): boolean {
  return IMAGE_EXT.has(extname(filePath).toLowerCase());
}

/**
 * Compress an on-disk upload for web delivery (resize + JPEG/WebP).
 * Replaces the original file; returns new extension when output format changes.
 */
export async function compressImageOnDisk(
  absolutePath: string,
): Promise<{ path: string; filename: string } | null> {
  if (!fs.existsSync(absolutePath) || !isCompressibleImagePath(absolutePath)) {
    return null;
  }

  const sharp = await getSharp();
  if (!sharp) return null;

  const ext = extname(absolutePath).toLowerCase();
  const base = absolutePath.slice(0, -ext.length);
  const tmpPath = `${base}.opt.tmp`;

  try {
    const pipeline = sharp(absolutePath)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true });

    if (ext === ".png" || ext === ".webp") {
      await pipeline.webp({ quality: WEBP_QUALITY }).toFile(tmpPath);
      const finalPath = `${base}.webp`;
      fs.renameSync(tmpPath, finalPath);
      if (finalPath !== absolutePath) fs.unlinkSync(absolutePath);
      return { path: finalPath, filename: finalPath.split(/[/\\]/).pop()! };
    }

    await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath);
    const finalPath = ext === ".jpg" || ext === ".jpeg" ? absolutePath : `${base}.jpg`;
    fs.renameSync(tmpPath, finalPath);
    if (finalPath !== absolutePath) fs.unlinkSync(absolutePath);
    return { path: finalPath, filename: finalPath.split(/[/\\]/).pop()! };
  } catch {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    return null;
  }
}

export async function compressUploadedFile(
  file: Express.Multer.File,
): Promise<void> {
  const abs =
    file.path || join(file.destination || process.cwd(), "uploads", file.filename);
  const result = await compressImageOnDisk(abs);
  if (result) {
    file.filename = result.filename;
    file.path = result.path;
  }
}

export async function compressUploadedFiles(
  files: Express.Multer.File[] | undefined,
): Promise<void> {
  if (!files?.length) return;
  await Promise.all(files.map((f) => compressUploadedFile(f)));
}

/** Compress in-memory before Cloudinary upload. */
export async function compressImageBuffer(
  buffer: Buffer,
  mimetype: string,
): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) return buffer;

  const pipeline = sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });

  if (mimetype === "image/png" || mimetype === "image/webp") {
    return pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
  }
  return pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
}
