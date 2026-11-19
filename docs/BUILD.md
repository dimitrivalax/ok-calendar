# Builds & publication (EAS)

**Objectif.** Créer un build Android (ou iOS) via EAS (cloud ou local) et le publier. Voir aussi [DEVELOPMENT.md](DEVELOPMENT.md) pour le setup local / dev client.

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

## Build local (sans quota cloud)

Le plan Free Expo limite les builds **cloud** (15 Android + 15 iOS / mois calendaire). Au-delà, les builds cloud sont bloqués jusqu’au 1er du mois suivant (pas de surcoût). Pour continuer sans attendre ni upgrader : lancer le **même pipeline EAS sur la machine**.

### Quand l’utiliser

- Quota Free cloud atteint
- Debug d’un échec de build cloud difficile à reproduire autrement
- Politique interne qui limite le CI tiers (seul contact Expo : existence du projet + credentials managés)

### Deux niveaux (ne pas confondre)

| Besoin | Commande | Artefact EAS |
|--------|----------|--------------|
| Compiler / lancer en dev sur device ou émulateur | `npx expo run:android` / `npx expo run:ios` | Non — voir [DEVELOPMENT.md](DEVELOPMENT.md) |
| Même pipeline qu’un build EAS cloud (APK/AAB/IPA) | `eas build … --local` | Oui, produit localement |

### Prérequis machine

Commun (comme en cloud) :

```bash
cd Ok-Calendar
npm install
eas login
eas whoami
```

Les credentials managés restent téléchargées depuis Expo après login.

| Plateforme | Outils requis |
|------------|---------------|
| Android | Android Studio / SDK Android, JDK |
| iOS | macOS, Xcode, CocoaPods ; compte Apple Developer pour le signing |

Limites Expo en local :

- une seule plateforme par commande (`--platform all` désactivé)
- champs `image` / versions logicielles dans `eas.json` ignorés (environnement = ta machine)
- pas de cache EAS ; secrets EAS « Secret » non injectés (les définir en variables d’env locales si besoin)

### Commandes

Depuis `Ok-Calendar` :

```bash
# Android — tests internes / release
eas build --platform android --profile preview --local
eas build --platform android --profile production --local

# iOS — tests internes / release
eas build --platform ios --profile preview --local
eas build --platform ios --profile production --local
```

Le build tourne sur la machine (Gradle / Xcode). Il **ne consomme pas** le quota cloud Free.

### Artefacts

Par défaut, l’APK/AAB/IPA est copié dans le **répertoire courant** à la fin du build.

Pour forcer un dossier de sortie :

```bash
EAS_LOCAL_BUILD_ARTIFACTS_DIR=./artifacts eas build --platform android --profile preview --local
```

- Preview Android : installer l’APK sur device (sources inconnues si besoin).
- Production : `eas submit` reste possible avec l’artefact (credentials Play / App Store déjà configurés) — voir section Submit ci-dessous.

### Troubleshooting local

| Symptôme | Piste |
|----------|--------|
| SDK / NDK / Xcode manquant | Installer Android Studio ou Xcode ; ouvrir une fois pour accepter les licences |
| Credentials / signing | `eas credentials -p android` ou `-p ios` ; rester loggé (`eas login`) |
| Logs build effacés après échec | `EAS_LOCAL_BUILD_SKIP_CLEANUP=1` (et éventuellement `EAS_LOCAL_BUILD_WORKINGDIR=…`) puis inspecter le dossier de travail |
| Échec natif local mais pas en cloud | Aligner Node / JDK / outils avec ce que le cloud utilise ; ou comparer les logs cloud |

Doc Expo : [Run EAS Build locally](https://docs.expo.dev/build-reference/local-builds/).

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
| Dev quotidien device | `eas build --profile development` (cloud ou `--local`) puis `npx expo start --dev-client` — ou `npx expo run:android` / `run:ios` |
| QA interne | `eas build --profile preview` (cloud ou `--local`) |
| Store | `eas build --profile production` (cloud ou `--local`) puis `eas submit` |
| Quota cloud épuisé | `eas build … --local` (section Build local) |

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
| Quota cloud Free dépassé | Attendre le reset mensuel, upgrader le plan, ou `eas build … --local` |

## Références

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Build local](https://docs.expo.dev/build-reference/local-builds/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App credentials](https://docs.expo.dev/app-signing/app-credentials/)
