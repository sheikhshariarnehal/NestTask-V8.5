import { test, expect } from '@playwright/test';

test('TC_Resume_Session_Expiry_Recovery', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    test.skip(true, 'E2E_EMAIL/E2E_PASSWORD not set');
  }

  // Track whether we see a token refresh or a 401 from tasks
  let sawRefresh = false;
  let sawTasks401 = false;
  let sawTasks200 = false;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/token') && url.includes('grant_type=refresh_token')) {
      if (response.status() === 200) sawRefresh = true;
    }
    if (url.includes('/rest/v1/tasks')) {
      if (response.status() === 401) sawTasks401 = true;
      if (response.status() === 200) sawTasks200 = true;
    }
  });

  await page.goto('http://localhost:5173');

  // Login if needed
  const welcomeMessage = page.getByText('Welcome back,');
  const emailInput = page.getByPlaceholder('Enter your email');

  await Promise.race([
    welcomeMessage.waitFor({ state: 'visible', timeout: 15_000 }),
    emailInput.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  if (await emailInput.isVisible()) {
    await emailInput.fill(email!);
    await page.getByPlaceholder('Enter your password').fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await welcomeMessage.waitFor({ state: 'visible', timeout: 20_000 });
  }

  // Simulate long-idle by forcing Supabase session expiry in storage.
  // This app configures Supabase storageKey to 'nesttask_supabase_auth'.
  await page.evaluate(() => {
    const authKey = 'nesttask_supabase_auth';

    const raw = localStorage.getItem(authKey);
    if (!raw) throw new Error('Supabase auth token value missing');

    const parsed = JSON.parse(raw);

    // Handle both shapes:
    // 1) { access_token, refresh_token, expires_at, ... }
    // 2) { currentSession: { ... } } (some wrappers)
    const session = parsed?.currentSession ?? parsed;
    if (!session || typeof session !== 'object') throw new Error('Unexpected session shape');

    // Expire it 60 seconds ago
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    session.expires_at = expiredAt;
    session.expires_in = 0;

    if (parsed?.currentSession) {
      parsed.currentSession = session;
      localStorage.setItem(authKey, JSON.stringify(parsed));
    } else {
      localStorage.setItem(authKey, JSON.stringify(session));
    }
  });

  // Trigger the same events a PWA/tab would on return.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });

  // Give the app some time to refresh + refetch.
  await page.waitForTimeout(3_000);

  // Assert we are not stuck: either tasks load (200) or app routes back to login.
  // Prefer tasks loading.
  if (sawTasks200) {
    expect(sawTasks401).toBeFalsy();
    expect(true).toBeTruthy();
    return;
  }

  // If tasks did not load, ensure we're not stuck on a forever skeleton.
  // (App-specific UI checks; keep conservative.)
  await expect(page.getByText('Welcome back,')).toBeVisible({ timeout: 10_000 });

  // In the failing production case this tends to be: no refresh + no tasks + endless loading.
  // This assertion forces the test to surface that regression.
  expect(sawRefresh || sawTasks200).toBeTruthy();
  expect(sawTasks401).toBeFalsy();
});
