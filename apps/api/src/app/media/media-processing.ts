import { HttpStatus } from '@nestjs/common';
import {
  optimize,
  type CustomPlugin,
  type XastElement,
  type XastParent,
} from 'svgo';
import { ApiError } from '../common/api-error';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const IMAGE_SIZE_PX = 512;
export const MAX_IMAGE_BYTES = 80 * 1024;

export type DetectedType =
  'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | 'image/svg+xml';

const unsupported = () =>
  new ApiError(
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    'UNSUPPORTED_FILE_TYPE',
    'Type de fichier non pris en charge : SVG pour une icône, PNG, JPEG, WebP ou GIF pour une image.',
    'file',
  );

/** Type réel du fichier, d'après sa signature (jamais d'après le nom ou l'en-tête HTTP). */
export function detectType(buf: Buffer): DetectedType | null {
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6)))
    return 'image/gif';
  const head = buf
    .subarray(0, 4096)
    .toString('utf8')
    .replace(/^\uFEFF/, '');
  const stripped = head
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trimStart();
  if (/^<svg[\s>]/i.test(stripped)) return 'image/svg+xml';
  return null;
}

const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'handler',
]);

/** Retire éléments actifs, attributs `on*`, liens externes et styles avec `url(`/`expression(`. */
const stripActiveContent: CustomPlugin = {
  name: 'stripActiveContent',
  fn: () => ({
    element: {
      enter(node: XastElement, parent: XastParent) {
        if (FORBIDDEN_ELEMENTS.has(node.name)) {
          parent.children = parent.children.filter((c) => c !== node);
          return;
        }
        for (const [name, value] of Object.entries(node.attributes)) {
          const v = value.trim().toLowerCase();
          if (
            /^on/i.test(name) ||
            ((name === 'href' || name === 'xlink:href') &&
              !v.startsWith('#')) ||
            (name === 'style' && /url\(|expression\(|javascript:/.test(v))
          ) {
            delete node.attributes[name];
          }
        }
        if (node.name === 'style') {
          parent.children = parent.children.filter((c) => c !== node);
        }
      },
    },
  }),
};

/** Nettoie un SVG contre l'injection de script (svgo, sans DOM). */
export function sanitizeSvg(buf: Buffer): Buffer {
  let data: string;
  try {
    data = optimize(buf.toString('utf8'), {
      multipass: true,
      plugins: ['preset-default', 'removeScripts', stripActiveContent],
    }).data;
  } catch {
    throw ApiError.badRequest(
      'INVALID_SVG',
      'Le fichier SVG est invalide.',
      'file',
    );
  }
  if (/<script|javascript:|<foreignObject|\son\w+\s*=/i.test(data)) {
    throw ApiError.badRequest(
      'INVALID_SVG',
      'Le fichier SVG contient du contenu actif.',
      'file',
    );
  }
  return Buffer.from(data, 'utf8');
}

/** Convertit une image en WebP 512 × 512 (contenue, fond transparent), au plus 80 Ko. */
export async function toWebp(buf: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  for (const quality of [82, 72, 62, 52, 42, 32]) {
    const out = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(IMAGE_SIZE_PX, IMAGE_SIZE_PX, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (out.length <= MAX_IMAGE_BYTES) return out;
  }
  throw ApiError.badRequest(
    'IMAGE_TOO_COMPLEX',
    'Impossible de réduire cette image sous 80 Ko : choisissez une image plus simple.',
    'file',
  );
}

export interface ProcessedMedia {
  data: Buffer;
  contentType: 'image/svg+xml' | 'image/webp';
  extension: 'svg' | 'webp';
}

export async function processUpload(
  kind: 'icon' | 'image',
  buf: Buffer,
): Promise<ProcessedMedia> {
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new ApiError(
      HttpStatus.PAYLOAD_TOO_LARGE,
      'FILE_TOO_LARGE',
      'Fichier trop volumineux (2 Mo maximum).',
      'file',
    );
  }
  const type = detectType(buf);
  if (kind === 'icon') {
    if (type !== 'image/svg+xml') throw unsupported();
    return {
      data: sanitizeSvg(buf),
      contentType: 'image/svg+xml',
      extension: 'svg',
    };
  }
  if (!type || type === 'image/svg+xml') throw unsupported();
  try {
    return {
      data: await toWebp(buf),
      contentType: 'image/webp',
      extension: 'webp',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest(
      'INVALID_IMAGE',
      'Image illisible ou corrompue.',
      'file',
    );
  }
}
