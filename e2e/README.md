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

## Scénarios prévus

| Fichier (prévu) | Couverture |
|-----------------|------------|
| `views.navigation.spec.ts` | Bascule Mois/Année/Jour/Planning |
| `event.create-edit-delete.spec.ts` | CRUD local |
| `event.validation.spec.ts` | Erreurs formulaire |
| `event.recurrence-display.spec.ts` | Quotidien multi-jours |
| `calendars.local-only.spec.ts` | Toggles mock |
| `i18n.switch-locale.spec.ts` | EN → FR → EN |

## Conventions

- `data-testid` stables (voir [docs/UI.md](../docs/UI.md))
- Locale par défaut des tests : `en`
- Calendrier device : mock web uniquement
