# Documentation Ok-Calendar

Index de la documentation open source. Langue des docs : **français** (README racine avec résumé anglais).

## Pour les agents

Ordre de lecture : [AGENTS.md](../AGENTS.md) → skills `.agents/skills` + rules `.cursor/rules/react` → [SPECS.md](SPECS.md) → [adr/](adr/README.md) → [ARCHITECTURE.md](ARCHITECTURE.md) → [SYNC.md](SYNC.md) → [I18N.md](I18N.md) → [TESTING.md](TESTING.md).

**SPECS** = contrat. **ADR** = pourquoi. Les autres docs = détail sans contredire SPECS.

## Catalogue

| Document | Objectif |
|----------|---------|
| [SPECS.md](SPECS.md) | Spécification produit & technique complète |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Couches, flux, structure `src/` |
| [DATA_MODEL.md](DATA_MODEL.md) | DDL SQLite, types, invariants |
| [SYNC.md](SYNC.md) | SyncEngine, conflits, local-only |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Rappels locaux + alarms OS |
| [UI.md](UI.md) | gluestack-ui, vues custom, testID |
| [I18N.md](I18N.md) | EN défaut/fallback + FR |
| [PRIVACY.md](PRIVACY.md) | Local-first, permissions |
| [ROADMAP.md](ROADMAP.md) | Scope v1 / hors scope / idées |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Dev client, permissions, troubleshooting |
| [TESTING.md](TESTING.md) | Vitest+RTL + Playwright E2E |
| [adr/README.md](adr/README.md) | Architecture Decision Records |

E2E : [../e2e/README.md](../e2e/README.md).
