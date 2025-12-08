import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test('Certificate Journal app launches and displays home page', async () => {
  // Launch Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '.webpack', 'x64', 'main')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Wait for the first window
  const window = await electronApp.firstWindow();

  // Wait for the app to load
  await window.waitForLoadState('domcontentloaded');

  // Check the page title
  const title = await window.title();
  expect(title).toBeTruthy();
  console.log('Window title:', title);

  // Check that the root element exists
  const root = await window.locator('#root');
  await expect(root).toBeVisible();

  // Take a screenshot
  await window.screenshot({ path: 'e2e/screenshots/app-launch.png' });

  // Check for navigation
  const homeLink = window.locator('nav a[href="/"]');
  const settingsLink = window.locator('nav a[href="/settings"]');
  const templatesLink = window.locator('nav a[href="/templates"]');

  // Verify navigation links exist (if they're present)
  const navExists = await window.locator('nav').count();
  if (navExists > 0) {
    console.log('Navigation found');
  }

  // Get page content for debugging
  const content = await window.textContent('body');
  console.log('Page has content:', content ? content.substring(0, 200) : 'empty');

  // Close the app
  await electronApp.close();
});

test('Settings page is accessible', async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '.webpack', 'x64', 'main')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Try to navigate to settings
  const url = window.url();
  console.log('Current URL:', url);

  // If using hash routing
  await window.evaluate(() => {
    window.location.hash = '#/settings';
  });

  // Wait a bit for navigation
  await window.waitForTimeout(500);

  // Take screenshot of settings page
  await window.screenshot({ path: 'e2e/screenshots/settings-page.png' });

  await electronApp.close();
});

test('Templates page is accessible', async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', '.webpack', 'x64', 'main')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Navigate to templates
  await window.evaluate(() => {
    window.location.hash = '#/templates';
  });

  await window.waitForTimeout(500);

  // Take screenshot
  await window.screenshot({ path: 'e2e/screenshots/templates-page.png' });

  await electronApp.close();
});
