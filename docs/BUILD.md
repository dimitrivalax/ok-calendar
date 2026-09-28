# Builds & publication (EAS)

**Objectif.** Créer un build Android (ou iOS) via EAS et le retrouver sur Expo. Voir aussi [DEVELOPMENT.md](DEVELOPMENT.md) pour le setup local / dev client.

## Contexte projet

| Élément | Valeur |
|---------|--------|
| Owner Expo | `dimitri-valax` |
| Slug | `ok-calendar` |
| Project ID | `f744f5fc-6923-411c-81ed-f8e5b3d5a999` |
| Package Android | `com.ok.calendar` |
| Bundle iOS | `com.ok.calendar` |
| Config | `eas.json` + `app.json` → `extra.eas.projectId` |

Dashboard : [expo.dev/accounts/dimitri-valax/projects/ok-calendar](https://expo.dev/accounts/dimitri-valax/projects/ok-calendar)

## Prérequis

```bash
cd Ok-Calendar
npm install
npm install -g eas-cli   # ou npx eas-cli
eas login
eas whoami               # doit correspondre au compte owner
```

Compte Expo lié au projet (`owner: dimitri-valax`). Première build : EAS peut demander de générer les credentials Android (keystore) — accepter la gestion EAS sauf besoin d’un keystore existant.

## Profils EAS (`eas.json`)

| Profil | Usage | Distribution |
|--------|--------|--------------|
| `development` | Dev client (`expo-dev-client`) | internal |
| `preview` | Tests internes (APK/AAB selon config) | internal |
| `production` | Release store (`autoIncrement: true`) | store |

`cli.appVersionSource: "remote"` : le versionCode / buildNumber est géré côté Expo pour `production`.

## Build Android

Depuis `Ok-Calendar` :

```bash
# Tests internes
eas build --platform android --profile preview

# Release (AAB Play Store)
eas build --platform android --profile production
```

Le build tourne sur les serveurs Expo. À la fin :

- lien dans le terminal
- artifact visible sur le dashboard Builds du projet
- téléchargement APK/AAB selon le profil

Lister les builds :

```bash
eas build:list --platform android
```

### Installer un build preview

1. Ouvrir le build sur expo.dev
2. Scanner le QR / télécharger l’APK
3. Installer sur device (sources inconnues si besoin)

## Build iOS (rappel)

```bash
eas build --platform ios --profile preview
eas build --platform ios --profile production
```

Nécessite un compte Apple Developer et des credentials iOS configurés dans EAS.

## Les deux plateformes

```bash
eas build --platform all --profile production
```

## Où est le build sur Expo ?

Dès le lancement, le job apparaît sur Expo — rien à « pousser » manuellement après `eas build`.

- Builds : `https://expo.dev/accounts/dimitri-valax/projects/ok-calendar/builds`
- Ou : `eas build:list`

## Submit Play Store / App Store

Après un build **production** réussi :

```bash
# Dernier build Android → Google Play
eas submit --platform android --profile production --latest

# iOS → App Store Connect
eas submit --platform ios --profile production --latest
```

**Android** : service account Google Play lié dans EAS (credentials project).  
**iOS** : Apple ID / App Store Connect API key selon le flux EAS.

Profil submit actuel (`eas.json`) :

```json
"submit": {
  "production": {}
}
```

## Dev client vs release

| Besoin | Commande typique |
|--------|------------------|
| Dev quotidien device | `eas build --profile development` puis `npx expo start --dev-client` |
| QA interne | `eas build --profile preview` |
| Store | `eas build --profile production` puis `eas submit` |

`expo-calendar` n’est **pas** supporté dans Expo Go : un development build est obligatoire pour le natif. Voir [ADR-0001](adr/0001-expo-dev-client.md).

## Checklist avant production

- [ ] `app.json` → `version` à jour (ex. `1.0.0`)
- [ ] Icônes / splash Android OK
- [ ] Permissions calendrier & notifs cohérentes
- [ ] Tests manuels device (voir [DEVELOPMENT.md](DEVELOPMENT.md))
- [ ] `eas build --platform android --profile production`
- [ ] Vérifier le build sur le dashboard Expo
- [ ] `eas submit` si publication store

## Troubleshooting

| Symptôme | Piste |
|----------|--------|
| `Not logged in` | `eas login` |
| Mauvais projet | Vérifier `extra.eas.projectId` et `owner` dans `app.json` |
| Credentials Android | `eas credentials -p android` |
| Build échoue sur native module | Aligner avec `npx expo install` ; rebuild (pas Expo Go) |
| VersionCode conflit Play | `autoIncrement` + `appVersionSource: remote` déjà en place |
| Package name | `com.ok.calendar` doit matcher la fiche Play |

## Références

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App credentials](https://docs.expo.dev/app-signing/app-credentials/)
