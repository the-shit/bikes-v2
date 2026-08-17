---
description: Run playtest-triage on Bikes v2 feedback.jsonl (dedupe, Solo todos, close processed lines).
---

# /intake

Run the **playtest-triage** agent (`.claude/agents/playtest-triage.md`)
end-to-end.

`$ARGUMENTS` is an optional override path to a `feedback.jsonl`. If set,
treat it as the live intake for this run only (`BIKES_V2_FEEDBACK_FILE`).

Do not implement the feedback. Do not skip the processed-line close step.
Finish with the receipt skill (counts + remaining lines).
