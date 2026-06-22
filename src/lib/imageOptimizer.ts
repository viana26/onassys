/**
 * Utility to compress and resize images client-side before storage or upload.
 */
export function compressImage(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate appropriate scale while preserving aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratioWidth = maxWidth / width;
          const ratioHeight = maxHeight / height;
          const ratio = Math.min(ratioWidth, ratioHeight);
          
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw the resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert the drawing to compressed JPEG base64 string
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = (err) => {
        reject(err);
      };
    };
    
    reader.onerror = (err) => {
      reject(err);
    };
  });
}
