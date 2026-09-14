# Contributing to Ok-Calendar

Merci de contribuer. Ce projet est sous licence [EUPL-1.2](LICENSE).

## Prérequis

- Lire [AGENTS.md](AGENTS.md) (skills Expo + rules React)
- Lire [docs/SPECS.md](docs/SPECS.md) pour le contrat fonctionnel
- Development build (`expo-dev-client`) — voir [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Workflow

1. Fork / branche feature depuis la branche principale
2. Une PR = un sujet cohérent (code **et** docs/i18n si besoin)
3. Titre de PR clair ; décrire le *pourquoi*
4. Cocher la checklist ci-dessous

## Conventions

- TypeScript strict ; composants PascalCase ; hooks `use*`
- Packages natifs : `npx expo install <pkg>`
- Docs Expo : URLs `https://docs.expo.dev/versions/v57.0.0/...` uniquement
- UI : gluestack-ui — ne pas introduire un second design system
- **i18n** : toute nouvelle chaîne UI = clé **EN** + **FR** dans la même PR (`en` = fallback)
- Routes Expo Router uniquement sous `src/app/` ; composants hors `app/`
- Respecter [`.cursor/rules/react/`](.cursor/rules/react/)

## Tests

- Unit / composants : Vitest + React Testing Library — [docs/TESTING.md](docs/TESTING.md)
- E2E web : Playwright — [e2e/README.md](e2e/README.md)
- Manuel device : calendrier OS, notifications, permissions (checklist DEVELOPMENT)

## Checklist PR

- [ ] SPECS / ADR mis à jour si décision ou comportement change
- [ ] Clés i18n EN + FR
- [ ] `testID` stables si nouveau parcours E2E
- [ ] Pas de secrets dans le client
- [ ] URLs utilisateur validées (`http`/`https`/`mailto`)
- [ ] Tests unitaires ou E2E pertinents passent / documentés si non applicables

## Code of Conduct

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
