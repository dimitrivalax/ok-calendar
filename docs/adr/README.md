# Architecture Decision Records (ADR)

**Objectif.** Tracer les décisions d’architecture importantes (format MADR léger, en français).

## Règles

- Un fichier = une décision : `NNNN-titre-kebab.md`
- Ne pas réécrire l’historique : nouveau ADR si changement ; ancien → `Dépréciée` / `Remplacée par ADR-XXXX`
- Statuts : `Proposées` | `Acceptées` | `Dépréciées` | `Remplacées par ADR-XXXX`

## Template

```markdown
# ADR-NNNN : Titre

- Statut : Acceptées
- Date : YYYY-MM-DD

## Contexte

## Décision

## Conséquences

## Alternatives rejetées
```

## Index

| ID | Titre | Statut |
|----|--------|--------|
| [0001](0001-expo-dev-client.md) | Expo Dev Client obligatoire | Acceptées |
| [0002](0002-sqlite-source-of-truth.md) | SQLite source de vérité | Acceptées |
| [0003](0003-device-calendar-sync.md) | Sync calendriers device | Acceptées |
| [0004](0004-gluestack-ui.md) | gluestack-ui | Acceptées |
| [0005](0005-local-notifications.md) | Notifications locales | Acceptées |
| [0006](0006-recurrence-series-only.md) | Récurrence série entière | Acceptées |
| [0007](0007-eupl-1.2-license.md) | Licence EUPL-1.2 | Acceptées |
| [0008](0008-playwright-e2e.md) | E2E Playwright | Acceptées |
| [0009](0009-i18n-fr-en.md) | i18n EN + FR | Acceptées |
