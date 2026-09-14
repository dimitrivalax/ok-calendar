# Développement

**Objectif.** Guider le setup local, le dev client, les permissions et le dépannage. Voir [AGENTS.md](../AGENTS.md).

## Skills & rules (rappel)

Avant de coder :

1. Skill **`expo-overview`** puis skills pertinentes (`.agents/skills/`)
2. Rules **`.cursor/rules/react/`**
3. [SPECS.md](SPECS.md)

Packages : **`npx expo install`**. Docs : `https://docs.expo.dev/versions/v57.0.0/`.

## Dev client

`expo-calendar` (API class SDK 57) **n’est pas supporté dans Expo Go**. Utiliser `expo-dev-client` + prebuild / EAS Build.

```bash
npx expo install expo-dev-client expo-calendar expo-notifications expo-sqlite expo-localization
# + gluestack / NativeWind selon docs gluestack Expo
npx expo prebuild   # si workflow bare/CNG
npx expo run:ios    # ou run:android / EAS
```

## Plugins & permissions

Configurer dans `app.json` / `app.config` :

- `expo-calendar` : accès **full** (pas write-only) + usage strings iOS
- `expo-notifications`
- `expo-sqlite`
- Scheme `okcalendar` (déjà présent)

## Web

Utile pour Playwright et UI. Calendrier OS : **mock**.

`app.json` → `web.output: "single"` (SPA). Le mode `"static"` déclenche le SSR Node d’Expo Router, cassé avec NativeWind v5 (`View`/`StyleSheet` undefined).

**Metro web** : le remap NativeWind `react-native-web` → `react-native-css` est **désactivé** sur web (cycle FlatList/`default`). RNW accepte déjà `className`. Polyfill conservé sur natif.

**Stockage web** : pas d’`expo-sqlite` (worker WASM fragile avec NativeWind Metro) — store AsyncStorage (`src/db/webDatabase.ts`). Natif = `expo-sqlite`.

Après changement Metro / NativeWind : `npx expo start --web -c`.

Ne pas attendre EventKit sur web.

## Checklist manuelle device

- [ ] Permission calendrier accordée / refusée (local-only)
- [ ] Création événement visible dans l’app Calendrier OS
- [ ] Édition / suppression répliquées
- [ ] Calendrier read-only : pas de write
- [ ] Notification locale à un offset court
- [ ] Deep link depuis notif
- [ ] Bascule EN/FR

## Troubleshooting

| Symptôme | Piste |
|----------|--------|
| Module calendar manquant | Pas Expo Go — rebuild dev client |
| Pull vide | Permission write-only ? → full access |
| Notifs silencieuses | Permission + focus modes OS |
| Sync conflict | Voir [SYNC.md](SYNC.md) LWW |
| Simulateur calendrier vide | Tester sur **device réel** |

## Structure routes

Routes uniquement sous `src/app/` ; composants dans `src/components/` (skill expo-router).
