# Import de fichiers `.ics`

**Objectif.** Décrire l’import natif d’événements iCalendar (`.ics`, RFC 5545) ouverts depuis d’autres applications (e-mails, Doctolib, gestionnaire de fichiers, etc.) sur Android et iOS. Complète [ARCHITECTURE.md](ARCHITECTURE.md) et [DATA_MODEL.md](DATA_MODEL.md).

## Flux de bout en bout

```mermaid
flowchart LR
  OS[OS Android_iOS] --> Intent["+native-intent.ts"]
  Intent --> Reader[icsFileReader]
  Reader --> Parser[icsParser]
  Parser --> Draft[icsImportDraft]
  Draft --> NewScreen["/event/new?importId=..."]
  NewScreen --> Form[EventForm]
  Form --> Repo[EventRepository + SyncEngine]
```

1. **Réception OS** — l’utilisateur ouvre un fichier `.ics` avec Ok! Calendar (Intent Android `ACTION_VIEW` ou Document Type iOS).
2. **Interception routeur** — [`src/app/+native-intent.ts`](../src/app/+native-intent.ts) (`redirectSystemPath`) détecte les URI système `content://` et `file://` (`isIcsSystemUri`).
3. **Lecture sécurisée** — [`src/services/icsFileReader.ts`](../src/services/icsFileReader.ts) (`readIcsFile`) lit le contenu via `expo-file-system`, vérifie la taille max (**2 Mo**) et nettoie le fichier temporaire iOS dans `Documents/Inbox/`.
4. **Parsing RFC 5545** — [`src/domain/icsParser.ts`](../src/domain/icsParser.ts) (`parseFirstIcsEvent`, basé sur `ical.js`) convertit le premier `VEVENT` en brouillon `IcsEventDraft` (`Partial<CalendarEvent>`).
5. **Transport en mémoire** — [`src/services/icsImportDraft.ts`](../src/services/icsImportDraft.ts) enregistre le résultat sous un identifiant `ics-<n>` (store borné à **5 entrées**, lectures idempotentes pour React StrictMode) puis redirige vers `/event/new?importId=...`.
6. **Validation & création** — [`src/app/event/new.tsx`](../src/app/event/new.tsx) pré-remplit `EventForm` (sans enregistrer automatiquement). À la soumission : `EventRepository.create` → `SyncEngine.pushEvent` → `refresh()` → `setCursorDate(startAt)` → `clearIcsImportPayload(importId)`.

## Configuration native

Le plugin Expo [`plugins/withIcsFileHandler.js`](../plugins/withIcsFileHandler.js) est déclaré dans [`app.json`](../app.json) (`./plugins/withIcsFileHandler`) et appliqué lors du prebuild / build EAS.

### Android (`AndroidManifest.xml`)

Ajoute trois `intent-filter` `android.intent.action.VIEW` (`DEFAULT`, `BROWSABLE`) sur `.MainActivity` :

1. **Par type MIME** (`content://` et `file://`) : `text/calendar`, `application/ics`, `text/x-vcalendar` — couvre les URI sans extension `.ics` (ex. pièces jointes Gmail, Doctolib).
2. **Par extension avec MIME générique** (`*/*`) : motifs `.*\.ics`, `.*\..*\.ics`, `.*\..*\..*\.ics`, `.*\.ICS` — couvre les fichiers servis en `application/octet-stream` (ex. Téléchargements).
3. **Par extension sans MIME** : mêmes motifs lorsque l’Intent ne fournit pas de type MIME.

### iOS (`Info.plist`)

- Enregistre `CFBundleDocumentTypes` avec l’UTI `com.apple.ical.ics` et `LSHandlerRank: Alternate`.
- Définit `LSSupportsOpeningDocumentsInPlace = false` : iOS copie le fichier dans `Documents/Inbox/` avant d’ouvrir l’app, évitant la gestion des security-scoped resources. `readIcsFile` supprime cette copie en best-effort dans un bloc `finally`.

> Toute modification du plugin nécessite un nouveau build natif (`expo prebuild` / EAS Build) — l’import `.ics` n’est pas actif sur Web.

## Parsing iCalendar (`src/domain/icsParser.ts`)

| Propriété ICS | Champ `CalendarEvent` | Règles & fallbacks |
|---------------|-----------------------|--------------------|
| `SUMMARY` | `title` | Trim, tronqué à **200 caractères** (`MAX_TITLE_LENGTH`) |
| `DTSTART` | `startAt` / `allDay` | `VALUE=DATE` → `allDay = true` (00:00 local). Obligatoire (`missing_start` sinon) |
| `DTEND` / `DURATION` | `endAt` | Journée entière : `DTEND` exclusif RFC 5545 converti en dernier jour inclusif (`endOfDay`). Horaire : fallback `+1h` si absent ou `<= startAt` |
| `VTIMEZONE` / `TZID` | résolution instant UTC | Enregistre les blocs `VTIMEZONE` dans `ICAL.TimezoneService` ; sinon résout les fuseaux IANA (ex. `Europe/Paris`) via `Intl.DateTimeFormat` en 2 passes (gestion DST) |
| `DESCRIPTION` | `description` | Trim (`null` si vide) ; lignes repliées et échappements gérés par `ical.js` |
| `LOCATION` | `location` | Trim (`null` si vide) |
| `URL` | `url` | Validé via `safeUrl` (`http`, `https`, `mailto` uniquement) |
| `RRULE` | `recurrence` | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`. Toute contrainte supplémentaire (`INTERVAL > 1`, `COUNT`, `UNTIL`, `BY*`) ou fréquence inconnue marque `unsupportedRecurrence: true` |
| `VALARM` (`TRIGGER`) | `notifications` | Durée relative à `START` ou `END`, ou date absolue ; converti en `minutes_before` / `hours_before` / `days_before` (0 min si au début), dédupliqué ; triggers après `startAt` ignorés |

## Erreurs, notices & i18n

Toutes les chaînes sont dans [`src/i18n/locales/fr/event.json`](../src/i18n/locales/fr/event.json) et [`src/i18n/locales/en/event.json`](../src/i18n/locales/en/event.json).

### Bandeau d’erreur (`testID="ics-import-error"`)

Affiché au-dessus du formulaire vide si l’import échoue :

| Code (`IcsImportErrorCode`) | Clé i18n | Cause |
|-----------------------------|----------|-------|
| `read_failed` | `icsImportErrorRead` | Impossible de lire le fichier ou erreur inattendue |
| `file_too_large` | `icsImportErrorTooLarge` | Fichier > 2 Mo (`MAX_ICS_BYTES`) |
| `invalid_ics` | `icsImportErrorInvalid` | Contenu vide, sans `BEGIN:VCALENDAR` ou syntaxe invalide |
| `no_events` | `icsImportErrorNoEvents` | Aucun `VEVENT` dans le fichier |
| `missing_start` | `icsImportErrorMissingStart` | `DTSTART` absent ou invalide |

### Bandeau d’information (`testID="ics-import-notice"`)

Affiché si l’import réussit avec mise en garde :

- **Multi-événements** (`totalEvents > 1`) — `icsImportMultipleNotice` : seul le premier `VEVENT` est pré-rempli.
- **Récurrence simplifiée** (`unsupportedRecurrence`) — `icsImportRecurrenceNotice` : invite à vérifier la répétition avant d’enregistrer.

## Limites connues

- **Un événement par import** : les fichiers multi-`VEVENT` pré-remplissent uniquement le premier événement.
- **Récurrences avancées** : seules les fréquences simples (`daily`, `weekly`, `monthly`, `yearly`) sont supportées par le modèle v1 ; `INTERVAL`, `COUNT`, `UNTIL` et `BY*` ne sont pas conservés.
- **Rappels dans le formulaire** : `EventForm` n’édite actuellement qu’un rappel principal lors de la création.
- **Pas d’import depuis l’UI in-app** : l’import passe par le mécanisme « Ouvrir avec » du système (pas de sélecteur de fichiers interne pour l’instant).

## Tests

- Unitaires Vitest :
  - [`src/domain/icsParser.test.ts`](../src/domain/icsParser.test.ts) (Doctolib `Europe/Paris`, UTC, all-day simple/multi-jours, `DURATION`, `RRULE`, `VALARM`, `URL`, erreurs)
  - [`src/services/icsImportDraft.test.ts`](../src/services/icsImportDraft.test.ts) (stockage idempotent, éviction FIFO)
- Exécution : `pnpm test`
- Validation manuelle sur device (dev client ou build EAS) : ouvrir une pièce jointe `.ics` depuis Mail/Gmail, Doctolib ou le gestionnaire de fichiers et vérifier le pré-remplissage dans `/event/new`.
