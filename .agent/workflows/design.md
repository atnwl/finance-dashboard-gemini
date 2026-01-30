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
| **Danger** | **Terracotta** | `#D67C7C` | Expenses, Deletion Buttons, Over-budget Alerts |
| **Background**| **Midnight** | `#0F1115` | Main app background |
| **Card** | **Graphite** | `#161B21` | Component containers |

--

## UI components
- **Buttons**: Rounded-lg or Rounded-full. Use primary/secondary/danger hues with subtle transparency (e.g. `bg-primary/10 text-primary`) or solid for high emphasis.
- **Icons**: Lucide icons, sized between 14px (ui) and 28px (main actions).
- **Typography**: Clean, modern sans-serif (Inter/Outfit).

## Next Steps
1. Update `tailwind.config.js` to include the Steel Blue and Terracotta tokens.
2. Refactor `App.jsx` to replace hardcoded Tailwind colors (e.g. `text-red-400`, `text-blue-500`) with theme variables (`text-danger`, `text-secondary`).
3. Refactor charts to use new palette colors for consistency.
