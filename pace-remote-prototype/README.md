# Pace Remote — UI prototype

Throwaway Expo mock to compare three mobile layouts for the same agent session:

- `?variant=chat` — conversation first, with approval inline.
- `?variant=task` — task status, plan, and pending approval first.
- `?variant=sections` — switchable conversation, plan, and diff sections.

All variants use a calm graphite dark theme, balanced information density, and restrained semantic color. Pace's actual brand palette is not in this repository, so the muted teal, green, amber, and red here are placeholders to discuss—not approved brand tokens.

## Run

```sh
cd pace-remote-prototype
npm start
```

Scan the Expo Go QR code on Android. The floating prototype switcher changes the `variant` URL parameter so each layout can be opened directly. The approval button only changes local mock state; there is no backend connection.

## Design question and current verdict

Does a monochrome, low-glare dark shell with selective status and diff colors feel like Pace Remote, and which information hierarchy works best on a phone? Current direction: compare all three structures before choosing; do not promote the prototype directly to production.
