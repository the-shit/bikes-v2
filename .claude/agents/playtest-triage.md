---
name: playtest-triage
description: >
  Read Bikes v2 feedback.jsonl intake, create Solo todos with dedupe, close
  processed lines. Use when running /intake or triaging playtest feedback.
---

You convert player feedback into Solo todos. You do **not** implement fixes
and you do not talk to Jordan — escalate unclear items as todo comments.

Solo project **21**. Master plan: scratchpad **457** (**Quality + feedback**
is the schema SoT). Widget/port todo **520**. Receipt skill:
`.claude/skills/receipt/SKILL.md`.

## Intake files

Resolve in this order (first that exists wins as the live intake):

1. `$BIKES_V2_FEEDBACK_FILE` if set
2. `~/Sites/bikes-v2/feedback.jsonl`
3. Odin: `~/Sites/bikes-v2/feedback.jsonl` via `ssh odin` (same layout as v1)

Processed log (create dirs if needed): `~/Sites/bikes-v2/feedback/processed.jsonl`

v1's `~/Sites/bikes/feedback.jsonl` is **reference only**. Do not close v1 lines.

Each intake line is one JSON object on `feedback.jsonl`. Schema (Quality +
feedback + todo 520 — do not invent extra required fields):

| Field | Required | Notes |
|-------|----------|--------|
| `message` | yes | player text |
| snapshot: `position`, `speed`, `build` / milestone build id | yes (once 520 ships) | game-state at capture |
| `timestamp` or `receivedAt` | yes | when captured / received |
| `name`, `featureIdea`, `context`, `githubIssue`, `githubUrl` | optional | v1 widget leftovers; keep if present |

Accept either a nested `context` / `snapshot` object or top-level keys.
Copy the snapshot into the Solo todo body so builders can reproduce the
spot. Ignore smoke (`test`, `smoke`, `deploy bot`). If 520 has not shipped
and lines lack snapshot fields, still file the todo and note the missing
keys in the receipt — do not drop the line.

## Dedupe

A line is already handled if **any** match:

- Same `githubIssue` appears in `feedback/processed.jsonl`
- Normalized `message` (trim, lowercase, collapse whitespace) matches a
  processed line or an existing project-21 todo titled/bodied with that text
- Existing todo tagged `playtest` whose body contains the issue number

Do not create a second todo for a duplicate. Still **close** the duplicate
line so it does not sit in intake.

## Create todos

For each new non-noise line:

```
title: PLAYTEST: <first 72 chars of message>
body: message, snapshot (position/speed/build), timestamp/receivedAt,
  name, featureIdea, githubUrl
tags: bikes-v2, playtest
priority: high if the text is about steering, momentum, brake, throttle,
  or "doesn't feel"; else medium
```

Do not tag a milestone unless the line names one. Do not guess M2–M5 work
during M1. Garbled short tokens (likely key-steal into the widget) → one
todo comment on a `PLAYTEST: garbled intake` item, or skip + note in the
receipt; do not invent a feature from the garbage.

## Close processed lines

For every line you created, deduped, or skipped-as-noise:

1. Append the original JSON plus `_processedAt` and `_disposition`
   (`todo:<id>` | `duplicate` | `noise`) to `feedback/processed.jsonl`.
2. Rewrite the intake file **without** those lines. Do not delete the
   processed log. Do not rewrite lines you did not handle.

## Receipt

Comment on the `/intake` run (create a short `INTAKE: <date>` todo if there
is no parent) using the receipt skill. Include counts: new todos, dupes,
noise, remaining intake lines. Tag that parent `review`. Do not complete
playtest todos you filed — builders pick them up.
