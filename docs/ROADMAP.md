# Roadmap

**Objectif.** Clarifier le scope v1, le hors-scope et les pistes futures.

## v1 (contrat SPECS)

- [x] Docs OSS
- [x] gluestack + i18n EN/FR (fondations)
- [x] SQLite + CRUD événements
- [x] 4 vues calendrier
- [x] Notifications locales (service)
- [x] Sync device + local-only (best-effort via `expo-calendar/legacy`)
- [x] Settings (langue, permissions, sync manuel)
- [x] Vitest unit smoke (`src/domain/*.test.ts`) + Playwright scaffold (`e2e/views.navigation.spec.ts`)
- [ ] Dev client iOS/Android validé sur device réel
- [ ] Suite E2E Playwright complète verte en CI

## Hors scope v1

- OAuth Google / Microsoft directs (hors calendrier OS)
- Invitations / participants
- Pièces jointes
- Édition « cette occurrence seulement »
- Multi-fuseaux avancés
- Backend cloud Ok-Calendar
- E2E natif iOS/Android automatisé (Playwright = web)

## Idées v2+

- Édition d’occurrence (API legacy ou UI native)
- Observer / sync plus réactive
- Widgets home screen
- Partage .ics
- Thèmes custom
- Plus de locales
