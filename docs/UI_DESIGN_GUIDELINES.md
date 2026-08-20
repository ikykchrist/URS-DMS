# URS-DMS UI Design Guidelines

This document is the visual contract for the URS-DMS frontend. Read it before changing a page, shared component, layout, or Tailwind theme. The goal is to keep the admin workspace, user portal, and authentication screens feeling like one product.

## Design Direction

URS-DMS is a calm, practical document-management tool. The interface should feel structured and trustworthy rather than decorative.

- Prefer clear hierarchy, generous white space, and compact data presentation.
- Use color to communicate navigation, status, and feedback, not as decoration.
- Keep surfaces mostly white on a very light gray background.
- Use restrained shadows and borders to separate content without making the page feel heavy.
- Favor familiar Lucide icons and short labels over custom illustrations in the application workspace.
- Preserve the visual density of existing pages when adding new features.

## Source Of Truth

Use the shared primitives before writing page-specific styles.

| Concern | Source |
| --- | --- |
| Global reset, body, scrollbar, responsive utilities | `src/index.css` |
| Tailwind colors, font family, radius | `tailwind.config.js` |
| Buttons | `src/components/ui/Button.tsx` |
| Cards and card typography | `src/components/ui/Card.tsx` |
| Tables | `src/components/ui/Table.tsx` |
| Status labels | `src/components/ui/Badge.tsx` |
| Admin shell | `src/components/layout/Sidebar.tsx`, `src/components/layout/TopNav.tsx` |
| User shell | `src/components/user/UserSidebar.tsx`, `src/components/user/UserTopNav.tsx` |
| Page heading pattern | `src/components/layout/PageHeader.tsx` |
| Dashboard metric and chart patterns | `src/components/layout/StatCard.tsx`, `src/components/layout/ChartCard.tsx` |
| Authentication shell | `src/components/auth/AuthLayout.tsx` |

If a shared primitive is missing a needed variant, extend the primitive rather than duplicating its styles across pages.

## Tokens

These are the currently established values. Prefer Tailwind theme names where they exist. Literal values are acceptable only when matching an existing component or a visualization that needs a fixed color.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `primary` | `#6366F1` | Application accent, links, selected chart series, logo mark |
| `primary-50` | `#EEF2FF` | Soft accent backgrounds |
| `primary-600` | `#4F46E5` | Darker accent when stronger contrast is needed |
| `background` | `#FAFAFA` | Main authenticated workspace background |
| `card` | `#FFFFFF` | Cards, sidebars, dialogs, input surfaces |
| `border` | `#E5E7EB` | Standard borders and chart grid lines |
| `text-primary` | `#111827` | Headings, values, primary labels |
| `text-secondary` | `#6B7280` | Descriptions, metadata, secondary labels |
| `success` | `#10B981` | Approved, completed, positive trends |
| `warning` | `#F59E0B` | Pending, attention, high priority |
| `danger` | `#EF4444` | Rejected, overdue, destructive actions, errors |

The authenticated navigation uses `bg-gray-900 text-white` for the active item and primary default buttons currently use gray-900, not indigo. Do not change these to indigo casually; the indigo accent and near-black action state are both part of the current visual language.

The authentication shell is a separate branded context:

- Branding panel: `#2563EB`.
- Form panel: `#F5F7FB`.
- White and white-opacity text are used on the branding panel.

Do not introduce the authentication blue into ordinary workspace controls unless the design is intentionally being changed as a system-wide decision.

### Typography

- Font family: Inter, falling back to system sans-serif.
- Base size: `16px`.
- Body line height: `1.5`.
- Page title: `20px` on small screens, `24px` from the `sm` breakpoint; semibold and tight tracking.
- Card title: usually `15px` to `17px`, semibold.
- Body and table text: usually `13px` to `14px`.
- Table headings: `12px`, uppercase, semibold, wide tracking.
- Helper text and metadata: `11px` to `13px`, gray-500.
- KPI values: `22px` on small screens, `28px` from `md`; semibold and tight tracking.

Avoid adding new font families, display type, all-caps body copy, or large headings inside the authenticated workspace.

### Shape, Border, and Elevation

- Default control radius: `rounded-lg`.
- Cards and larger surfaces: `rounded-xl` (`12px`).
- Pills and statuses: `rounded-full`.
- Standard control height: `h-9`; compact controls: `h-8`; large controls: `h-10`.
- Standard card border: `border-gray-200/60` with `shadow-sm`.
- Use `shadow-md` only for an interaction state such as a hovered metric card.
- Dividers are subtle: `border-gray-100` or `border-gray-200`.

Do not stack strong borders and strong shadows on the same surface. Do not use large rounded containers when a card or simple section will do.

## Layout

The authenticated shell is a full-height flex layout with a fixed-height top bar and an independently scrolling main region.

- Root shell: `h-screen w-full overflow-hidden bg-[#FAFAFA]`.
- Sidebar: full viewport height, white, right border, collapsible.
- Top navigation: `h-16`, translucent white with backdrop blur, bottom border.
- Main content: `flex-1 overflow-y-auto`.
- Standard page padding: `p-4 sm:p-6 lg:p-8`.
- Page header bottom spacing: `mb-6 lg:mb-8`.
- Common grid gaps: `gap-3` to `gap-5`; do not use oversized gaps in data-heavy views.

### Sidebar

- Expanded width: `w-64`.
- Collapsed width: `w-20`.
- Brand mark: 36px square, indigo background, `rounded-lg`.
- Navigation item: 14px medium text, 18px icon, `px-3 py-2.5`, `rounded-lg`.
- Active item: gray-900 background and white text.
- Inactive item: gray-600 text; gray-100 background on hover.
- Collapse control belongs at the bottom, separated by a subtle top border.

Keep labels and icons aligned across admin and user sidebars. When collapsed, center the icon and preserve a tooltip or accessible name for icon-only controls.

### Top Navigation

- Search occupies the left side and is capped at approximately `max-w-md`.
- Utility actions and user menu remain on the right.
- User identity is hidden below the `md` breakpoint, but the avatar and menu remain available.
- Notification counts use a small red circular badge and must not move the layout.
- The admin search opens the command palette and displays the `Cmd/Ctrl + K` hint.

### Page Header

Use `PageHeader` for standard pages. The title and description sit on the left; actions sit on the right on larger screens and wrap below on smaller screens. Keep action groups short and prioritize one primary action.

## Component Rules

### Buttons

Use `Button` rather than styling a new native button.

- `default`: primary action, gray-900 with white text.
- `outline`: secondary action, white with a light border.
- `secondary`: low-emphasis grouped action, gray background.
- `ghost`: toolbar, navigation, or tertiary action.
- `destructive`: irreversible action only.
- `link`: inline navigation only.
- Use `icon` only when the icon's action is obvious or has an accessible label/tooltip.

Buttons use 13px text and short transitions. Keep labels action-oriented: `Upload Document`, `View Details`, `Save Changes`. Avoid competing primary buttons in one region.

### Cards

Use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent` for grouped content. The default card supplies the product's border, radius, background, and shadow. Override padding only when a component needs an edge-to-edge region, such as a table body.

Recommended pattern:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section title</CardTitle>
    <CardDescription>Short supporting explanation.</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Tables

Tables are for scanning and comparison, not for displaying paragraphs.

- Use the shared table primitives.
- Expect horizontal scrolling on narrow screens; do not force every column to remain visible.
- Hide lower-priority columns responsively with `sm:table-cell`, `md:table-cell`, or `lg:table-cell` patterns.
- Keep headings uppercase and compact.
- Use gray-100 row dividers and a gray-50 hover state.
- Truncate long titles and provide a detail/preview action.
- Keep action buttons grouped at the right and use compact ghost icon buttons.
- Pair status values with `Badge`; do not communicate status with color alone.

### Badges and Status

Use the semantic `Badge` variants. Status meaning must remain consistent across pages:

| Meaning | Variant direction |
| --- | --- |
| Approved, completed, success | `success` / `completed` |
| Pending, needs attention | `warning` / `pending` |
| Rejected, overdue, critical | `danger` / `expired` / `overdue` |
| In review, submitted, in progress | `default` / `under_review` / `submitted` / `in_progress` |
| Draft, archived, low priority | `secondary` / `draft` / `archived` / `low` |

Use soft tinted backgrounds with colored text. Avoid solid saturated status blocks except for a deliberately high-severity alert.

### Forms and Dialogs

- Place labels above controls with a small, consistent gap.
- Use 40px controls (`h-10`) for primary form fields.
- Use the shared `Input`, `Select`, `Textarea`, `Switch`, `Dialog`, and `Dropzone` components.
- Keep dialog content to one focused task.
- Dialog actions appear in the footer, with cancel as outline and the committing action as default.
- On mobile, dialogs use nearly the full viewport width with reduced padding.
- Explain validation errors next to the field and provide a non-color cue.

### Charts

Charts should support the surrounding data, not become the visual focus of the application.

- Use indigo for the primary series.
- Use success, warning, danger, and indigo for status distributions.
- Use gray-200 grid lines and gray-400 labels.
- Tooltips are white with a gray-200 border, 8px radius, and 12px text.
- Keep chart cards aligned to the same card system as all other content.
- Always provide a nearby legend or text summary when color is necessary to interpret the chart.

## Responsive Behavior

The project uses Tailwind's default breakpoints plus a few CSS utilities.

| Width | Expected behavior |
| --- | --- |
| Below `640px` | Single-column content, compact padding, hidden nonessential labels/columns, mobile-only controls visible |
| `640px` and up | More generous gaps and content padding; header actions can begin to sit beside headings |
| `768px` and up | Larger card padding, full body text, wider truncation limits, more table columns |
| `1024px` and up | Sidebar offset/layout is enabled; multi-column dashboard grids become available |
| `1536px` and up | Sidebar margins expand slightly for large screens |

Use the existing utilities when applicable: `content-padding`, `card-responsive`, `navbar-responsive`, `responsive-gap`, `table-scroll-wrapper`, `table-cell-truncate`, and `dialog-responsive`.

Never let a new page depend on a fixed desktop width. Test at 375px, 768px, 1024px, and a large desktop width. Check that tables scroll, dialogs fit, buttons wrap without overlap, and the main content remains readable.

## Interaction and Accessibility

- Use Lucide icons at the existing 16px to 20px scale and keep stroke weight consistent.
- Every icon-only button needs an accessible name, usually via `aria-label` or an existing tooltip pattern.
- Preserve visible `focus-visible` rings; do not replace them with `outline-none` without adding an equivalent focus treatment.
- Interactive elements need hover, focus, disabled, and where relevant selected states.
- Do not use color as the only signal for status, errors, or required actions.
- Maintain keyboard access for dialogs, dropdowns, command palette, navigation, and table actions.
- Keep motion short and functional. Existing transitions are generally 150ms to 300ms; avoid decorative animation.
- Respect the app's 6px scrollbar styling and avoid adding custom scrollbars to isolated components unless necessary.

## Do Not Drift

Avoid these changes unless the whole design system is being intentionally revised:

- Introducing a second primary accent in the authenticated workspace.
- Replacing gray-900 active navigation with a different active color.
- Adding gradients, glass effects, or heavy shadows to ordinary cards.
- Mixing arbitrary radius values or introducing pill-shaped layout containers.
- Making body text smaller than the established 12px to 14px range for dense content.
- Building one-off buttons, cards, badges, or dialogs instead of reusing shared primitives.
- Removing responsive column hiding or table overflow behavior to make a desktop screenshot fit.
- Using red, amber, or green as decoration instead of semantic feedback.
- Changing the authentication blue and workspace indigo without updating all surfaces consistently.

## New Page Checklist

Before opening a pull request, confirm:

- The page uses the shared shell and `PageHeader` pattern where appropriate.
- Spacing follows `p-4 sm:p-6 lg:p-8` and the existing grid gap scale.
- Shared UI primitives are used before adding local styles.
- Heading, body, metadata, and table type sizes match this guide.
- Status colors use the established semantic variants.
- Desktop and mobile layouts were checked at the project breakpoints.
- Keyboard focus and icon-only controls are accessible.
- Loading, empty, success, error, and disabled states match the same visual language.
- No new color, radius, shadow, font, or animation was added without documenting why.
- A visual regression review was performed for the admin and user shells if a shared component changed.

When the implementation and this document disagree, first verify whether the difference is an intentional existing context. If it is not intentional, prefer the shared primitive and update this document only when the visual system itself has changed.
