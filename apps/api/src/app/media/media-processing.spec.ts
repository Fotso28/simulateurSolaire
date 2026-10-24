import sharp from 'sharp';
import {
  detectType,
  MAX_IMAGE_BYTES,
  processUpload,
  sanitizeSvg,
} from './media-processing';

const png = () =>
  sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#f5a623' },
  })
    .png()
    .toBuffer();

describe('médias', () => {
  it('détecte le type réel par signature', async () => {
    expect(detectType(await png())).toBe('image/png');
    expect(
      detectType(
        Buffer.from(
          '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>',
        ),
      ),
    ).toBe('image/svg+xml');
    expect(
      detectType(Buffer.from('<html><script></script></html>')),
    ).toBeNull();
  });

  it('nettoie un SVG malveillant', () => {
    const dirty = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)">' +
        '<script>alert(1)</script><foreignObject><div/></foreignObject>' +
        '<a xlink:href="javascript:alert(1)"><rect width="10" height="10" onclick="x()"/></a>' +
        '<use href="https://evil.example/x.svg#a"/></svg>',
    );
    const clean = sanitizeSvg(dirty).toString();
    expect(clean).not.toMatch(
      /script|onload|onclick|foreignObject|javascript:|evil/,
    );
    expect(clean).toContain('<svg');
  });

  it('convertit une image en WebP 512 × 512 de 80 Ko au plus', async () => {
    const out = await processUpload('image', await png());
    expect(out.contentType).toBe('image/webp');
    expect(out.data.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    const meta = await sharp(out.data).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 512, 512]);
  });

  it('refuse un type inattendu ou un fichier trop gros', async () => {
    await expect(processUpload('icon', await png())).rejects.toMatchObject({
      status: 415,
    });
    await expect(
      processUpload('image', Buffer.from('<svg></svg>')),
    ).rejects.toMatchObject({
      status: 415,
    });
    await expect(
      processUpload('image', Buffer.alloc(2 * 1024 * 1024 + 1)),
    ).rejects.toMatchObject({
      status: 413,
    });
  });
});
