# Plan de construction — orchestration

Spécification : `docs/PRD-TRD.md` (PRD + TRD, source de vérité).
Maquettes : `design/maquettes/*.dc.html` (HTML statique + logique JS de démonstration ;
les `<img src="/_blob/...">` sont des icônes non disponibles ici → les redessiner en SVG
au trait, grille 24 px, trait 1,5 px, `currentColor`). `design/maquettes/canvas.json`
liste les écrans. `Fondations.dc.html` = jetons et composants (couleurs, typo IBM Plex).

## Règles communes à toutes les sessions

- Branche unique : `claude/brave-allen-gzzpyl`. Avant chaque push :
  `git pull --rebase origin claude/brave-allen-gzzpyl`, puis
  `git push -u origin claude/brave-allen-gzzpyl`. Ne jamais pousser ailleurs, pas de PR,
  pas de force-push.
- Rester dans son périmètre de dossiers (voir lot). Commits petits et fréquents.
- Avant de pousser : `npx nx run-many -t lint test build` (au minimum sur les projets
  touchés) doit passer.
- Fenêtre de contexte : ne pas dépasser ~200 000 tokens. Si vous approchez de cette
  limite, terminez proprement (commit + push), mettez à jour `docs/STATUS.md` et
  arrêtez-vous en le signalant dans votre dernier message.
- À la fin du lot : mettre à jour la section du lot dans `docs/STATUS.md`
  (fait / reste à faire / écarts vs spec), commit + push, puis dernier message =
  résumé court commençant par `LOT <id> TERMINÉ` ou `LOT <id> BLOQUÉ: <raison>`.
- Français pour l'UI et les messages d'erreur ; code et identifiants en anglais.

## Lots

| Lot | Contenu | Dossiers | Dépend de |
|---|---|---|---|
| L0 | Monorepo Nx, squelettes apps/libs, Tailwind + jetons, types partagés, CI | tout (initial) | — |
| L1 | Moteur de calcul + données de référence + tests (≥ 90 %) | `libs/engine`, `libs/shared-types` | L0 |
| L2 | API NestJS + Prisma + seed + auth + admin + e2e | `apps/api`, `prisma` | L0 (rejeu moteur : L1) |
| L3 | Front parcours particulier (mobile + desktop) | `apps/web` (core, shared, features/particulier) | L1 |
| L4 | Front pro + back-office | `apps/web/src/app/features/{pro,admin}` | L3, L2 |
| L5 | Hors-ligne, PDF, partage, leads, Playwright, déploiement Vercel | `apps/web` (pwa, export), `vercel.json`, CI | L3, L2 |
| L6 | Recette finale : revue complète vs spec, corrections | tout | L4, L5 |
