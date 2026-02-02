# FinBoard - Architecture & Context Walkthrough

> **For AI Agents**: Read this document before making significant changes to understand the app's data flow and known edge cases.

---

## 🏗️ Overview

FinBoard is a personal finance dashboard built with:
- **React** (single-file `App.jsx` for simplicity)
- **Tailwind CSS** with custom "Earthy Professional" palette
- **Google Gemini AI** for receipt/statement parsing
- **Supabase** for auth & encrypted cloud sync
- **Vercel** for deployment

> **📱 Mobile Platform:** The primary user is on **Android**. All mobile-specific improvements should target Android Chrome/PWA first.

---

## 🛑 CRITICAL: Branching Strategy

**You MUST create a NEW, Short-Lived Feature Branch for every distinct task/request.**

1.  **NEVER** reuse old branches (e.g., do not keep pushing to `feature/intelligent-transactions`).
2.  **Start Fresh**: Always pull `main` first.
3.  **Naming Convention**: `feature/[short-description]` or `fix/[bug-description]`.
4.  **One Branch = One PR**: This ensures clean history and atomic PRs.

**Mandatory Workflow:**
```bash
git checkout main
git pull
git checkout -b feature/short-descriptive-name
# ... do work ...
./deploy.sh "feat: description of change"
```

---

## 📊 Data Model

All financial data is stored in a single `data` state object:

```javascript
{
  income: [],      // Array of income transactions
  expenses: [],    // Array of expense transactions
  statements: []   // Metadata about uploaded statements (NOT the transactions themselves)
}
```

### Transaction Shape (Income & Expenses)
```javascript
{
  id: "abc123",
  name: "Grocery Store",
  amount: 52.47,
  date: "2026-01-15",        // YYYY-MM-DD format
  category: "Groceries",
  frequency: "one-time",     // one-time | weekly | biweekly | monthly | annual
  type: "variable",          // variable | bill | subscription (expenses only)
  isIncome: false,
  statementId: "xyz789"      // Links to parent statement (for bulk delete)
}
```

### Statement Shape
```javascript
{
  id: "xyz789",
  provider: "Chase",         // Bank/Card issuer name
  last4: "1234",             // Last 4 digits of account
  date: "2026-01-24",        // Statement closing date
  uploadDate: "2026-01-25T10:30:00Z",
  transactionCount: 45
}
```

---

## 📥 Statement Import Flow

1. User uploads a PDF/image via `TransactionForm`
2. Gemini extracts transactions + metadata (provider, last4, closing date)
3. Transactions are shown in "Bulk Review" modal for user approval
4. On import:
   - Each transaction gets a `statementId` linking to the statement
   - Duplicate check: Same name + date + amount (within $0.01) = skip
   - Statement metadata saved to `data.statements`

### ⚠️ CRITICAL: Cross-Statement Duplicates

**The same real-world payment can legitimately appear on MULTIPLE statements.**

Example: A $1,156.77 credit card payment:
- Appears on **Fold (bank) statement** as "Payment Thank You - Web" (money leaving bank)
- Appears on **Chase (card) statement** as "CHASE CREDIT CRD" (money arriving on card)

**These are NOT duplicates to be removed.** They represent the same money movement viewed from two different accounts. The current duplicate detection only prevents re-importing the exact same transaction from the same statement.

---

## 🎨 Design System

See `.agent/workflows/design.md` for the full palette, but key colors:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#8DAA7F` | Income, positive, primary actions |
| `secondary` | `#88A0AF` | Informational, navigation |
| `danger` | `#D67C7C` | Expenses, deletions, warnings |
| `background` | `#0F1115` | Main app background |
| `card` | `#161B21` | Component containers |

**Button styles:**
- High emphasis: `bg-primary text-black`
- Low emphasis (preferred): `bg-primary/10 text-primary border border-primary/20`

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app (state, components, Gemini prompts) |
| `src/utils/supabase.js` | Supabase client config |
| `src/utils/crypto.js` | Encryption helpers for cloud sync |
| `tailwind.config.js` | Theme colors |
| `deploy.sh` | Quick deploy script |

### Important Sections in App.jsx

| Lines (approx) | Section |
|----------------|---------|
| 1-50 | Imports & constants (categories, icons) |
| 380-700 | Main App state & handlers |
| 500-600 | `financials` useMemo (calculations) |
| 850-1000 | Dashboard cards rendering |
| 1200-1400 | Transaction list rendering |
| 1700-1800 | AccountCard component (statements UI) |
| 1900-2100 | TransactionForm & Gemini prompts |

---

## 🚫 Common Pitfalls

1. **Don't dedupe CC payments by amount alone** - Same amount on bank + card = not a duplicate
2. **Parse dates locally** - Use `new Date(y, m-1, d)` to avoid timezone shifts
3. **Check `isIncome`** - Determines category list and styles
4. **Frequency ≠ Type** - `frequency` is recurrence; `type` is expense classification
5. **Search overrides everything** - If `searchQuery.length >= 2`, ignore `activeTab`

---

## 🚀 Deployment

```bash
./deploy.sh "commit message"
# or just:
./deploy.sh  # Auto-generates timestamp message
```

This runs: `git add . && git commit && git push && vercel deploy --prod`

---

## 📝 Changelog Highlights

- **Jan 2026**: Added statement grouping by provider+last4, delete record/transactions feature
- **Jan 2026**: Fixed timezone date parsing, Bitwarden autofill hijacking
- **Jan 2026**: Added Fold logo recognition to Gemini prompt
