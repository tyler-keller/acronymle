# Acronymle

Daily acronym puzzle: work out what the letters stand for. Plain HTML/CSS/JS, no build step.

- `puzzles.js`: puzzle list. Daily order starts 2026-10-31; append only. Each non-`~` word must
  contribute exactly its first letter to the acronym (so RADAR/SONAR-style acronyms don't fit).
- `node tools/check-puzzles.js`: validates the list (initials match, letters only, no duplicate
  acronyms) and prints the date the list runs out. Run it after every edit.
- Practice mode: `?practice` (random) or `?practice=N` (0-based).
- Accessibility: tiles are `aria-hidden`; each guess row has a spoken summary, results are announced in
  a live region, on-screen keys keep focus for Tab users and report their state, pinch-zoom is allowed,
  `prefers-reduced-motion` is honored, and text contrast is ≥4.5:1. Checked with axe-core (WCAG 2 A/AA).
