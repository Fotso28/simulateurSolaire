import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/** Abstraction du stockage des médias (Vercel Blob en production, disque local en dev/tests). */
export abstract class MediaStorage {
  /** Enregistre le fichier et renvoie son URL publique. */
  abstract put(key: string, data: Buffer, contentType: string): Promise<string>;
}

export class LocalMediaStorage extends MediaStorage {
  constructor(
    private readonly dir: string,
    private readonly baseUrl: string,
  ) {
    super();
  }

  async put(key: string, data: Buffer): Promise<string> {
    const root = resolve(this.dir);
    const path = resolve(join(root, key));
    if (!path.startsWith(root)) throw new Error('Chemin de média invalide');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return `${this.baseUrl.replace(/\/$/, '')}/${key}`;
  }
}

export class VercelBlobStorage extends MediaStorage {
  constructor(private readonly token: string) {
    super();
  }

  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    const { put } = await import('@vercel/blob');
    const blob = await put(key, data, {
      access: 'public',
      contentType,
      token: this.token,
      addRandomSuffix: false,
      cacheControlMaxAge: 365 * 24 * 3600,
    });
    return blob.url;
  }
}
