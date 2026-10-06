# E2E (Playwright)

Tests end-to-end contre l’app **Expo web**. Les specs `*.spec.ts` seront ajoutées à l’implémentation. Stratégie : [docs/TESTING.md](../docs/TESTING.md), [ADR-0008](../docs/adr/0008-playwright-e2e.md).

## Prérequis

```bash
npm install
npx playwright install chromium
# démarrer l’app web (port aligné avec playwright.config.ts)
npx expo start --web
```

## Commandes (cibles)

```bash
npm run test:e2e
npm run test:e2e:ui
```

## Scénarios

| Fichier | Couverture |
|---------|------------|
| `views.navigation.spec.ts` | Bascule Mois/Semaine/Jour/Planning |
| `a11y.views.spec.ts` | Scan axe WCAG A/AA sur chaque vue |
| `a11y.settings.spec.ts` | Scan axe sur Réglages |
| `a11y.event-form.spec.ts` | Scan axe sur formulaire nouvel événement |
| `event.create-edit-delete.spec.ts` | CRUD local *(prévu)* |
| `event.validation.spec.ts` | Erreurs formulaire *(prévu)* |
| `event.recurrence-display.spec.ts` | Quotidien multi-jours *(prévu)* |
| `calendars.local-only.spec.ts` | Toggles mock *(prévu)* |
| `i18n.switch-locale.spec.ts` | EN → FR → EN *(prévu)* |

## Accessibilité (axe)

Les specs `a11y.*.spec.ts` utilisent [`@axe-core/playwright`](https://playwright.dev/docs/accessibility-testing) via la fixture `e2e/axe-test.ts` (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`). Les résultats complets du scan sont attachés au rapport Playwright.

Les assertions comparent un **fingerprint** des violations connues (`e2e/a11y-utils.ts` + snapshots `*-snapshots/`) plutôt que d’exiger zéro violation d’emblée — toute nouvelle règle, ou un changement de compte / `data-testid` associé, fait échouer le test. Objectif : réduire les snapshots vers `[]`.

Lancer uniquement les a11y :

```bash
npm run test:e2e -- a11y
# après un vrai correctif a11y :
npm run test:e2e -- a11y --update-snapshots
```

## Conventions

- `data-testid` stables (voir [docs/UI.md](../docs/UI.md))
- Locale par défaut des tests : `en`
- Calendrier device : mock web uniquement
- A11y : importer `test` / `expect` depuis `./axe-test`, pas depuis `@playwright/test`
