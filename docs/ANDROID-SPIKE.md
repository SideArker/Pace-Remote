# Android transport decision

The production app uses Expo SDK 57, React Native 0.86, Expo Router and a development build. Android 10 (API 29) is the minimum because TLS 1.3 is mandatory. Target/compile SDK remains Expo's API 36 default. Expo Go is not supported.

The standard React Native WebSocket interface cannot provide an Android Keystore client key or configure a per-host certificate trust manager. Expo SecureStore stores values but does not expose a non-exportable TLS signing key. A small local Expo module therefore owns NSD discovery, the Android Keystore EC key, and OkHttp HTTPS/WSS connections. No generated Android project files are maintained by hand.

TLS is restricted to 1.3. The QR/manual pairing document carries the exact SHA-256 certificate fingerprint of the host and a 256-bit single-use secret that expires after two minutes. The phone pins the certificate before sending this secret. The host checks possession of the phone's private key through TLS client authentication and stores only the certificate fingerprint. Subsequent requests and WebSocket upgrades require an enrolled certificate. TLS uses the platform's ephemeral exchange and authenticated encryption; there is no custom cipher. The host decrypts messages and remains a trusted endpoint.

The host binds an explicitly selected RFC1918 IPv4 interface. It rejects remote addresses outside RFC1918 ranges. Discovery advertises `_pace-remote._tcp`; discovery metadata is never trusted for pairing. Manual address entry remains available when multicast is blocked. No account, relay, push provider, analytics service, or cloud synchronization is used by the product. Development package downloads and agent/model traffic are separate from the LAN control connection.

Native validation is still required on a real Android 10+ phone: Keystore client authentication, TLS 1.3, NSD lifecycle, Wi-Fi isolation, app background/foreground, revocation, and reconnect during a turn. This environment currently has no JDK, Android SDK, AVD, or connected device. Compilation and device checks must not be reported as passed until performed.

Sources inspected:

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Expo Modules API](https://docs.expo.dev/modules/module-api/)
- [Expo autolinking](https://docs.expo.dev/modules/autolinking/)
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
- [Android NSD](https://developer.android.com/develop/connectivity/wifi/use-nsd)
