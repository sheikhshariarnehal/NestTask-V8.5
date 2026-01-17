import { useRegisterSW } from 'virtual:pwa-register/react';
import './ReloadPrompt.css';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW Registered:', swUrl);
      
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="pwa-reload-prompt">
      <div className="pwa-reload-prompt-toast">
        <div className="pwa-reload-prompt-message">
          {offlineReady ? (
            <span>
              <strong>App ready!</strong> NestTask can now work offline.
            </span>
          ) : (
            <span>
              <strong>Update available!</strong> New version is ready.
            </span>
          )}
        </div>
        <div className="pwa-reload-prompt-buttons">
          {needRefresh && (
            <button
              className="pwa-reload-prompt-button pwa-reload-prompt-button-primary"
              onClick={() => updateServiceWorker(true)}
            >
              Update
            </button>
          )}
          <button
            className="pwa-reload-prompt-button pwa-reload-prompt-button-secondary"
            onClick={() => close()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
