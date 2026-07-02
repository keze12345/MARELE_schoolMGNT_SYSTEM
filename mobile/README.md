# MARELI School Android App

Flutter Android app for the MARELI school management system.

## Build APK

From this directory:

```bash
flutter pub get
flutter build apk --release
```

The generated APK will be at:

```text
build/app/outputs/flutter-apk/app-release.apk
```

This first version is dependency-light and ships with local demo records so the
APK opens and works immediately. The UI is structured so the sample records can
later be replaced with Supabase calls from the existing web system.
