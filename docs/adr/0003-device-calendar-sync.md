# ADR-0003 : Sync calendriers device

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

Besoin produit : CRUD sur calendriers système si possible, et double stockage local + device. Expo ne fournit pas de flux de sync bidirectionnel clé en main.

## Décision

Implémenter un **SyncEngine** maison : push après CRUD, pull sur fenêtres de dates, conflits **Last-Write-Wins**, permissions full access, mode local-only si refus. CRUD device seulement si `allowsModifications`.

## Conséquences

- Comportement prévisible documenté dans SYNC.md
- Pas de sync temps réel background en v1
- Tests device manuels nécessaires

## Alternatives rejetées

- Write-only iOS permission — empêche le pull
- Device comme seule source de vérité — voir ADR-0002
- Backend cloud de sync — hors scope v1
