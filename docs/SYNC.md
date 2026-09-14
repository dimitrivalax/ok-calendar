# Synchronisation calendriers device

**Objectif.** Spécifier le SyncEngine : push/pull, conflits LWW, mode local-only. Voir [SPECS.md](SPECS.md) §3, [ADR-0003](adr/0003-device-calendar-sync.md).

## Permissions

- Demander l’accès calendrier **complet** (lecture + écriture). Jamais write-only (bloque le pull).
- Si refus ou indisponible (web) : **local-only** — CRUD SQLite + notifs app ; banner UI.

## Déclencheurs

- Après chaque CRUD local réussi
- `AppState` → `active`
- Pull-to-refresh utilisateur
- Intervalle foreground optionnel (~60 s)

Pas d’observer EventKit dans Expo → pas de sync background temps réel en v1.

## Fenêtre

Pull par défaut : `[aujourd’hui − 12 mois, aujourd’hui + 24 mois]` (constante configurable).

## Push (origin = app)

1. Créer/mettre à jour l’événement device sur le calendrier lié (`allowsModifications`)
2. Mettre à jour `device_event_id`, `sync_map`, `sync_status = synced`
3. En échec : `pending` ou `error` ; badge UI ; retry au cycle suivant
4. Pousser `alarms` OS alignés sur les rappels locaux

## Pull (origin = device ou remap)

1. `listEvents` sur calendriers `syncEnabled` + visibles
2. Pour chaque event device : match `sync_map.device_event_id` ou heuristique recreate
3. Appliquer LWW (ci-dessous)
4. Soft-delete local des events device disparus de la fenêtre (si origin device)

## Last-Write-Wins

Comparer `events.updated_at` (local) et `lastModifiedDate` (device).

| Cas | Vainqueur |
|-----|-----------|
| Local plus récent | Local → push |
| Device plus récent | Device → écraser miroir local |
| Égalité, `origin=device` | Device |
| Égalité, `origin=app` | Local |

## Calendriers read-only

`allowsModifications === false` : affichage + `isVisible` seulement ; aucun write.

## IDs instables

Si `get(deviceEventId)` échoue après resync compte OS : recreate device event + remap `sync_map`.

## Indicateurs UI

- Badge / Toast « non synchronisé » si `pending|error`
- Action Settings « Synchroniser maintenant » → `pull` + `pushAllPending`
