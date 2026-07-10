/**
 * Utility to compress and resize images client-side before storage or upload.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function drawToCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  let width = img.width;
  let height = img.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, ctx };
}

export function compressImage(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.7
): Promise<string> {
  return loadImage(file).then((img) => {
    const { canvas } = drawToCanvas(img, maxWidth, maxHeight);
    return canvas.toDataURL('image/jpeg', quality);
  });
}

export function compressImageToBlob(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.7
): Promise<Blob> {
  return loadImage(file).then((img) => {
    const { canvas } = drawToCanvas(img, maxWidth, maxHeight);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/jpeg', quality);
    });
  });
}
