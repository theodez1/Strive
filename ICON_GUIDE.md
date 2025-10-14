# 📱 Guide : Où mettre l'icône de l'application

## 🎯 Vue d'ensemble

Pour ajouter ou modifier l'icône de votre application **Strive**, vous devez placer les fichiers d'icône à **3 emplacements différents** :

1. **Dossier `assets/`** (pour Expo et les builds)
2. **iOS natif** (pour l'App Store et les builds iOS)
3. **Android natif** (pour le Play Store et les builds Android)

---

## 📂 1. Dossier `assets/` (Expo)

### 📍 Emplacement
```
strive-mobile/assets/
```

### 🖼️ Fichiers à remplacer

| Fichier | Taille recommandée | Usage |
|---------|-------------------|-------|
| `icon.png` | **1024x1024 px** | Icône principale de l'app |
| `adaptive-icon.png` | **1024x1024 px** | Icône adaptative Android |
| `favicon.png` | **48x48 px** | Favicon web (optionnel) |
| `notification-icon.png` | **96x96 px** | Icône des notifications |
| `splash-icon.png` | **512x512 px** | Logo sur l'écran de démarrage |

### ✅ Recommandations
- Format : **PNG** avec fond transparent (sauf `icon.png`)
- `icon.png` : Fond uni avec votre logo centré
- `adaptive-icon.png` : Logo centré, sans fond (pour Android adaptatif)

---

## 🍎 2. iOS natif

### 📍 Emplacement
```
strive-mobile/ios/Strive/Images.xcassets/AppIcon.appiconset/
```

### 🖼️ Fichier actuel
- `App-Icon-1024x1024@1x.png` (1024x1024 px)

### 🔧 Comment remplacer

#### **Option 1 : Remplacement simple**
1. Remplacez le fichier `App-Icon-1024x1024@1x.png` par votre nouvelle icône (1024x1024 px)
2. Rebuild l'app iOS :
   ```bash
   cd strive-mobile
   npx expo run:ios
   ```

#### **Option 2 : Toutes les tailles (recommandé pour production)**
Utilisez un générateur d'icônes comme :
- **[appicon.co](https://appicon.co/)** (gratuit)
- **[makeappicon.com](https://makeappicon.com/)** (gratuit)

Uploadez votre icône 1024x1024, téléchargez le pack iOS et remplacez tout le dossier `AppIcon.appiconset/`.

### 📋 Tailles complètes iOS (si générées)
```
20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 
87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024
```

---

## 🤖 3. Android natif

### 📍 Emplacement
```
strive-mobile/android/app/src/main/res/
```

### 🖼️ Fichiers à remplacer

Vous devez remplacer les icônes dans **5 dossiers** différents pour supporter toutes les densités d'écran :

| Dossier | Taille | Format |
|---------|--------|--------|
| `mipmap-mdpi/` | 48x48 px | `.webp` ou `.png` |
| `mipmap-hdpi/` | 72x72 px | `.webp` ou `.png` |
| `mipmap-xhdpi/` | 96x96 px | `.webp` ou `.png` |
| `mipmap-xxhdpi/` | 144x144 px | `.webp` ou `.png` |
| `mipmap-xxxhdpi/` | 192x192 px | `.webp` ou `.png` |

### 📝 Noms des fichiers
Dans **chaque** dossier `mipmap-*`, remplacez :
- `ic_launcher.webp` (icône carrée)
- `ic_launcher_round.webp` (icône ronde)
- `ic_launcher_foreground.webp` (icône pour l'adaptive icon)

### 🔧 Comment remplacer

#### **Option 1 : Utiliser un générateur**
1. Allez sur **[appicon.co](https://appicon.co/)** ou **[Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)**
2. Uploadez votre icône 1024x1024
3. Téléchargez le pack Android
4. Remplacez tous les fichiers dans les dossiers `mipmap-*`

#### **Option 2 : Conversion manuelle**
Si vous avez les images :
```bash
# Convertir PNG vers WebP (optionnel)
cwebp input.png -o ic_launcher.webp -q 90
```

### ✅ Rebuild Android
```bash
cd strive-mobile
npx expo run:android
```

---

## 🚀 Méthode rapide avec Expo (Recommandée)

Si vous utilisez Expo, la méthode la plus simple est :

1. **Remplacez `assets/icon.png`** (1024x1024 px)
2. **Remplacez `assets/adaptive-icon.png`** (1024x1024 px, fond transparent)
3. **Rebuild les apps natives** :
   ```bash
   cd strive-mobile
   
   # iOS
   npx expo prebuild --clean
   npx expo run:ios
   
   # Android
   npx expo prebuild --clean
   npx expo run:android
   ```

Expo générera automatiquement toutes les tailles natives ! ✨

---

## 📐 Spécifications de design

### ✅ Recommandations générales
- **Format** : PNG (avec transparence si nécessaire)
- **Taille de base** : 1024x1024 px
- **Zone de sécurité** : Gardez votre logo dans un cercle de **640x640 px** au centre (pour Android adaptatif)
- **Évitez** : Texte trop petit, détails trop fins
- **Testez** : Sur fond clair ET foncé (mode sombre)

### 🎨 Structure recommandée pour `adaptive-icon.png`
```
┌─────────────────────────┐
│  1024x1024 (carré)      │
│                         │
│    ┌──────────────┐    │
│    │              │    │
│    │  Logo 640px  │    │  ← Zone visible sur Android
│    │   (cercle)   │    │
│    │              │    │
│    └──────────────┘    │
│                         │
└─────────────────────────┘
```

---

## 🧪 Vérification après changement

### iOS
1. Ouvrez **Xcode** : `open ios/Strive.xcworkspace`
2. Allez dans **Images.xcassets > AppIcon**
3. Vérifiez que toutes les tailles sont remplies
4. Rebuild : `npx expo run:ios`

### Android
1. Ouvrez **Android Studio** : `open -a "Android Studio" android`
2. Allez dans `res > mipmap-*`
3. Vérifiez que tous les fichiers sont présents
4. Rebuild : `npx expo run:android`

---

## 🛠️ Outils utiles

| Outil | URL | Usage |
|-------|-----|-------|
| **App Icon Generator** | [appicon.co](https://appicon.co/) | Génère toutes les tailles iOS + Android |
| **Android Asset Studio** | [romannurik.github.io](https://romannurik.github.io/AndroidAssetStudio/) | Génère les icônes Android adaptatives |
| **Make App Icon** | [makeappicon.com](https://makeappicon.com/) | Alternative complète |
| **Figma** | [figma.com](https://figma.com) | Design de l'icône |
| **WebP Converter** | En ligne ou via CLI | Convertir PNG → WebP |

---

## ⚠️ Notes importantes

1. **Nettoyez toujours le cache** après avoir changé les icônes :
   ```bash
   # iOS
   cd ios && rm -rf build Pods && pod install && cd ..
   
   # Android
   cd android && ./gradlew clean && cd ..
   ```

2. **Les icônes ne changent pas en mode développement Expo Go** - Il faut faire un build natif (`npx expo run:ios/android`)

3. **Pour les builds de production** (via EAS Build), les icônes dans `assets/` suffisent :
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

---

## 🎯 Résumé rapide

**Pour un changement rapide d'icône :**

1. Préparez votre icône **1024x1024 px** (PNG)
2. Remplacez `assets/icon.png` et `assets/adaptive-icon.png`
3. Utilisez **[appicon.co](https://appicon.co/)** pour générer toutes les tailles
4. Remplacez les fichiers dans :
   - `ios/Strive/Images.xcassets/AppIcon.appiconset/`
   - `android/app/src/main/res/mipmap-*/`
5. Rebuild :
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   npx expo run:android
   ```

**C'est tout ! 🎉**

