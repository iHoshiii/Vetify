import { AVATAR_MAX_BYTES, AVATAR_MAX_EDGE } from '@shared/limits';
import { base64ByteLength } from '@shared/schemas';

// Tried in order until the encoding fits under the byte ceiling; an avatar has no detail worth the first pass failing over.
const QUALITIES = [0.85, 0.7, 0.55, 0.4];

// Load a chosen file into an image, revoking the temporary object URL once it settles either way.
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
      reject(new Error('That file is not an image we can read.'));
    };
    img.src = url;
  });
}

// Centre-crop to a square, scale to the shared edge, then encode JPEG stepping quality down until it fits.
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error('That image has no size we can read.');

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_MAX_EDGE;
  canvas.height = AVATAR_MAX_EDGE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not process the photo.');

  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  context.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_MAX_EDGE, AVATAR_MAX_EDGE);

  for (const quality of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (base64ByteLength(url.slice(url.indexOf(',') + 1)) <= AVATAR_MAX_BYTES) return url;
  }
  throw new Error('That photo is too detailed to store. Try a different one.');
}
