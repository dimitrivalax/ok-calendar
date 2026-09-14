# ADR-0005 : Notifications locales

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

Les rappels doivent fonctionner même en local-only, et idéalement apparaître aussi dans l’écosystème Calendrier OS quand l’event est synchronisé.

## Décision

Utiliser **`expo-notifications`** comme canal principal (ids stables, deep links, i18n) et pousser en complément les **`alarms`** expo-calendar lorsque l’écriture device réussit.

## Conséquences

- Double scheduling à maintenir cohérent
- Permission notifs indépendante du calendrier
- Fenêtre de 90 jours + resync périodique

## Alternatives rejetées

- Alarms OS uniquement — absents en local-only / sans write
- Notifications remote push — hors besoin v1 et complexifie Android
