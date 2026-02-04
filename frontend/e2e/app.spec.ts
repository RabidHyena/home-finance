import { test, expect } from '@playwright/test';

// ─── Navigation ──────────────────────────────────────────────

test.describe('Navigation', () => {
  test('home page loads with header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toContainText('Home Finance');
    await expect(page.locator('h1')).toContainText('Главная');
  });

  test('navigate to all pages via desktop nav', async ({ page }) => {
    await page.goto('/');

    // Transactions
    await page.locator('.desktop-nav a[href="/transactions"]').click();
    await expect(page.locator('h1')).toContainText('Транзакции');

    // Upload
    await page.locator('.desktop-nav a[href="/upload"]').click();
    await expect(page.locator('h1')).toContainText('Загрузить скриншот');

    // Reports
    await page.locator('.desktop-nav a[href="/reports"]').click();
    await expect(page.locator('h1')).toContainText('Отчёты');

    // Back to Home
    await page.locator('.desktop-nav a[href="/"]').click();
    await expect(page.locator('h1')).toContainText('Главная');
  });
});

// ─── Transactions CRUD ───────────────────────────────────────

test.describe('Transactions CRUD', () => {
  test('create a new transaction', async ({ page }) => {
    await page.goto('/transactions');

    // Click "Добавить"
    await page.click('button:has-text("Добавить")');

    // Fill form
    await page.fill('#amount', '1500');
    await page.fill('#description', 'Playwright Test Purchase');
    await page.selectOption('#category', 'Food');
    await page.fill('#date', '2026-01-15T10:30');

    // Submit
    await page.click('button:has-text("Сохранить")');

    // Verify transaction appears in list
    await expect(page.locator('text=Playwright Test Purchase')).toBeVisible();
  });

  test('edit an existing transaction', async ({ page }) => {
    // First create a transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '200');
    await page.fill('#description', 'To Be Edited');
    await page.fill('#date', '2026-01-20T12:00');
    await page.click('button:has-text("Сохранить")');
    await expect(page.locator('text=To Be Edited')).toBeVisible();

    // Click edit button on the transaction card
    const card = page.locator('text=To Be Edited').locator('..');
    await card.locator('button').first().click();

    // Wait for edit modal
    await expect(page.locator('h2:has-text("Редактировать")')).toBeVisible();

    // Modify description
    await page.fill('#description', 'Edited Transaction');
    await page.click('button:has-text("Сохранить")');

    // Verify updated
    await expect(page.locator('text=Edited Transaction')).toBeVisible();
  });

  test('delete a transaction', async ({ page }) => {
    // Create a transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '300');
    await page.fill('#description', 'To Be Deleted');
    await page.fill('#date', '2026-01-25T14:00');
    await page.click('button:has-text("Сохранить")');
    await expect(page.locator('text=To Be Deleted')).toBeVisible();

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Find and click delete button (second button in card actions)
    const card = page.locator('text=To Be Deleted').locator('..');
    const buttons = card.locator('button');
    await buttons.last().click();

    // Verify removed
    await expect(page.locator('text=To Be Deleted')).not.toBeVisible();
  });
});

// ─── Category Filtering ─────────────────────────────────────

test.describe('Category Filtering', () => {
  test('filter transactions by category', async ({ page }) => {
    await page.goto('/transactions');

    // Create two transactions with different categories
    for (const [desc, cat] of [
      ['Food Item', 'Food'],
      ['Bus Ticket', 'Transport'],
    ]) {
      await page.click('button:has-text("Добавить")');
      await page.fill('#amount', '100');
      await page.fill('#description', desc);
      await page.selectOption('#category', cat);
      await page.fill('#date', '2026-02-01T10:00');
      await page.click('button:has-text("Сохранить")');
      await expect(page.locator(`text=${desc}`)).toBeVisible();
    }

    // Filter by Food
    await page.selectOption('.select', 'Food');
    await expect(page.locator('text=Food Item')).toBeVisible();
    await expect(page.locator('text=Bus Ticket')).not.toBeVisible();

    // Reset filter
    await page.click('button:has-text("Сбросить")');
    await expect(page.locator('text=Food Item')).toBeVisible();
    await expect(page.locator('text=Bus Ticket')).toBeVisible();
  });
});

// ─── Upload Page ─────────────────────────────────────────────

test.describe('Upload Page', () => {
  test('renders upload zone and instructions', async ({ page }) => {
    await page.goto('/upload');

    await expect(page.locator('h1')).toContainText('Загрузить скриншот');
    await expect(page.locator('text=Как это работает')).toBeVisible();
    await expect(
      page.locator('text=Загрузите скриншот из банковского приложения')
    ).toBeVisible();
  });
});

// ─── Reports Page ────────────────────────────────────────────

test.describe('Reports Page', () => {
  test('shows empty state when no data', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.locator('h1')).toContainText('Отчёты');
    // Either shows data or empty message
    const hasData = await page.locator('.recharts-wrapper').count();
    if (hasData === 0) {
      await expect(
        page.locator('text=Нет данных для отображения')
      ).toBeVisible();
    }
  });

  test('shows charts when transactions exist', async ({ page }) => {
    // Create a transaction first
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '5000');
    await page.fill('#description', 'Report Test');
    await page.selectOption('#category', 'Shopping');
    await page.fill('#date', '2026-02-01T10:00');
    await page.click('button:has-text("Сохранить")');
    await expect(page.locator('text=Report Test')).toBeVisible();

    // Go to reports
    await page.goto('/reports');

    // Should show summary cards
    await expect(page.locator('text=Всего потрачено')).toBeVisible();
    await expect(page.locator('text=Транзакций')).toBeVisible();
    await expect(page.locator('text=Средний чек')).toBeVisible();
  });
});

// ─── Home Page ───────────────────────────────────────────────

test.describe('Home Page', () => {
  test('shows summary card and quick actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Расходы за текущий месяц')).toBeVisible();
    await expect(page.locator('text=Добавить')).toBeVisible();
    await expect(page.locator('text=Отчёты')).toBeVisible();
  });

  test('quick action links navigate correctly', async ({ page }) => {
    await page.goto('/');

    // Click "Добавить" quick action card (the Link, not a button)
    await page.locator('a[href="/upload"]').first().click();
    await expect(page.locator('h1')).toContainText('Загрузить скриншот');
  });
});
