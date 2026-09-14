# Instructions pour agents (Ok-Calendar)

Expo **a changé**. Avant tout code, lire les docs pinnées SDK **57** : https://docs.expo.dev/versions/v57.0.0/

Installer les packages natifs avec **`npx expo install`**, jamais un bump SDK ad hoc.

## Ordre de lecture obligatoire

1. Ce fichier (`AGENTS.md`)
2. Skills Expo pertinentes (tableau ci-dessous) — toujours commencer par **`expo-overview`**
3. Rules React [`.cursor/rules/react/`](.cursor/rules/react/)
4. [docs/SPECS.md](docs/SPECS.md) (contrat produit/technique)
5. [docs/adr/README.md](docs/adr/README.md) (pourquoi des décisions)
6. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → [SYNC.md](docs/SYNC.md) → [I18N.md](docs/I18N.md) → [TESTING.md](docs/TESTING.md)

En cas de conflit entre docs satellites et SPECS : **SPECS prime** jusqu’à mise à jour explicite. Le *pourquoi* vit dans les ADR.

## Skills Expo — [`.agents/skills/`](.agents/skills/)

| Skill | Quand lire |
|-------|------------|
| `expo-overview` | **Toujours en premier** : docs v57, `npx expo install` |
| `expo-router` | Routes, Stack/modals/formSheet, deep links — routes **uniquement** sous `src/app/`, pas de composants co-localisés dans `app/`, kebab-case |
| `expo-dev-client` | Dev builds, config plugins calendrier/notifs |
| `expo-native-ui` | Layouts, SQLite/storage, contrôles natifs |
| `expo-design-system` | Étendre gluestack/NativeWind — **pas** de second design system |
| `expo-ui` | Consulter avant sheets/pickers ; **gluestack reste le kit produit** (ADR-0004) |
| `expo-data-fetching` | États loading/error/empty/content |
| `expo-animation` | Reanimated ; sheets via formSheet Expo, pas `@gorhom/bottom-sheet` par défaut |
| `eas-workflows` | Uniquement CI EAS YAML |
| `eas-simulator` | Uniquement cloud sim — pas le défaut macOS local |
| `expo-project-structure` | Ne pas restructurer l’app pour coller au skeleton |
| `expo-web-to-native` | Hors scope |

## Rules React — [`.cursor/rules/react/`](.cursor/rules/react/)

Appliquer : `coding-style.md`, `hooks.md`, `patterns.md`, `security.md`, `testing.md`.

- Pas de hooks conditionnels ; pas de state dérivé en `useEffect` ; pas de `useMemo`/`useCallback` par défaut (React Compiler)
- Context low-frequency seulement (i18n, thème) ; `EventForm` → **React Hook Form**
- Valider URLs (`http`/`https`/`mailto`) avant `Linking.openURL` ; pas de `dangerouslySetInnerHTML` non sanitizé
- Unit : **Vitest + RTL** ; E2E : **Playwright** web — ne pas mélanger Playwright Component Testing + RTL
- Parties Next.js / RSC / Server Actions des rules : **N/A** (Expo Router RN)

## Décisions produit figées (rappel)

- SQLite = source de vérité app ; device = réplique ([ADR-0002](docs/adr/0002-sqlite-source-of-truth.md), [ADR-0003](docs/adr/0003-device-calendar-sync.md))
- `expo-dev-client` obligatoire ([ADR-0001](docs/adr/0001-expo-dev-client.md))
- gluestack-ui v5 ([ADR-0004](docs/adr/0004-gluestack-ui.md))
- i18n : **`en` défaut + fallback**, `fr` complète ([ADR-0009](docs/adr/0009-i18n-fr-en.md))
- Licence **EUPL-1.2** ([ADR-0007](docs/adr/0007-eupl-1.2-license.md))

## Ordre d’implémentation

Voir [docs/SPECS.md](docs/SPECS.md) §10 et [docs/ROADMAP.md](docs/ROADMAP.md).
