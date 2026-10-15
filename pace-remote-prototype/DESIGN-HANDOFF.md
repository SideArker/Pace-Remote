# Pace Remote — design and implementation handoff

This document is the source of context for an agent continuing the Pace Remote UI exploration. It summarizes the user's original brief, confirmed preferences, the current prototype, and the decisions still open. The app is an exploratory mock, not a production implementation.

## Product context

Pace Remote is intended to be an **Android-only** companion app, built with Expo and React Native, for controlling Pace running on a computer. The planned surfaces include:

- Agent conversations and prompt submission.
- Reviewing and approving requested actions.
- Reading plans and Markdown.
- Inspecting code diffs.

The user knows shadcn/ui from PK Planner. The visual direction should support one coherent component system, but the React Native UI library has not been selected. The user has heard of Claude Code Remote but has not used it and has no visual references to anchor the design.

## Confirmed preferences

- Keep the interface calm and easy on the eyes, with dark mode as the emphasis.
- The user likes monochrome design. Pace also has brand colors, so the UI should explore how to combine them rather than making the whole app colorful.
- Aim for balanced information density: useful content should fit on a phone without making reading feel cramped.
- The user asked for a recommendation on shadcn/ui in React Native. The working recommendation was to keep shadcn's customizable component and token approach, while letting touch targets, navigation, and other behavior fit Android.

Do not treat these preferences as a final brand system. The user has not provided Pace's actual palette, chosen specific semantic color mappings, approved a component library, or chosen one of the three layouts.

## Working visual direction

The prototype uses a graphite dark foundation, muted text, restrained surfaces and borders, and selective color for status and diff semantics. The key colors currently hard-coded in `app/index.tsx` are:

| Token | Value | Prototype use |
| --- | --- | --- |
| Background | `#0D0F10` | Main screen background |
| Surface | `#151819` | Cards and composer |
| Raised | `#1B1F20` | Secondary surfaces and message bubble |
| Border | `#292E30` | Card and separator edges |
| Text | `#F0F2F1` | Primary text |
| Muted | `#939B9D` | Supporting text |
| Accent | `#B6C8C4` | Muted teal control accent; placeholder, not a Pace token |
| Success | `#9CBFA8` | Completed/added state |
| Pending | `#D7B87A` | Approval state |
| Removed | `#D28C84` | Removed diff lines |

These values are design-study placeholders. Before treating any as a real brand color, inspect Pace's source palette and agree on which colors carry meaning. In particular, keep status/diff color distinct from decorative color.

## Prototype variants

All variants use the same sample session (“Checkout retries”) so the comparison focuses on information hierarchy rather than different content. Switch using the floating prototype bar or the `variant` route parameter:

1. **Chat (`?variant=chat`)** — chronological conversation first; the approval request appears inline before the message composer. Best for evaluating a conversation-led remote-control flow.
2. **Task (`?variant=task`)** — task progress and plan first, with the pending approval promoted as the main decision. Best for evaluating a task/approval-led flow.
3. **Sections (`?variant=sections`)** — segmented `Rozmowa`, `Plan`, and `Diff` sections. Best for evaluating focused reading and switching between work artifacts.

The approve control only updates local React state. There is no Pace connection, real prompt submission, filesystem action, persistence, or real diff data.

## Project map

- `app/index.tsx` — all three layouts, sample content, temporary theme constants, and the variant switcher.
- `app/_layout.tsx` — Expo Router stack and dark status-bar setup.
- `app.json` — Expo app identity, deep-link scheme, dark UI mode, and router plugin.
- `README.md` — quick start and links to this handoff and screenshot notes.
- `docs/SCREENSHOTS.md` — current capture limitation and instructions for capturing Android screens later.

The prototype uses Expo Router, React Native `StyleSheet`, `lucide-react-native`, and safe-area context. No shadcn-inspired component library was installed; this avoids prematurely locking in a UI library while the visual direction is being reviewed.

## Run and review

From this directory:

```sh
npm start
```

Open the project in Expo Go on an Android device by scanning the QR code, or press `a` if an Android emulator is already running. The app is Expo SDK 57 with React Native 0.86; use the project's installed Expo CLI rather than a global Expo CLI.

When asking the user for feedback, ask which structure feels right (or which parts to combine), whether the amount of content feels comfortable, and whether the restrained status/diff colors work with Pace. The main question is the screen hierarchy, not whether the placeholder hex colors are final.

## Decisions still open

1. Inspect Pace's actual brand palette and decide which, if any, brand colors should map to connection, status, approval, and diff states.
2. Choose the default information hierarchy: conversation, task/approval, or focused sections.
3. Decide whether to use React Native Reusables as a shadcn-inspired starting point, another library, or a small project-owned component set. None has been selected.
4. Review real Android behavior: status/navigation bars, keyboard and composer behavior, scrolling, touch target sizes, and long Markdown/diff content.
5. Replace the sample task data and mixed-language labels once product terminology and target language are known.

## Validation already performed

- `npx tsc --noEmit` passed.
- `npx expo lint` passed with no warnings after removing unused imports.
- `npx expo-doctor` passed 21/21 checks.
- Metro produced the Expo web bundle, but no Android emulator or AVD was available for an on-device screenshot in this workspace. See `docs/SCREENSHOTS.md` before interpreting screenshot status.

## Prototype boundaries

Keep this work visibly exploratory. Do not connect it to Pace, add persistence, choose a production UI library, or promote the layouts into production components without a follow-up product decision. Rework the chosen structure properly after the user selects it.
