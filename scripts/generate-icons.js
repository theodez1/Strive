const fs = require('fs');
const path = require('path');

// Tailles d'icônes iOS requises
const iconSizes = [
  { size: '20x20', scale: '2x', filename: 'App-Icon-20x20@2x.png' },
  { size: '20x20', scale: '3x', filename: 'App-Icon-20x20@3x.png' },
  { size: '29x29', scale: '1x', filename: 'App-Icon-29x29@1x.png' },
  { size: '29x29', scale: '2x', filename: 'App-Icon-29x29@2x.png' },
  { size: '29x29', scale: '3x', filename: 'App-Icon-29x29@3x.png' },
  { size: '40x40', scale: '2x', filename: 'App-Icon-40x40@2x.png' },
  { size: '40x40', scale: '3x', filename: 'App-Icon-40x40@3x.png' },
  { size: '60x60', scale: '2x', filename: 'App-Icon-60x60@2x.png' },
  { size: '60x60', scale: '3x', filename: 'App-Icon-60x60@3x.png' },
  { size: '1024x1024', scale: '1x', filename: 'App-Icon-1024x1024@1x.png' }
];

const sourceIcon = path.join(__dirname, '../assets/icon.png');
const targetDir = path.join(__dirname, '../ios/Strive/Images.xcassets/AppIcon.appiconset');

console.log('📱 Génération des icônes iOS...');
console.log('Source:', sourceIcon);
console.log('Cible:', targetDir);

// Vérifier que l'icône source existe
if (!fs.existsSync(sourceIcon)) {
  console.error('❌ Icône source introuvable:', sourceIcon);
  process.exit(1);
}

// Créer le répertoire cible s'il n'existe pas
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copier l'icône source pour toutes les tailles
// (En production, vous utiliseriez une librairie comme sharp pour redimensionner)
iconSizes.forEach(({ filename }) => {
  const targetPath = path.join(targetDir, filename);
  fs.copyFileSync(sourceIcon, targetPath);
  console.log(`✅ Créé: ${filename}`);
});

console.log('🎉 Toutes les icônes ont été générées !');
console.log('');
console.log('📋 Instructions:');
console.log('1. Remplacez les fichiers copiés par des vraies icônes redimensionnées');
console.log('2. Ou utilisez un outil comme https://appicon.co/ pour générer automatiquement');
console.log('3. Puis faites: cd ios && xcodebuild clean && cd .. && expo run:ios');
