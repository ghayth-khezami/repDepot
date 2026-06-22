import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

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

  private assertConfigured(): void {
    if (!this.configured()) {
      throw new InternalServerErrorException(
        "Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sur Render.",
      );
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    this.assertConfigured();
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException("Fichier image vide");
    }

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    // Client already resizes; Cloudinary optimizes delivery — skip heavy Sharp on server.
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${this.rootFolder}/${folder}`,
            public_id: unique,
            resource_type: "image",
            quality: "auto:eco",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              this.logger.error("Cloudinary upload failed", error);
              reject(
                error ??
                  new InternalServerErrorException("Échec upload Cloudinary"),
              );
              return;
            }
            resolve(result.secure_url);
          },
        )
        .end(file.buffer);
    });
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
