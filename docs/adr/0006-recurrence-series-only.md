# ADR-0006 : Récurrence série entière uniquement

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

L’API class `expo-calendar` SDK 57 ne permet pas d’update/delete ciblant une seule occurrence via `recurringEventOptions` (disponible surtout en legacy).

## Décision

En v1, toute édition ou suppression d’un événement récurrent s’applique à la **série entière**. L’UI ne propose pas « cette occurrence / suivantes ». Expansion locale des occurrences pour l’affichage.

## Conséquences

- Implémentation sync plus simple
- Limitation produit à documenter clairement
- V2 possible via legacy API ou `editInCalendar` natif

## Alternatives rejetées

- Forcer `expo-calendar/legacy` pour instance edits dès v1 — dette et divergence API
- Bloquer toute récurrence — trop restrictif vs besoin produit
