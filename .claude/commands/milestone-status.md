---
description: Summarize the Bikes v2 Solo todo graph (milestones, blockers, gates, in-flight).
---

# /milestone-status

Solo project **21**. Optional filter: `$ARGUMENTS` (`M0` `M1` `M2` `M3` `M4`
`M5` `ORG` or a todo id). Empty = full graph.

1. `todo_list` project 21 (paginate if needed). `todo_get` only for items
   you must expand (in_progress, blocked gates, or the filter target).
2. Group by milestone tag / title prefix (`M0`…`M5`, `ORG`, `PLAYTEST`).
3. Print a **graph summary**, not a dump:

```
M0 Bootstrap     done|in_progress|blocked   blockers: —
M1 GATE Ride     blocked by 513             next: …
…
In flight: <id> <title> <lock holder or unlocked>
Review queue: todos tagged `review`
Open questions: unresolved DECISION / Open: comments (one line each)
```

4. Honor the master plan: M1 is the fun gate; M2+ stay blocked until Jordan
   signs off M1. Say so if someone is building past the gate.
5. End with a receipt (`.claude/skills/receipt/SKILL.md`): what you listed,
   no code, `Deploy: n/a`. Do not change todo state unless asked.
