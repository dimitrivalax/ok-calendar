# UI / UX

**Objectif.** Règles gluestack-ui, mapping composants, vues calendrier custom, convention `testID`. Voir [ADR-0004](adr/0004-gluestack-ui.md), skill `expo-design-system`.

## Kit

- **gluestack-ui v5** + NativeWind installé **dans** le projet Expo existant (pas de scaffold qui écrase l’app)
- Provider : `GluestackUIProvider` dans `src/app/_layout.tsx`
- Dark mode : tokens gluestack + `userInterfaceStyle: automatic`
- Ne pas utiliser `@nativecn/cli` / `@expo/ui` comme stack concurrente ; consulter skill `expo-ui` avant sheets natifs si besoin ponctuel documenté

## Mapping chrome app

| Besoin | Composant gluestack |
|--------|---------------------|
| Layout | Box, VStack, HStack |
| Texte | Text, Heading |
| Actions | Button, Fab, Pressable |
| Form | FormControl, Input, Textarea, Switch, Checkbox, Select |
| Feedback | Spinner, Toast, Alert, Badge |
| Overlay | Modal, Actionsheet, AlertDialog |
| Liste settings | Switch + Text rows |

`EventForm` : **React Hook Form** + contrôles gluestack.

Pickers date/heure : DateTimePicker/Calendar gluestack (alpha) si stables sur SDK 57 ; sinon `@react-native-community/datetimepicker` wrappé FormControl.

## Vues calendrier (custom)

Le Calendar gluestack = sélecteur de date, **pas** multi-vues Google Calendar.

Composer avec primitives : `MonthView`, `YearView`, `DayView`, `AgendaView` dans `src/components/calendar/`.

- **Month** : grille 6×7, pastilles couleur
- **Year** : 12 mini-mois
- **Day** : timeline 0–24h + bande all-day ; chevauchements en colonnes
- **Planning** : liste groupée par jour (`FlatList` / FlashList — pas List `@expo/ui`)

## testID

Attributs stables, **indépendants de la langue**, pour E2E :

Exemples : `view-switcher`, `view-month`, `view-year`, `view-day`, `view-agenda`, `fab-new-event`, `event-form`, `event-title-input`, `btn-save-event`, `calendar-list`, `settings-locale`.

Unit RTL : préférer role/label ; `testID` en dernier recours (rules testing).

## Accessibilité

Labels i18n sur contrôles interactifs ; contrastes thème gluestack.
