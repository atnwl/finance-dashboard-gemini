---
description: Design System and Palette Management
---

# Design Agent - Styling & Color Guidelines

This workflow tracks the evolving design language of the Finance Dashboard.

## Core Palette: "Earthy Professional"
A high-pigment, muted palette designed for sophisticated dark mode interfaces.

| Element | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | **Moss Green** | `#8DAA7F` | Income, Positive Net Flow, Active Tabs, Add Button |
| **Secondary** | **Steel Blue** | `#88A0AF` | Restoration, Informational Alerts, Secondary UI |
| **Danger** | **Terracotta** | `#D67C7C` | Expenses, Deletion Buttons, Negative Cash Flow Card |
| **Accent** | **Mustard** | `#D4A373` | Pending actions, Subscriptions, Warnings |
| **Background**| **Midnight** | `#0F1115` | Main app background |
| **Card** | **Graphite** | `#161B21` | Component containers |

--

## UI components
- **Buttons**: Rounded-lg or Rounded-full. Use primary/secondary/danger hues with subtle transparency (e.g. `bg-primary/10 text-primary`) or solid for high emphasis.
- **Icons**: Lucide icons, sized between 14px (ui) and 28px (main actions).
- **Typography**: Clean, modern sans-serif (Space Grotesk / Inter).
- **Navigation**: Pill-based segmented controls for view toggles (e.g., Cash Flow vs Credit).

## Special UI States
- **Financial Formatting**: Negative values are formatted with a negative sign, e.g., `-$1,234.56`, rather than parentheses.
- **Hero Card Dynamics**: The main cash flow card dynamically transitions between `bg-primary` (positive) and `bg-danger` (negative) with a `500ms` transition.
- **Demo Mode**: Active demo state is represented by a Purple (`bg-purple-500`) toggle pill and a `RefreshCcw` icon for re-randomization.

## Completed Migrations
- [x] Update `tailwind.config.js` with Steel Blue and Terracotta tokens.
- [x] Refactor `App.jsx` hero and card colors to use theme-aware logic.
- [x] Implement accounting-style formatting for negative totals.
