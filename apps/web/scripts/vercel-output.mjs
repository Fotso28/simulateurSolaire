#!/usr/bin/env node
/**
 * Génère la sortie Vercel du projet web (Build Output API v3) après
 * `nx build web` : `apps/web/.vercel/output/{static,config.json}`.
 *
 * - L'origine de l'API vient de la variable `API_ORIGIN` (ex.
 *   `https://simulateur-solaire-api.vercel.app`) : rien n'est codé en dur.
 * - La CSP autorise exactement les scripts et gestionnaires en ligne présents
 *   dans `index.html`, dont les empreintes sha256 sont calculées ici.
 *
 * Usage : API_ORIGIN=https://… node apps/web/scripts/vercel-output.mjs [dist]
 */
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(
  process.argv[2] ?? join(webDir, '../../dist/apps/web/browser'),
);
const out = join(webDir, '.vercel/output');

/**
 * Origine de l'API. `{branch}` est remplacé par la branche Git du déploiement
 * (`VERCEL_GIT_COMMIT_REF`, au format des alias Vercel) : une prévisualisation
 * du web vise ainsi la prévisualisation de l'API de la même branche, reliée à
 * sa propre branche Neon, jamais la production.
 */
export function apiOrigin(
  raw = process.env.API_ORIGIN,
  branch = process.env.VERCEL_GIT_COMMIT_REF ?? '',
) {
  if (!raw) {
    throw new Error(
      'API_ORIGIN manquante : définissez-la dans le projet Vercel « web » (voir docs/DEPLOIEMENT.md).',
    );
  }
  const slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (raw.includes('{branch}') && !slug) {
    throw new Error(
      'API_ORIGIN contient {branch} mais VERCEL_GIT_COMMIT_REF est vide.',
    );
  }
  const url = new URL(raw.replaceAll('{branch}', slug));
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error(`API_ORIGIN doit être en https : ${raw}`);
  }
  return url.origin;
}

const sha = (s) =>
  `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

/** Empreintes des `<script>` en ligne et des attributs `on*="…"` d'un HTML. */
export function inlineHashes(html) {
  const scripts = [
    ...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  ]
    .map((m) => m[1])
    .filter((s) => s.trim() !== '');
  const handlers = [
    ...html.matchAll(/\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi),
  ].map((m) =>
    (m[1] ?? m[2])
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&'),
  );
  return {
    scripts: [...new Set(scripts.map(sha))],
    handlers: [...new Set(handlers.map(sha))],
  };
}

export function contentSecurityPolicy(html) {
  const { scripts, handlers } = inlineHashes(html);
  const scriptSrc = [
    "'self'",
    ...(handlers.length ? ["'unsafe-hashes'"] : []),
    ...scripts,
    ...handlers,
  ].join(' ');
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function routes(api, csp) {
  const cache = (src, value) => ({
    src,
    headers: { 'Cache-Control': value },
    continue: true,
  });
  return [
    {
      src: '^/(?!api/).*$',
      headers: {
        'Content-Security-Policy': csp,
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy':
          'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'no-cache',
      },
      continue: true,
    },
    cache(
      '^/(?:main|chunk|polyfills|styles)-[A-Za-z0-9_-]{8,}\\.(?:js|css)$',
      'public, max-age=31536000, immutable',
    ),
    cache(
      '^/fonts/.*$',
      'public, max-age=2592000, stale-while-revalidate=86400',
    ),
    cache(
      '^/icons/.*$',
      'public, max-age=86400, stale-while-revalidate=604800',
    ),
    cache(
      '^/(?:index\\.html|ngsw-worker\\.js|ngsw\\.json|safety-worker\\.js|worker-basic\\.min\\.js|manifest\\.webmanifest)?$',
      'no-cache, no-store, must-revalidate',
    ),
    { src: '^/api/(.*)$', dest: `${api}/api/$1` },
    { handle: 'filesystem' },
    // Repli SPA : routes Angular (/mode, /s/:token, /admin…).
    {
      src: '^/.*$',
      dest: '/index.html',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    },
  ];
}

function main() {
  const api = apiOrigin();
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(dist, join(out, 'static'), { recursive: true });
  const config = {
    version: 3,
    routes: routes(api, contentSecurityPolicy(html)),
  };
  writeFileSync(
    join(out, 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  console.log(`Sortie Vercel écrite dans ${out} (API : ${api}).`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
