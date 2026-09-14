# ADR-0002 : SQLite source de vérité

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

L’app doit fonctionner sans permission calendrier (local-only) tout en synchronisant vers le device quand c’est possible. expo-calendar n’offre pas d’observer de changements ni de sync engine.

## Décision

Utiliser **`expo-sqlite`** comme **source de vérité** pour les événements créés dans l’app. Le calendrier device est une **réplique** liée via `sync_map`. Les événements purement device sont mirroirés en local avec `origin=device`.

## Conséquences

- Mode local-only robuste
- Métadonnées app (rappels riches, syncStatus) sous contrôle
- Complexité SyncEngine + migrations SQL

## Alternatives rejetées

- Device-only (pas de SQLite) — casse local-only et métadonnées
- AsyncStorage pour les events — inadapté au relationnel et aux plages de dates
