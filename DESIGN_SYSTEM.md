# Summaryse design system: Soft neutral

Source of truth: `design/summaryse.pen` (open in Pen). Left: **Components · Soft neutral**, 55 components with their states and a dark-mode check. Right: **Screens · Soft neutral**, principles and example screens. **Phase 4 · Side panel & projects** has the side panel states and the project screens.

Code: tokens in `src/assets/tokens.css`, components in `src/ui/kit/` (one Svelte file per Pen component).

## Principles

- **Almost monochrome.** Ink, warm greys and white. The saved content provides the colour.
- **Softly rounded.** Corners scale with the element's size, and inner corners nest inside outer ones.
- **One raised panel.** The app sits on a warm grey canvas; content lives on one white panel. Depth comes from that, not from borders, tints or shadows everywhere.
- **AI in words.** "Summarised by Haiku 5.5", "Summarising…", "Couldn't summarise", "Not from your sources". No sparkles, glows, gradients or coloured dots.
- **One primary action per view**, in ink. Everything else is quieter.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#EFEFEC` | `#0E0E10` | App background behind the panel |
| `--bg` | `#FFFFFF` | `#18181B` | Panel, inputs when focused |
| `--surface` | `#F4F4F2` | `#232326` | Filled controls, cards, selected row |
| `--hover` | `#EAEAE7` | `#2C2C30` | Hover fill |
| `--border` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.07)` | Hairlines, used sparingly |
| `--text` | `#1A1A19` | `#F2F2F1` | Primary text |
| `--text-2` | `#6B6B68` | `#A3A3A0` | Secondary text |
| `--text-3` | `#A3A3A0` | `#6E6E6B` | Meta, placeholders |
| `--primary` / `--on-primary` | ink / white | near-white / ink | Primary button, toggles, toast (inverts in dark) |
| `--error` | `#C4321F` | `#F07060` | The only status colour |
| `--highlight` | amber 35% | amber 25% | Search matches, cited passages |

Light and dark follow the system setting (`prefers-color-scheme`).

**Corner radius:** `--r-xs` 6px (keys, tags) · `--r-sm` 10px (buttons, inputs, nav items) · `--r-md` 12px (rows, banners) · `--r-lg` 16px (panel, cards) · `--r-xl` 20px (sheets, popup).

**Type:** Geist (bundled with the extension, OFL). 11 / 12 / 13 / 14 / 16px. Headings 20–30px, weight 600, tight letter-spacing (−0.4 to −0.8px). Reading text 16px at 1.7 line height, 68 characters wide.

**Motion:** 120ms, `cubic-bezier(0.2, 0, 0, 1)`, no bounce. Reduced motion is respected.

## Components (`src/ui/kit/`)

| Group | Components |
|---|---|
| Actions | `Button` (primary, secondary, ghost, danger; md, sm) · `IconButton` (plain, filled, primary) · `Kbd` · `Spinner` · `Menu` |
| Inputs | `Field` (label, hint, error) · `Input` · `TextArea` · `SearchField` (with shortcut) · `Select` · `Segmented` · `Toggle` · `Checkbox` |
| Navigation and lists | `NavItem` · `GroupLabel` · `ListRow` (status is a word; only errors are red) |
| Reading | `Property` · `SectionHeading` · `NumberedPoint` · `Tag` · `RelatedCard` · `HighlightCard` |
| Ask | `Citation` · `Inference` ("Not from your sources") · `SourceCard` |
| Feedback and settings | `Banner` (info, error) · `EmptyState` · `SkeletonRow` · `SettingsGroup` · `SettingsRow` |
| Projects | `ProjectChip` · `ProjectPicker` (checkboxes plus “New project…”) · `Suggestion` (Add / Not now, never automatic) · `QuestionItem` |
| Summary blocks | `CodeBlock` (with copy) · `DataTable` · `BarChart` · `Callout` (info, warning) · steps and quotes in `InsightBlocks` · gist and note in `DocInsights` |

## Rules of thumb

- Selection is a soft fill, never a border or accent bar.
- Inputs are filled, not outlined; focus adds a 2px ink ring; errors add a red ring and message.
- Don't put a card around everything. Use a container only when it groups something.
- Status belongs in text in the meta line, not in badges.
- New UI: add or extend a component in Pen first, then mirror it in `src/ui/kit/`.
