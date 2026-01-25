/**
 * Debug Utility for NestTask
 * Helps diagnose stale app / connection issues after long inactivity
 * 
 * Usage in browser console:
 *   - window.__nestDebug.getStatus()   - Get full debug status
 *   - window.__nestDebug.getLogs()     - Get all debug logs
 *   - window.__nestDebug.clearLogs()   - Clear logs
 *   - window.__nestDebug.enableVerbose() - Enable verbose logging
 */

// Enable debug mode via localStorage or URL param
const isDebugMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem('nesttask_debug') === 'true' ||
    new URLSearchParams(window.location.search).has('debug') ||
    new URLSearchParams(window.location.search).get('debug') === 'true'
  );
};

// Store debug logs in memory (max 500 entries)
const MAX_LOGS = 500;
const debugLogs: Array<{
  timestamp: string;
  category: string;
  message: string;
  data?: any;
}> = [];

// Track app state for debugging
interface AppDebugState {
  appOpenedAt: number;
  lastActiveAt: number;
  lastSessionCheck: number;
  lastDataFetch: number;
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
  connectionState: 'unknown' | 'connected' | 'disconnected' | 'checking';
  visibilityChanges: number;
  resumeEvents: number;
  networkReconnects: number;
  hardRefreshNeeded: boolean;
  lastError: string | null;
}

const appState: AppDebugState = {
  appOpenedAt: Date.now(),
  lastActiveAt: Date.now(),
  lastSessionCheck: 0,
  lastDataFetch: 0,
  sessionExpiresAt: null,
  isSessionValid: false,
  connectionState: 'unknown',
  visibilityChanges: 0,
  resumeEvents: 0,
  networkReconnects: 0,
  hardRefreshNeeded: false,
  lastError: null,
};

// Format duration in human readable format
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}hr`;
}

// Add a debug log entry
export function debugLog(category: string, message: string, data?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    data,
  };
  
  debugLogs.push(entry);
  
  // Trim logs if too many
  if (debugLogs.length > MAX_LOGS) {
    debugLogs.splice(0, debugLogs.length - MAX_LOGS);
  }
  
  // Always log to console in debug mode or if verbose
  if (isDebugMode() || localStorage.getItem('nesttask_verbose') === 'true') {
    const prefix = `[${category}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

// Update app state
export function updateDebugState(updates: Partial<AppDebugState>) {
  Object.assign(appState, updates);
  
  // Check if session is about to expire or expired
  if (appState.sessionExpiresAt) {
    const now = Date.now();
    const timeUntilExpiry = appState.sessionExpiresAt - now;
    
    if (timeUntilExpiry < 0) {
      debugLog('SESSION', '⚠️ SESSION EXPIRED!', {
        expiredAgo: formatDuration(Math.abs(timeUntilExpiry)),
      });
      appState.hardRefreshNeeded = true;
    } else if (timeUntilExpiry < 5 * 60 * 1000) {
      debugLog('SESSION', '⚠️ Session expiring soon!', {
        expiresIn: formatDuration(timeUntilExpiry),
      });
    }
  }
}

// Get current debug status
export function getDebugStatus() {
  const now = Date.now();
  
  return {
    ...appState,
    currentTime: new Date().toISOString(),
    appRunningFor: formatDuration(now - appState.appOpenedAt),
    timeSinceActive: formatDuration(now - appState.lastActiveAt),
    timeSinceSessionCheck: appState.lastSessionCheck 
      ? formatDuration(now - appState.lastSessionCheck) 
      : 'never',
    timeSinceDataFetch: appState.lastDataFetch 
      ? formatDuration(now - appState.lastDataFetch) 
      : 'never',
    sessionExpiresIn: appState.sessionExpiresAt 
      ? formatDuration(appState.sessionExpiresAt - now)
      : 'unknown',
    isSessionExpired: appState.sessionExpiresAt 
      ? appState.sessionExpiresAt < now 
      : null,
    logsCount: debugLogs.length,
  };
}

// Get all logs
export function getDebugLogs() {
  return [...debugLogs];
}

// Clear logs
export function clearDebugLogs() {
  debugLogs.length = 0;
}

// Enable verbose logging
export function enableVerbose() {
  localStorage.setItem('nesttask_verbose', 'true');
  console.log('Verbose logging enabled. Reload the page to see all logs.');
}

// Disable verbose logging
export function disableVerbose() {
  localStorage.removeItem('nesttask_verbose');
  console.log('Verbose logging disabled.');
}

// Enable debug mode
export function enableDebug() {
  localStorage.setItem('nesttask_debug', 'true');
  console.log('Debug mode enabled. Reload the page to see debug info.');
}

// Diagnose stale app issue
export function diagnoseStaleApp() {
  const status = getDebugStatus();
  const issues: string[] = [];
  
  console.log('\n=== NestTask Stale App Diagnosis ===\n');
  
  // Check session expiration
  if (status.isSessionExpired) {
    issues.push('🔴 SESSION EXPIRED - This is likely the cause!');
  } else if (status.sessionExpiresIn && status.sessionExpiresIn.includes('hr')) {
    const hours = parseFloat(status.sessionExpiresIn);
    if (hours < 1) {
      issues.push('🟡 Session expires within 1 hour');
    }
  }
  
  // Check connection state
  if (status.connectionState === 'disconnected') {
    issues.push('🔴 Connection is disconnected');
  } else if (status.connectionState === 'unknown') {
    issues.push('🟡 Connection state is unknown');
  }
  
  // Check inactivity
  if (status.timeSinceActive && status.timeSinceActive.includes('hr')) {
    issues.push(`🟡 App inactive for ${status.timeSinceActive}`);
  }
  
  // Check data fetch
  if (status.timeSinceDataFetch === 'never') {
    issues.push('🔴 No data has been fetched yet');
  } else if (status.timeSinceDataFetch && status.timeSinceDataFetch.includes('hr')) {
    issues.push(`🟡 Data last fetched ${status.timeSinceDataFetch} ago`);
  }
  
  if (issues.length === 0) {
    issues.push('✅ No obvious issues detected');
  }
  
  console.log('Issues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
  
  console.log('\nFull Status:');
  console.table(status);
  
  console.log('\nRecent Logs (last 20):');
  const recentLogs = debugLogs.slice(-20);
  recentLogs.forEach(log => {
    console.log(`[${log.timestamp}] [${log.category}] ${log.message}`, log.data || '');
  });
  
  return { issues, status, recentLogs };
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).__nestDebug = {
    getStatus: getDebugStatus,
    getLogs: getDebugLogs,
    clearLogs: clearDebugLogs,
    enableVerbose,
    disableVerbose,
    enableDebug,
    diagnose: diagnoseStaleApp,
    state: appState,
  };
  
  // Log initial state
  debugLog('APP', 'Debug utility initialized', {
    debugMode: isDebugMode(),
    timestamp: new Date().toISOString(),
  });
  
  // Show helpful message in console if debug mode is not enabled
  if (!isDebugMode()) {
    console.log(
      '%c🐛 NestTask Debug Utility',
      'font-size: 14px; font-weight: bold; color: #0284c7;',
      '\n\nEnable full debugging by adding ?debug=true to the URL',
      '\nOr run: window.__nestDebug.enableDebug()',
      '\n\nAvailable commands:',
      '\n  • window.__nestDebug.getStatus()   - Get app status',
      '\n  • window.__nestDebug.getLogs()     - View all logs',
      '\n  • window.__nestDebug.diagnose()    - Run diagnostics',
      '\n  • window.__nestDebug.enableVerbose() - Enable verbose mode',
      '\n\nSee Doc/PRODUCTION_DEBUGGING_GUIDE.md for full documentation'
    );
  } else {
    console.log(
      '%c🐛 Debug Mode Enabled',
      'font-size: 14px; font-weight: bold; color: #10b981; background: #d1fae5; padding: 4px 8px; border-radius: 4px;',
      '\n\nVerbose logging is active. Run window.__nestDebug.diagnose() for full diagnostics.'
    );
  }
}

export { appState, isDebugMode };
