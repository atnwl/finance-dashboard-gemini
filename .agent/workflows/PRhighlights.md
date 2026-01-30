---
description: Generate a concise PR summary in 4-6 bullet points
---

# PRhighlights Agent

Generate a verified, fact-checked summary of changes in a Pull Request. Output is always copyable markdown.

## Instructions

1. **Identify the PR**: Determine which PR to summarize from:
   - User-provided PR number (e.g., `/PRhighlights 6`)
   - Current feature branch if no number given
   - Ask for clarification if ambiguous

2. **Fetch the actual diff**: Use `mcp_github-mcp-server_pull_request_read` with `method: get_diff` to get the real changes. Do NOT rely on memory or assumptions.

3. **Verify each claim**: Only include changes that appear in the diff. Cross-reference file additions/deletions to ensure accuracy.

4. **Format the output** as:
   ```markdown
   ### PR#[NUMBER]
   
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   - **[Category]**: [Concise description of change]
   ```

5. **Rules**:
   - Output ONLY the markdown (no preamble, no commentary)
   - Keep to 4-6 bullet points maximum
   - Use bold for the category label
   - Start each bullet with a verb or noun phrase
   - Be specific: mention actual values, file names, or features changed
   - Do NOT include features that already existed in the base branch

## Example Output

```markdown
### PR#6

- **New Color Palette**: Updated theme to "Earthy Professional" with Moss Green primary, Steel Blue secondary, Terracotta danger, and Mustard warning tokens
- **Category Updates**: Renamed "Global Entry / Travel" to "Travel"; added Taxes, Fees, and Apps/Software categories
- **Pie Chart Refinements**: Sorted legend largest-to-smallest, display percentages only, and added hover tooltips showing dollar amounts
- **Bulk Review Improvements**: Added comma-formatted amount inputs and Expense Type selector (Variable/Bill/Subscription) to the import review modal
- **UI Polish**: Enlarged "Add Transaction" buttons on desktop and mobile for better usability
- **AI Enhancement**: Updated Gemini prompt to predict and save expense type during receipt scanning
```
