# Screenshot status

There are no screenshots checked in yet. This environment has no Android emulator/AVD, and the automated headless Firefox capture returned a blank page before the client-rendered Expo screen appeared. Blank captures were discarded instead of being presented as UI screenshots.

The Expo web bundle does compile, but the design is for Android. Capture the actual app in Expo Go or an Android emulator after launch, then save the images here using these names:

- `docs/screenshots/chat.png` — `?variant=chat`
- `docs/screenshots/task.png` — `?variant=task`
- `docs/screenshots/sections.png` — `?variant=sections`

Suggested capture frame: portrait phone, approximately 430 × 932 CSS pixels. Keep the variant switcher visible so reviewers can tell which layout they are seeing. Capture screens from the running app; do not create illustrative replacements and label them screenshots.

To open a variant in Expo, run `npm start`, launch it on Android through Expo Go, then use the floating prototype switcher. The route parameter can also be changed in the URL when using a browser preview.
