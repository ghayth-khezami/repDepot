import { BadRequestException } from "@nestjs/common";
import { extname } from "path";
import { memoryStorage } from "multer";

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext) || !ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
    return cb(new BadRequestException("Only image files are allowed."), false);
  }
  cb(null, true);
}

export function safeImageExtension(originalname: string): string {
  const ext = extname(originalname).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : ".jpg";
}

/** Multer memory storage — files go to Cloudinary, not disk. */
export function memoryImageUpload(limits?: { fileSize?: number; files?: number }) {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: limits?.fileSize ?? 6 * 1024 * 1024,
      files: limits?.files,
    },
    fileFilter: imageFileFilter,
  };
}
