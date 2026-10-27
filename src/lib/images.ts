// Build-time image optimization. A 5 MB phone photo used as an avatar is resized to the few
// sizes the page actually shows and converted to WebP, so pages stay fast whatever is uploaded.
// Originals in public/ are left alone; the page simply stops pointing at them.
import { join, parse } from 'node:path';
import sharp from 'sharp';

/** Where optimized copies are written in the built site. */
export const IMAGE_DIR = 'folio-images';

const RASTER = /\.(jpe?g|png|webp|avif|tiff?)$/i;

/** Avatars show at 96 CSS px; images fill a column up to 480 CSS px. Covers 1x–3x screens. */
const WIDTHS = { avatar: [96, 192, 288], image: [480, 960, 1440] } as const;

export type ImageRole = keyof typeof WIDTHS;

export interface Variant {
  /** File name inside IMAGE_DIR. */
  file: string;
  /** Path of the original, relative to public/. */
  source: string;
  width: number;
  /** Avatars are cropped square. */
  square: boolean;
}

export interface OptimizedImage {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
}

export function isOptimizable(src: string): boolean {
  return !/^https?:\/\//i.test(src) && RASTER.test(src);
}

async function size(publicDir: string, source: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(join(publicDir, source)).rotate().metadata();
  // EXIF orientation 5–8 means the stored image is sideways.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = (turned ? meta.height : meta.width) ?? 0;
  const height = (turned ? meta.width : meta.height) ?? 0;
  return { width, height };
}

/** The sizes worth generating: never wider than the original, no duplicates. */
export async function variants(
  publicDir: string,
  source: string,
  role: ImageRole,
): Promise<Variant[]> {
  const { width: original } = await size(publicDir, source);
  const square = role === 'avatar';
  const widths = [...new Set(WIDTHS[role].map((w) => Math.min(w, original)))].filter((w) => w > 0);
  const stem = parse(source).name.replace(/[^\w-]+/g, '-');
  return widths.map((width) => ({
    file: `${stem}-${width}${square ? '-sq' : ''}.webp`,
    source,
    width,
    square,
  }));
}

/** The src, srcset and intrinsic size to put on the <img>. Non-raster and remote images pass through. */
export async function optimize(
  publicDir: string,
  src: string,
  role: ImageRole,
): Promise<OptimizedImage> {
  if (!isOptimizable(src)) return { src };
  const list = await variants(publicDir, src, role);
  const { width, height } = await size(publicDir, src);
  const url = (v: Variant) => `${IMAGE_DIR}/${v.file}`;
  const largest = list.at(-1);
  if (!largest) return { src };
  return {
    src: url(largest),
    srcset: list.map((v) => `${url(v)} ${v.width}w`).join(', '),
    ...(role === 'avatar' ? { width: 96, height: 96 } : { width, height }),
  };
}

export async function render(publicDir: string, variant: Variant): Promise<Buffer> {
  const image = sharp(join(publicDir, variant.source)).rotate();
  const resized = variant.square
    ? image.resize({ width: variant.width, height: variant.width, fit: 'cover' })
    : image.resize({ width: variant.width, withoutEnlargement: true });
  return resized.webp({ quality: 80 }).toBuffer();
}
