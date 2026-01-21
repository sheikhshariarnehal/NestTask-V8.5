// PWA Reload Prompt Component
// Only active on web builds (disabled for Capacitor native apps)
import { Capacitor } from '@capacitor/core';
import './ReloadPrompt.css';

// For Capacitor builds, export a no-op component
// The PWA plugin is disabled in vite.config.ts for Capacitor builds
function ReloadPrompt() {
  // Skip on native platforms - PWA is not used in Capacitor apps
  if (Capacitor.isNativePlatform()) {
    return null;
  }
  
  // For web builds, dynamically import the actual component
  // This import will be resolved at build time by Vite PWA plugin
  return null; // PWA prompt is handled by the service worker in index.html
}

export default ReloadPrompt;
