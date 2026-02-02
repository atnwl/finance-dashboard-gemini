---
description: Submit PR if no args are passed - If arg is passed, only generate a concise PR summary in 4-6 bullet points
---

# PRhighlights Agent

Generate a verified, fact-checked summary of changes in a Pull Request. Output is always copyable markdown.

## Instructions

1. **Identify the PR**: Determine which PR to summarize from:
   - User-provided PR number (e.g., `/PRhighlights 6`)
   - Current feature branch if no number given
   - Ask for clarification if ambiguous

2. submit a PR with all current changes (only if no args are passed; if a number is passed, then skip this step)

3. **Fetch the actual diff**: Use `mcp_github-mcp-server_pull_request_read` with `method: get_diff` to get the real changes. Do NOT rely on memory or assumptions.

4. **Verify each claim**: Only include changes that appear in the diff. Cross-reference file additions/deletions to ensure accuracy.

5. **Format the output** as:
   ```markdown
   ### PR#[NUMBER] - [short list of app areas/views affected by PR]
   
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   ```

6. **Rules**:
   - ⚠️ **NO BACKTICKS ANYWHERE** - no inline backticks, no code blocks, no triple backticks. Write code/file names in plain text or quotes.
   - Output ONLY the markdown (no preamble, no commentary, no "Here's the summary:")
   - Keep to 4-6 bullet points maximum
   - Use bold for the category label
   - Start each bullet with a verb or noun phrase
   - Be specific: mention actual values, file names, or features changed
   - Do NOT include features that already existed in the base branch

## ❌ BAD (includes backticks)
- **Fix**: Updated `handleBulkImport` to link `statementId`

## ✅ GOOD (no backticks)
- **Fix**: Updated handleBulkImport to link statementId

## Example Output

```markdown