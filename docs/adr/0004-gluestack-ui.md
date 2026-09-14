# ADR-0004 : gluestack-ui

- Statut : Acceptées
- Date : 2026-09-14

## Contexte

Besoin d’un design system cross-platform cohérent. Les skills Expo poussent `@expo/ui` pour certains contrôles natifs ; le produit choisit un kit UI unifié pour chrome et formulaires.

## Décision

Adopter **gluestack-ui v5 + NativeWind** comme kit UI produit. Vues calendrier multi-vues = composants **custom** sur primitives gluestack. Étendre ce système (skill design-system) — pas de second token system. Consulter `expo-ui` avant d’ajouter un sheet natif ponctuel ; l’hybridation doit être documentée.

## Conséquences

- UI homogène forms/listes/FAB
- Travail custom pour Month/Year/Day/Agenda
- Tension maîtrisée avec skills `@expo/ui` (documentée dans AGENTS.md)

## Alternatives rejetées

- `@expo/ui` seul — insuffisant pour multi-vues calendrier et design system complet choisi
- RN StyleSheet nu — trop peu structuré pour un projet OSS
- `@gorhom/bottom-sheet` par défaut — contredit skill expo-ui/animation
