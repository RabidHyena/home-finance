import { chromium, type FullConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_STATE = join(__dirname, '.auth-state.json');

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = 'http://localhost:3000';
  const apiURL = 'http://localhost:8000';

  const testUser = {
    username: 'e2etest',
    email: 'e2etest@test.com',
    password: 'TestPassword123',
  };

  // Register user via API (ignore error if already exists)
  await page.request.post(`${apiURL}/api/auth/register`, { data: testUser }).catch(() => {});

  // Login via UI
  await page.goto(`${baseURL}/login`);
  await page.locator('input[type="text"]').fill(testUser.email);
  await page.locator('input[type="password"]').fill(testUser.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to home after login
  await page.waitForURL('**/', { timeout: 10000 });

  // Save auth state (cookies + localStorage)
  await context.storageState({ path: STORAGE_STATE });

  await browser.close();
}

export default globalSetup;
export { STORAGE_STATE };
