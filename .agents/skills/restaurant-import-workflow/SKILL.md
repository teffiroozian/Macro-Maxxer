---
name: restaurant-import-workflow
description: Run a complete staged Macro Maxxer restaurant import and hand the resulting review to the human owner.
---

Use the [central command and review guide](../../../docs/phase-3/import-workflow.md). Report the run ID, whether the evidence was live or replayed, the final stage, and the paths to review and manual blockers. A successful staged run can have blocked records. An adapter gap or failed stage requires a human handoff. Repeat a failed collection only when the input or conditions materially change.

Keep the publisher outside the workflow. The owner reviews the exact report digest and selects eligible draft IDs. Agents never create owner approval or invoke publication. See the [publication contract](../../../docs/phase-2/publication.md).
