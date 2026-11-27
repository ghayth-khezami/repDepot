import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import { promises as fsp } from "fs";
import { extname, join } from "path";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly rootFolder: string;

  constructor() {
    const url = process.env.CLOUDINARY_URL;
    if (url?.startsWith("cloudinary://")) {
      cloudinary.config({ cloudinary_url: url, secure: true });
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    this.rootFolder = (process.env.CLOUDINARY_FOLDER || "bebe-depot").replace(
      /\/$/,
      "",
    );
  }

  configured(): boolean {
    if (process.env.CLOUDINARY_URL?.startsWith("cloudinary://")) return true;
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }

  /**
   * Uploads to Cloudinary; if Cloudinary is not configured or refuses the upload (e.g. 401/403 from a
   * wrong key, a disabled account or a blocked server IP), the image is stored on this server under
   * /uploads/<folder>/ instead — the photo is saved and the request succeeds rather than failing with 500.
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Fichier image vide");
    }
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    if (!this.configured()) {
      this.logger.warn("Cloudinary non configuré : image enregistrée sur le serveur (/uploads).");
      return this.saveLocally(file, folder, unique);
    }
    try {
      return await this.uploadToCloudinary(file, folder, unique);
    } catch (error) {
      const status = (error as { http_code?: number })?.http_code;
      this.logger.error(
        `Cloudinary a refusé l'upload (HTTP ${status ?? "?"}) — image enregistrée sur le serveur à la place. ` +
          `Vérifiez CLOUDINARY_URL / clés API et que le compte Cloudinary est actif.`,
        error as any,
      );
      return this.saveLocally(file, folder, unique);
    }
  }

  private uploadToCloudinary(file: Express.Multer.File, folder: string, unique: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${this.rootFolder}/${folder}`,
            public_id: unique,
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              reject(error ?? new Error("Réponse Cloudinary sans URL"));
              return;
            }
            resolve(result.secure_url);
          },
        )
        .end(file.buffer);
    });
  }

  private async saveLocally(file: Express.Multer.File, folder: string, unique: string): Promise<string> {
    const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "") || "misc";
    const ext = EXT_BY_MIME[file.mimetype] ?? (extname(file.originalname || "").toLowerCase() || ".jpg");
    const dir = join(process.cwd(), "uploads", safeFolder);
    try {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(join(dir, `${unique}${ext}`), file.buffer);
    } catch (error) {
      this.logger.error("Enregistrement local de l'image impossible", error as any);
      throw new InternalServerErrorException("Impossible d'enregistrer la photo. Réessayez.");
    }
    return `/uploads/${safeFolder}/${unique}${ext}`;
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    if (!files?.length) return [];
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  extractPublicId(url: string): string | null {
    if (!url?.includes("res.cloudinary.com")) return null;
    try {
      const afterUpload = url.split("/upload/")[1];
      if (!afterUpload) return null;
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");
      return decodeURIComponent(withoutExt);
    } catch {
      return null;
    }
  }

  async deleteByUrl(url: string | null | undefined): Promise<void> {
    if (url?.startsWith("/uploads/")) {
      const rel = url.replace(/^\/uploads\//, "");
      if (!rel.includes("..")) await fsp.unlink(join(process.cwd(), "uploads", rel)).catch(() => undefined);
      return;
    }
    if (!url || !this.configured()) return;
    const publicId = this.extractPublicId(url);
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    } catch (error) {
      this.logger.warn(`Cloudinary delete failed for ${publicId}`, error);
    }
  }
}
