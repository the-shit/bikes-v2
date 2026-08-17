---
name: receipt
description: >
  Terse end-of-work receipt for Bikes v2 agents. Use when finishing a Solo
  todo, posting a builder/reviewer/intake report, or the user asks for a
  receipt. Trigger: "receipt", "what shipped", "mark for review".
---

# Receipt

Post this as a **todo comment** on the assigned Solo todo. Also use it as the
agent's final user-facing message. Never dump files or diffs into conversation.

Max **10 lines** of body after the heading. Long detail goes in a per-milestone
scratchpad (`bikes-v2-m1-notes`, etc.), not here.

## Template

```
Receipt — <todo id> <short title>
Shipped: <what landed, one clause>
Where: <branch> · <PR url or "no PR"> · <key paths>
Test: <ran / skipped / failed — name the command>
Deploy: <url, "n/a", or "not in this todo">
Review: tagged `review` (not completed)
Open: <question for orchestrator, or "none">
```

Drop unused lines only if they are truly n/a; prefer keeping `Test` and `Open`.

## Rules

- One fact per line. No preamble, no file dumps, no "happy to also…".
- `Where` is enough to find the work. Paths, not contents.
- `Test` and `Deploy` are status, not logs. Point at a command or URL.
- Taste / product questions go in `Open` **and** as their own todo comment
  if they need a decision. Do not guess. Do not complete the todo.
- After posting: `todo_add_tag` `review`. Leave status `in_progress`.
  Orchestrator / reviewer completes after review.
