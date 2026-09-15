# Tests

**Objectif.** Stratégie de test : Vitest + RTL (unit/composants) et Playwright (E2E web). Voir [ADR-0008](adr/0008-playwright-e2e.md), rules `testing.md`.

## Pyramide

| Couche | Outil | Cible |
|--------|-------|--------|
| Unit / domain | Vitest | récurrence, validation URL, LWW helpers |
| Composants / hooks | Vitest + RTL | formulaires, listes, bascule vue |
| E2E | Playwright | parcours critiques Expo **web** |
| Manuel | Device | calendrier OS, notifs natives |

Ne **pas** mélanger Playwright Component Testing et RTL dans le même repo.

## Unit / RTL

- Queries : role → label → text → `testID` en dernier recours
- `userEvent` async
- Providers wrapper (`I18n`, thème gluestack, DB test)
- Pas de snapshots de composants

Scripts cibles (à l’implémentation) : `test`, `test:watch`.

## E2E Playwright

### Périmètre

- Navigation 4 vues + Aujourd’hui
- CRUD événement local
- Validation formulaire
- Affichage récurrence
- Calendriers mock / local-only
- Bascule i18n EN ↔ FR

### Hors périmètre

- Calendrier système iOS/Android
- Notifications OS réelles
- Dev client natif

### Technique

- `playwright.config.ts`, baseURL locale, projet **Chromium**
- Scripts : `test:e2e`, `test:e2e:ui`
- Locale de test forcée **`en`** par défaut
- `CalendarService` mock si `Platform.OS === 'web'`
- Sélecteurs `data-testid` / `testID` langue-indépendants
- Reset storage / SQLite web entre tests

### Scénarios minimaux

1. `views.navigation`
2. `event.create-edit-delete`
3. `event.validation`
4. `event.recurrence-display`
5. `calendars.local-only`
6. `i18n.switch-locale`

Voir [../e2e/README.md](../e2e/README.md).

## CI

Workflow GitHub Actions : [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

- **Quality** : `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` (Vitest)
- **E2E** : `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e` (Expo web via `webServer`)

Triggers : push/PR sur `main` et `develop`. Builds natifs EAS hors scope (optionnel via skill `eas-workflows`).
