# UI guidelines

## Current visual system

The committed Tailwind configuration defines a navy/blue product palette: primary `#1239B5`, navy `#0B1F4D`, canvas `#F4F7FB`, surface white, border `#E4E9F2`, text-primary `#0F172A`, text-secondary `#5B6B84`, success `#16A34A`, warning `#D97706`, and danger `#DC2626`. The configured sans stack is Plus Jakarta Sans, Inter, then system sans. Dark mode is class-based.

Cards use the shared `Card` primitive and Tailwind’s extended rounded/shadow values (`card` 18px, soft/lift/navy shadows). Buttons, badges, inputs, select controls, tables, dialogs, dropdowns, and empty/loading/error-state components are shared UI primitives. Use them instead of page-specific replacements.

### Elevation and motion (5 November 2026)

Four runtime elevation tokens in `client/src/index.css` adapt to light and dark themes:

| Level | Utility | Use |
| --- | --- | --- |
| 1 | `shadow-soft` | Cards and secondary/outline controls |
| 2 | `shadow-lift` | Interactive hover surfaces |
| 3 | `shadow-floating` | Menus, selects and toast notifications |
| 4 | `shadow-overlay` | Dialog surfaces |

Shared buttons use a subtle top light, an inset edge and a restrained brand glow. Ghost/link buttons keep their lighter visual weight. Disabled controls have no raised shadow or press transform. Keep keyboard focus rings visible; hover effects must not be required to understand an action.

Control transitions take 120ms, menus 140ms, and page/dialog entrances 180ms. Login sequences finish quickly with short stagger delays. Animate dense table rows with opacity only, and keep input positions stable while typing. Reduced motion removes delays and reduces transitions/animation to near-instant; functional progress text remains visible.

### Required interaction states

Success feedback coverage is documented in [QA feedback pass](QA_FEEDBACK_PASS.md); full end-to-end acceptance is still pending. Each applicable workflow should also cover loading/processing (with progress for long tasks), empty/no results, validation, error with retry, disabled/unavailable actions, destructive confirmation, unsaved changes, session expiry/offline recovery, and partial success in bulk operations. These states should explain what happened and the next available action. Do not report queued work as completed.

## Layout and navigation

Administrator and root pages use `Sidebar`, `TopNav`, `PageHeader`, dashboard stat/chart cards, command palette, and `MobileBottomBar`. User pages use `UserSidebar` and `UserTopNav`. Page content must remain responsive: use the existing Tailwind breakpoints, preserve horizontal table behavior where needed, and keep navigation usable on smaller screens.

## Content conventions

- Use Lucide icons and semantic `Badge` variants for status; do not communicate state by color alone.
- Keep data views compact, with cards/tables rather than ornamental panels.
- Use the existing form controls, labels, validation presentation, and dialog footer conventions.
- Reuse `EmptyState`, `Skeleton`, `ServiceUnavailable`, and toast/error-boundary paths for non-happy states.
- Preserve visual parity between administrator, root, and user shells while retaining their existing navigation distinctions.

The older `docs/UI_DESIGN_GUIDELINES.md` conflicts with the committed Tailwind primary palette in places. This file reflects the released configuration; component source remains authoritative for an exact variant.
