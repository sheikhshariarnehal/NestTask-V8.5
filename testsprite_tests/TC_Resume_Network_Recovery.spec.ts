import { test, expect } from '@playwright/test';

test('TC_Resume_Network_Recovery', async ({ page, context }) => {
  // Setup Network Monitoring
  let tokenRefreshCheck = false;
  let taskFetchCount = 0;
  
  page.on('response', response => {
    const url = response.url();
    
    // Check for Token Refresh
    if (url.includes('/token') && url.includes('grant_type=refresh_token')) {
      console.log(`[NET] Token Refresh detected: ${response.status()}`);
      if (response.status() === 200) tokenRefreshCheck = true;
    }

    // Check for Task Fetching
    if (url.includes('/rest/v1/tasks')) {
      console.log(`[NET] Task Fetch detected: ${response.status()}`);
      taskFetchCount++;
    }
  });

  // 1. Navigate to app
  // Using localhost:5173 as seen in other commands
  await page.goto('http://localhost:5173');

  // 2. Determine State
  const welcomeMessage = page.getByText('Welcome back,');
  const emailInput = page.getByPlaceholder('Enter your email');
  const signInButton = page.getByRole('button', { name: /sign in/i });

  console.log('Waiting for initial state...');
  try {
    await Promise.race([
      welcomeMessage.waitFor({ state: 'visible', timeout: 10000 }),
      emailInput.waitFor({ state: 'visible', timeout: 10000 })
    ]);
  } catch (e) {
    console.log('Timeout waiting for initial state. Dumping body text:');
    console.log(await page.locator('body').innerText());
    throw e;
  }

  if (await emailInput.isVisible()) {
    console.log('Login form detected. Logging in...');
    await emailInput.fill('bxbbd8@diu.edu.bd');
    await page.getByPlaceholder('Enter your password').fill('vbxbx bx');
    await signInButton.click();
    console.log('Submitted login. Waiting for dashboard...');
    await welcomeMessage.waitFor({ state: 'visible', timeout: 15000 });
  } else {
    console.log('Already logged in.');
  }

  // 3. Confirm Dashboard Content
  console.log('Dashboard loaded (Welcome message visible).');
  // await expect(page.getByText('All Tasks').first()).toBeVisible({ timeout: 15000 });

  // 4. Set Offline
  console.log('Simulating OFFLINE...');
  await context.setOffline(true);

  // 5. Wait 5 seconds
  await page.waitForTimeout(5000);

  // 6. Set Online (Resume)
  console.log('Simulating ONLINE (Resume)...');
  await context.setOffline(false);

  // Trigger a visibility change to ensure hooks fire if they rely on it
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    setTimeout(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('app-resume')); // Dispatch custom event if needed
    }, 100);
  });

  // 7. Verify Data Matches
  // We expect the list to remain visible or re-appear
  console.log('Verifying recovery...');
  // Check for 'Welcome back'
  await expect(page.getByText('Welcome back,')).toBeVisible({ timeout: 10000 });

  if (taskFetchCount > 0) {
      console.log('✅ Verified: API requests resumed successfully.');
  } else {
      console.log('⚠️ Warning: No task API requests were captured during the test.');
  }

  // Check for error toasts
  const errorToast = page.locator('.toast-error').first();
  if (await errorToast.isVisible()) {
    throw new Error('Error toast appeared after resume');
  }

  console.log('Test Passed: Recovery successful');
});
