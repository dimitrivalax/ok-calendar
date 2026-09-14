# Confidentialité

**Objectif.** Documenter le traitement des données en v1 (local-first).

## Principes

- **Pas de backend applicatif** Ok-Calendar en v1
- **Pas de télémétrie** / analytics tiers imposés par l’app
- Données événements et préférences : **SQLite sur l’appareil**
- Sync calendrier : lecture/écriture via les API OS (`expo-calendar`) vers les calendriers déjà présents sur le device (iCloud, Google account OS, etc.) — hors contrôle réseau direct de l’app

## Permissions

| Permission | Usage |
|------------|--------|
| Calendrier | Afficher et modifier les calendriers/événements device |
| Notifications | Rappels locaux |

Refus calendrier → mode local-only. Refus notifs → CRUD sans rappels push locaux.

## Contenu sensible

Titres, descriptions, lieux, URLs saisis par l’utilisateur restent sur l’appareil (et éventuellement dans le calendrier OS synchronisé par le système).

## Liens

Ouvrir `url` événement uniquement après validation `http`/`https`/`mailto` ([rules security](../.cursor/rules/react/security.md)).
