# ADR-0001 : Expo Dev Client obligatoire

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

Ok-Calendar doit lire et écrire les calendriers système via `expo-calendar`. Sous Expo SDK 57, l’API class (`ExpoCalendar`, `ExpoCalendarEvent`) n’est pas supportée dans Expo Go.

## Décision

Exiger **`expo-dev-client`** (development build / EAS) pour le développement et les tests natifs calendrier. Documenter clairement que Expo Go est insuffisant pour cette feature.

## Conséquences

- Setup plus lourd (prebuild / EAS)
- Parité production plus réaliste
- Web reste utilisable pour UI + Playwright avec mock calendrier

## Alternatives rejetées

- Expo Go + `expo-calendar/legacy` uniquement — API dépréciée, non pérenne
- Attendre le support Expo Go de la nouvelle API — bloquant pour le planning produit
