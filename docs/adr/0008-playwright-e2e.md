# ADR-0008 : E2E Playwright (Expo web)

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

Besoin de tests E2E automatisés. Playwright pilote des navigateurs, pas les apps iOS/Android natives. Le calendrier OS n’existe pas sur web.

## Décision

Adopter **Playwright** contre **Expo web** pour les parcours UI (vues, CRUD local, i18n, mocks calendrier). Couverture native device = checklist manuelle. Unit/composants = Vitest+RTL (pas Playwright CT).

## Conséquences

- CI web possible sans device farm
- Sync/notifs natives hors E2E auto
- Adapter mock `CalendarService` sur web obligatoire

## Alternatives rejetées

- Detox / Maestro seuls en v1 — plus coûteux ; complémentaire possible plus tard
- Pas d’E2E — trop risqué pour un OSS multi-vues
