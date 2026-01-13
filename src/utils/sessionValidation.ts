export async function requestSessionValidation(timeoutMs = 2000): Promise<void> {
  if (typeof window === 'undefined') return;

  await new Promise<void>((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('supabase-session-validated', handler as EventListener);
      resolve();
    };

    const handler = () => {
      finish();
    };

    const timeoutId = window.setTimeout(() => {
      console.log('[SessionValidation] Timed out, proceeding');
      finish();
    }, timeoutMs);

    window.addEventListener('supabase-session-validated', handler as EventListener, { once: true });
    window.dispatchEvent(new CustomEvent('request-session-validation'));
  });
}
