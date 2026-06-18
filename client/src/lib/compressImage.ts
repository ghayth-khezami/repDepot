const MAX_DIMENSION = 1920;
const MAX_BYTES = 900_000;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.55;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Client-side compression before upload (backoffice → web catalog).
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type.includes('gif')) {
    return file;
  }

  try {
    const img = await loadImage(file);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

    let quality = INITIAL_QUALITY;
    let blob: Blob | null = null;
    while (quality >= MIN_QUALITY) {
      blob = await canvasToBlob(canvas, outputType, quality);
      if (!blob) break;
      if (blob.size <= MAX_BYTES) break;
      quality -= 0.08;
    }

    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${baseName}${ext}`, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageForUpload(f)));
}
