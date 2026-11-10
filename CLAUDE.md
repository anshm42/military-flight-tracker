# military-flight-tracker

Live + historical map of military, government (worldwide) and FAA LADD aircraft. See `spec.md`.

## Workflow

- Conventional Commits; commit small and often; push to `origin main` after each commit.
- No AI attribution / Co-Authored-By trailers in commits or PRs.
- Use graphify: query `graphify-out/` for codebase questions; run `/graphify . --update` after significant changes.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on anshm42/military-flight-tracker (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
