import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const initializeCapacitor = async () => {
  // Only initialize if running as a native app
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Configure status bar for mobile
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    }

    // Hide splash screen after app is ready
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      await SplashScreen.hide();
    }

    // Add keyboard listeners for better mobile UX
    if (Capacitor.isPluginAvailable('Keyboard')) {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    }

    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('App has become active');
        // Resume any paused activities
      } else {
        console.log('App has become inactive');
        // Pause any ongoing activities
      }
    });

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
};

// Utility function to trigger haptic feedback on mobile
export const triggerHapticFeedback = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    }[style];
    
    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    console.error('Haptic feedback error:', error);
  }
};

// Utility to check if running on mobile
export const isMobile = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';