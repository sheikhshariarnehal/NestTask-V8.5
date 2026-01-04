# NestTask Android App - Development Guide

Your web app has been successfully converted to an Android app using Capacitor! 🎉

## 📋 Prerequisites

Before running the Android app, ensure you have:

1. **Android Studio** - Download from [developer.android.com/studio](https://developer.android.com/studio)
2. **Java Development Kit (JDK)** - Version 17 or higher
3. **Android SDK** - Installed via Android Studio

## 🚀 Quick Start

### Build and Run

```bash
# Build web app and sync to Android
npm run android:build

# Open in Android Studio
npm run android:open
```

Or combine both:
```bash
npm run android:run
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run android:build` | Build web app and sync to Android |
| `npm run android:open` | Open Android project in Android Studio |
| `npm run android:run` | Build and open in one command |
| `npm run android:sync` | Sync web assets to Android (after changes) |

## 📱 Running on Device/Emulator

### Using Android Studio (Recommended)

1. Run: `npm run android:open`
2. Wait for Gradle sync to complete
3. Select a device or create an emulator:
   - Click **Device Manager** in Android Studio
   - Create a new Virtual Device (e.g., Pixel 5)
   - Choose Android API 30 or higher
4. Click the **Run** ▶️ button

### Using Physical Device

1. Enable Developer Options on your Android phone:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect your phone via USB
4. Run `npm run android:open`
5. Select your device in Android Studio and click Run

## 🔄 Development Workflow

### After Making Changes to Web Code:

```bash
# 1. Build the web app
npm run build

# 2. Sync changes to Android
npm run android:sync

# 3. Rebuild in Android Studio (or hot reload will work)
```

**Pro Tip:** Use `npm run android:build` to do steps 1-2 automatically!

## 📦 Project Structure

```
NestTask-V8.5/
├── android/                    # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Your web app files
│   │   │   ├── java/           # Native Android code
│   │   │   └── res/            # Android resources (icons, etc.)
│   │   └── build.gradle
│   └── build.gradle
├── dist/                       # Built web app (source for Android)
├── src/                        # Your React source code
├── capacitor.config.ts         # Capacitor configuration
└── package.json
```

## ⚙️ Configuration

### App ID and Name

Edit [`capacitor.config.ts`](capacitor.config.ts):

```typescript
const config: CapacitorConfig = {
  appId: 'com.nesttask.app',        // Change to your package ID
  appName: 'NestTask',               // Change to your app name
  webDir: 'dist'
};
```

### Android-Specific Settings

Located in [`android/app/src/main/AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml):
- Permissions
- App name
- Orientation settings

## 🎨 Customizing App Icon

1. Generate Android icons (512x512 PNG)
2. Use Android Studio:
   - Right-click `android/app/src/main/res`
   - Select **New** → **Image Asset**
   - Choose your icon file
   - Generate all sizes

Or use: [icon.kitchen](https://icon.kitchen/)

## 🔌 Adding Capacitor Plugins

Need native features? Install Capacitor plugins:

```bash
# Example: Camera
npm install @capacitor/camera
npx cap sync android

# Example: Filesystem
npm install @capacitor/filesystem
npx cap sync android

# Example: Network status
npm install @capacitor/network
npx cap sync android
```

Browse plugins: [capacitorjs.com/docs/plugins](https://capacitorjs.com/docs/plugins)

## 🐛 Common Issues

### Gradle Sync Failed
- Open Android Studio
- Click **File** → **Sync Project with Gradle Files**
- Check internet connection for dependency downloads

### Build Errors
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android:build
```

### White Screen on Launch
- Check browser console in Android Studio Logcat
- Ensure `dist/` folder has built files
- Verify [`capacitor.config.ts`](capacitor.config.ts) has correct `webDir: 'dist'`

### App Not Updating
```bash
# Force sync
npx cap copy android
npx cap sync android
```

## 📲 Building Release APK

### For Testing (Debug APK):

1. In Android Studio: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### For Production (Release APK):

1. Generate signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure in `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/my-release-key.keystore')
            storePassword 'password'
            keyAlias 'my-key-alias'
            keyPassword 'password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. Build release:
```bash
cd android
./gradlew assembleRelease
```

4. APK location: `android/app/build/outputs/apk/release/app-release.apk`

## 🚀 Publishing to Google Play Store

1. Create a Google Play Console account
2. Create a new app
3. Build a signed release APK or AAB (Android App Bundle)
4. Upload to Play Console
5. Complete store listing
6. Submit for review

Guide: [developer.android.com/studio/publish](https://developer.android.com/studio/publish)

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)

## 🆘 Need Help?

- Capacitor Forum: [forum.ionicframework.com](https://forum.ionicframework.com/)
- Stack Overflow: Tag with `capacitor`
- GitHub Issues: [github.com/ionic-team/capacitor](https://github.com/ionic-team/capacitor/issues)

---

**Happy Mobile Development! 📱✨**
