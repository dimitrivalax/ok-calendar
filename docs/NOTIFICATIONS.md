# Notifications

**Objectif.** Décrire le scheduling des rappels locaux, du digest quotidien et les alarms OS. Voir [SPECS.md](SPECS.md) §5, [ADR-0005](adr/0005-local-notifications.md).

## Canaux

1. **`expo-notifications`** — rappels in-app fiables + digest quotidien, deep link
2. **`alarms` expo-calendar** — si l’événement est écrit sur le device (intégration app Calendrier OS)

Les deux coexistent : pas l’un ou l’autre exclusif.

## Permission

Demander au premier rappel / digest ou depuis Settings. Refus → CRUD OK ; message Settings.

Android : `USE_EXACT_ALARM` (app calendrier) pour `setExactAndAllowWhileIdle` — sans ça, Doze retarde les rappels locaux vs alarms OS. Canal `event-reminders` en importance MAX ; canal `daily-digest` en importance DEFAULT. iOS : `interruptionLevel: timeSensitive` sur les rappels d’événements + entitlement associé.

## Identifiants stables

```
notif:{eventId}:{reminderId}:{occurrenceStartIso}
digest:yyyy-MM-dd
```

Permet cancel/reschedule sans fuite de notifs orphelines.

## Fenêtre de schedule

- Rappels d’événements : occurrences expansées sur **90 jours** glissants.
- Digest quotidien : **14 jours** glissants, recalculé à chaque `resyncWindow` / changement de réglage.

Au-delà : `resyncWindow` périodique (foreground / après sync).

## Offsets (rappels)

| type | Calcul |
|------|--------|
| `at_event` | `startAt` occurrence |
| `minutes_before` | `startAt - value minutes` |
| `hours_before` | `startAt - value hours` |
| `days_before` | `startAt - value days` |

Ne pas schedule dans le passé.

## Digest quotidien

- Réglages KV : `dailyDigestEnabled` (défaut `true`), `dailyDigestTime` (`HH:mm`, défaut `08:30`) — UI entre Thème et Permissions.
- Corps : liste `HH:mm Titre` / all-day ; jour vide → message fun i18n (`digestEmptyBody`).
- Tap → vue jour pour la date du payload (`data.type = dailyDigest`, `data.date`).

## Contenu

Titre / corps via i18n namespace `notifications` (locale courante). Ne pas hardcoder.

## Deep link

- Rappel événement → `/event/{localEventId}` (payload `data.eventId` + `data.url`).
- Digest → vue jour (`setViewMode('day')` + curseur sur `data.date`).

Géré au cold start via `getLastNotificationResponse` et à chaud via le listener de réponse.

## API

`syncForEvent` / `cancelForEvent` / `syncDailyDigest` / `cancelDailyDigest` / `resyncWindow` — [DATA_MODEL.md](DATA_MODEL.md).
