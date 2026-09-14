# Notifications

**Objectif.** Décrire le scheduling des rappels locaux et les alarms OS. Voir [SPECS.md](SPECS.md) §5, [ADR-0005](adr/0005-local-notifications.md).

## Canaux

1. **`expo-notifications`** — rappels in-app fiables, deep link
2. **`alarms` expo-calendar** — si l’événement est écrit sur le device (intégration app Calendrier OS)

Les deux coexistent : pas l’un ou l’autre exclusif.

## Permission

Demander au premier rappel ou depuis Settings. Refus → CRUD OK ; message Settings.

## Identifiants stables

```
notif:{eventId}:{reminderId}:{occurrenceStartIso}
```

Permet cancel/reschedule sans fuite de notifs orphelines.

## Fenêtre de schedule

Occurrences expansées sur **90 jours** glissants. Au-delà : `resyncWindow` périodique (foreground / après sync).

## Offsets

| type | Calcul |
|------|--------|
| `at_event` | `startAt` occurrence |
| `minutes_before` | `startAt - value minutes` |
| `hours_before` | `startAt - value hours` |
| `days_before` | `startAt - value days` |

Ne pas schedule dans le passé.

## Contenu

Titre / corps via i18n namespace `notifications` (locale courante). Ne pas hardcoder.

## Deep link

Tap → `okcalendar://event/{localEventId}` (scheme `okcalendar` déjà dans `app.json`).

## API

`syncForEvent` / `cancelForEvent` / `resyncWindow` — [DATA_MODEL.md](DATA_MODEL.md).
