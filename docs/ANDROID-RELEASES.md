# Android APK releases

The `Android release APK` GitHub Actions workflow builds the production app in
`apps/android` on pushes to `main`, version tags (`v*`), and manual runs. It uses
Node 22, Java 17, Android SDK 36, and the committed npm lockfile. It runs tests,
typecheck, and lint before generating the native project with Expo and running
Gradle's `:app:assembleRelease` task.

The APK includes the JavaScript bundle and supports ARM64 and ARMv7 Android
devices running Android 10 or newer. It does not need Metro or an Expo account.
The prototype in `pace-remote-prototype` is not built.

## Signing

Configure these repository Actions secrets before running the workflow:

- `ANDROID_KEYSTORE_BASE64`: the base64-encoded release keystore in PKCS12 format.
- `ANDROID_KEYSTORE_PASSWORD`: the password for both the keystore and private key.
- `ANDROID_KEY_ALIAS`: the signing key alias in the keystore.

Use the same signing key for every release so existing installations can update.
Keep a secure backup of the keystore, password, and alias outside Git. GitHub
secrets cannot be downloaded later. Keystore file extensions are ignored by Git.

Expo's generated project initially uses its debug key for the release variant.
The workflow replaces that signature with the dedicated release key using
Android's `apksigner`, then verifies the final APK. Signing credentials are only
provided to the signing step, and the temporary keystore is removed afterward.
There is no fallback to publishing an APK signed with the debug key.

## Publishing

Each successful run uploads the signed APK and its SHA-256 checksum as an Actions
artifact, retained for 30 days. A version tag also creates a GitHub release with
the APK and checksum attached. Rerunning the tag workflow replaces those assets.

Before the next release, update `expo.version` and increase
`expo.android.versionCode` in `apps/android/app.json`. The first release uses
version `1.0.0` and Android's default version code `1`. Commit and push the version
change to `main`, wait for the build to pass, then create a matching annotated tag:

```sh
git tag -a v1.0.0 -m "Pace Remote v1.0.0"
git push origin v1.0.0
```

The workflow rejects tags that do not exactly match `v` plus `expo.version`.
Download the APK from the GitHub release assets and check its checksum with
`sha256sum -c pace-remote-1.0.0.apk.sha256` before installing it.

References: [Expo release builds](https://docs.expo.dev/guides/local-app-production/)
and [Android apksigner](https://developer.android.com/tools/apksigner).
