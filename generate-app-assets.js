#!/usr/bin/env node

// Script to generate app icons and splash screens for Capacitor
// This creates placeholder assets that can be replaced with custom designs later

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories for Android and iOS assets
const androidResPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const iosAppPath = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets');

// Android icon sizes
const androidIcons = [
  { folder: 'mipmap-ldpi', size: 36 },
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

// iOS icon sizes
const iosIcons = [
  { name: 'AppIcon-20x20@1x.png', size: 20 },
  { name: 'AppIcon-20x20@2x.png', size: 40 },
  { name: 'AppIcon-20x20@3x.png', size: 60 },
  { name: 'AppIcon-29x29@1x.png', size: 29 },
  { name: 'AppIcon-29x29@2x.png', size: 58 },
  { name: 'AppIcon-29x29@3x.png', size: 87 },
  { name: 'AppIcon-40x40@1x.png', size: 40 },
  { name: 'AppIcon-40x40@2x.png', size: 80 },
  { name: 'AppIcon-40x40@3x.png', size: 120 },
  { name: 'AppIcon-60x60@2x.png', size: 120 },
  { name: 'AppIcon-60x60@3x.png', size: 180 },
  { name: 'AppIcon-76x76@1x.png', size: 76 },
  { name: 'AppIcon-76x76@2x.png', size: 152 },
  { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
  { name: 'AppIcon-1024x1024@1x.png', size: 1024 }
];

// Android splash screen sizes
const androidSplash = [
  { folder: 'drawable-land-mdpi', width: 480, height: 320 },
  { folder: 'drawable-land-hdpi', width: 800, height: 480 },
  { folder: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { folder: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { folder: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
  { folder: 'drawable-port-mdpi', width: 320, height: 480 },
  { folder: 'drawable-port-hdpi', width: 480, height: 800 },
  { folder: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { folder: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { folder: 'drawable-port-xxxhdpi', width: 1280, height: 1920 }
];

console.log('Generating app assets...');
console.log('Note: These are placeholder assets. Replace with actual designs before publishing.');

// Create a simple SVG icon placeholder
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#1e40af"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="180" font-weight="bold" text-anchor="middle" fill="white">♔</text>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="48" text-anchor="middle" fill="white">Chess Master</text>
</svg>`;

// Create splash screen SVG
const splashSVG = (width, height) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#0f172a"/>
  <text x="${width/2}" y="${height/2}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.15}" font-weight="bold" text-anchor="middle" fill="white">♔</text>
  <text x="${width/2}" y="${height/2 + Math.min(width, height) * 0.1}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.05}" text-anchor="middle" fill="#94a3b8">Chess Master</text>
</svg>`;

// Save icon SVG
fs.writeFileSync('app-icon.svg', iconSVG);

// Save splash screen SVG
fs.writeFileSync('splash-screen.svg', splashSVG(1920, 1920));

console.log('✓ Created app-icon.svg and splash-screen.svg');
console.log('');
console.log('Next steps:');
console.log('1. Replace app-icon.svg with your custom app icon (512x512 recommended)');
console.log('2. Replace splash-screen.svg with your custom splash screen');
console.log('3. Run: npx capacitor-assets generate');
console.log('4. This will generate all required icon and splash screen sizes for both platforms');
console.log('');
console.log('To add platforms and build:');
console.log('  npx cap add android');
console.log('  npx cap add ios');
console.log('  npx cap sync');
console.log('');
console.log('Then open in native IDEs:');
console.log('  npx cap open android  # Opens in Android Studio');
console.log('  npx cap open ios      # Opens in Xcode (macOS only)');