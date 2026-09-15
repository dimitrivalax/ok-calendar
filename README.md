# Ok! Calendar

**English summary:** Ok! Calendar is an open-source Expo (React Native) calendar app with month, week, day, agenda views, local SQLite storage synced with device calendars, local notifications, and UI in **English (default/fallback)** and **French**. Licensed under **EUPL-1.2**. See [`docs/`](docs/README.md) for full specifications.

---

## Présentation

Ok! Calendar est une application calendrier **open source** (Expo SDK 57, React Native) visant une expérience proche de Google Calendar :

- Vues **mois / année / jour / planning**
- CRUD d’événements (titre, journée entière, horaires, récurrence, description, lieu, URL, rappels)
- Connexion aux **calendriers du device** (lecture + écriture si autorisé)
- Stockage **local SQLite** + sync device
- **Notifications locales**
- UI **gluestack-ui** ; i18n **EN** (défaut) + **FR**

## Documentation

| Doc | Contenu |
|-----|---------|
| [docs/README.md](docs/README.md) | Index de la documentation |
| [docs/SPECS.md](docs/SPECS.md) | Spécification produit & technique (contrat d’implémentation) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture |
| [docs/adr/](docs/adr/README.md) | Architecture Decision Records |
| [AGENTS.md](AGENTS.md) | Instructions pour agents d’implémentation |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution |

## Prérequis

- Node.js LTS
- Expo CLI / `npx expo`
- **Development build** (`expo-dev-client`) — `expo-calendar` (API class SDK 57) n’est **pas** supporté dans Expo Go
- Device réel recommandé pour calendrier OS et notifications

## Quick start (développement)

```bash
cd Ok-Calendar
npm install
npx expo install   # aligner les packages natifs sur le SDK
# Configurer expo-dev-client + plugins (voir docs/DEVELOPMENT.md)
npx expo start --dev-client
```

Détails : [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Licence

[European Union Public Licence v1.2 (EUPL-1.2)](LICENSE).

## Statut

La **spécification et la documentation OSS** sont en place. L’implémentation applicative suit [docs/SPECS.md](docs/SPECS.md) et [docs/ROADMAP.md](docs/ROADMAP.md).
