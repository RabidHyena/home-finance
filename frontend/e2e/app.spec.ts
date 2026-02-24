import { test, expect } from '@playwright/test';

// ─── Navigation ──────────────────────────────────────────────

test.describe('Navigation', () => {
  test('home page loads with header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Главная');
  });

  test('navigate to all pages via desktop nav', async ({ page }) => {
    await page.goto('/');

    // Transactions (labeled "Расходы")
    await page.locator('.desktop-nav a[href="/transactions"]').click();
    await expect(page.locator('h1')).toContainText('Расходы');

    // Upload (labeled "Загрузить")
    await page.locator('.desktop-nav a[href="/upload"]').click();
    await expect(page.locator('h1')).toContainText('Загрузить файл');

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
    const uniqueDesc = `Create-${Date.now()}`;
    // Use today's date so it appears at the top (sorted by date desc)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00`;

    await page.goto('/transactions');

    // Click "Добавить"
    await page.click('button:has-text("Добавить")');

    // Fill form
    await page.fill('#amount', '1500');
    await page.fill('#description', uniqueDesc);
    await page.selectOption('#category', 'Food');
    await page.fill('#date', dateStr);

    // Submit
    await page.click('button:has-text("Сохранить")');

    // Verify transaction appears in list
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();
  });

  test('edit an existing transaction', async ({ page }) => {
    const uniqueDesc = `Edit-${Date.now()}`;

    // First create a transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '200');
    await page.fill('#description', uniqueDesc);
    const now1 = new Date();
    await page.fill('#date', `${now1.getFullYear()}-${String(now1.getMonth() + 1).padStart(2, '0')}-${String(now1.getDate()).padStart(2, '0')}T12:00`);
    await page.click('button:has-text("Сохранить")');
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();

    // Click edit button on the transaction card
    const card = page.locator('.card', { has: page.getByText(uniqueDesc) }).first();
    await card.locator('button[title="Редактировать"]').click();

    // Wait for edit modal
    await expect(page.locator('h2:has-text("Редактировать")')).toBeVisible();

    // Modify description
    const editedDesc = `Edited-${Date.now()}`;
    await page.fill('#description', editedDesc);
    await page.click('button:has-text("Сохранить")');

    // Verify updated
    await expect(page.getByText(editedDesc).first()).toBeVisible();
  });

  test('delete a transaction', async ({ page }) => {
    const uniqueDesc = `Delete-${Date.now()}`;

    // Create a transaction
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '300');
    await page.fill('#description', uniqueDesc);
    const now3 = new Date();
    await page.fill('#date', `${now3.getFullYear()}-${String(now3.getMonth() + 1).padStart(2, '0')}-${String(now3.getDate()).padStart(2, '0')}T14:00`);
    await page.click('button:has-text("Сохранить")');
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();

    // Click delete button on the transaction card
    const card = page.locator('.card', { has: page.getByText(uniqueDesc) }).first();
    await card.locator('button[title="Удалить"]').click();

    // Confirm deletion in modal
    const modal = page.locator('text=Удалить транзакцию');
    await expect(modal).toBeVisible();
    // Click the confirm "Удалить" button in the modal (not the page button)
    await page.locator('button.btn-danger, button:has-text("Удалить")').last().click();

    // Verify removed
    await expect(page.getByText(uniqueDesc)).not.toBeVisible();
  });
});

// ─── Category Filtering ─────────────────────────────────────

test.describe('Category Filtering', () => {
  test('filter transactions by category', async ({ page }) => {
    const ts = Date.now();
    const foodDesc = `Food-${ts}`;
    const busDesc = `Bus-${ts}`;

    await page.goto('/transactions');

    // Create two transactions with different categories
    for (const [desc, cat] of [[foodDesc, 'Food'], [busDesc, 'Transport']]) {
      await page.click('button:has-text("Добавить")');
      await page.fill('#amount', '100');
      await page.fill('#description', desc);
      await page.selectOption('#category', cat);
      const nowCat = new Date();
      await page.fill('#date', `${nowCat.getFullYear()}-${String(nowCat.getMonth() + 1).padStart(2, '0')}-${String(nowCat.getDate()).padStart(2, '0')}T10:00`);
      await page.click('button:has-text("Сохранить")');
      await expect(page.getByText(desc).first()).toBeVisible();
    }

    // Filter by Food
    await page.selectOption('.select', 'Food');
    await expect(page.getByText(foodDesc).first()).toBeVisible();
    await expect(page.getByText(busDesc)).not.toBeVisible();

    // Reset filter
    await page.click('button:has-text("Сбросить")');
    await expect(page.getByText(foodDesc).first()).toBeVisible();
    await expect(page.getByText(busDesc).first()).toBeVisible();
  });
});

// ─── Upload Page ─────────────────────────────────────────────

test.describe('Upload Page', () => {
  test('renders upload zone and instructions', async ({ page }) => {
    await page.goto('/upload');

    await expect(page.locator('h1')).toContainText('Загрузить файл');
    await expect(page.getByText('Как это работает').first()).toBeVisible();
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
        page.getByText('Нет данных для отображения').first()
      ).toBeVisible();
    }
  });

  test('shows charts when transactions exist', async ({ page }) => {
    const uniqueDesc = `Report-${Date.now()}`;

    // Create a transaction first
    await page.goto('/transactions');
    await page.click('button:has-text("Добавить")');
    await page.fill('#amount', '5000');
    await page.fill('#description', uniqueDesc);
    await page.selectOption('#category', 'Shopping');
    const now2 = new Date();
    await page.fill('#date', `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-${String(now2.getDate()).padStart(2, '0')}T10:00`);
    await page.click('button:has-text("Сохранить")');
    await expect(page.getByText(uniqueDesc).first()).toBeVisible();

    // Go to reports
    await page.goto('/reports');

    // Should show summary cards
    await expect(page.getByText('Всего потрачено').first()).toBeVisible();
    await expect(page.getByText('Транзакций').first()).toBeVisible();
    await expect(page.getByText('Средний чек').first()).toBeVisible();
  });
});

// ─── Home Page ───────────────────────────────────────────────

test.describe('Home Page', () => {
  test('shows summary card and quick actions', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Расходы за месяц').first()).toBeVisible();
    await expect(page.getByText('Добавить').first()).toBeVisible();
    await expect(page.getByText('Отчёты').first()).toBeVisible();
  });

  test('quick action links navigate correctly', async ({ page }) => {
    await page.goto('/');

    // Click "Добавить" quick action card (the Link, not a button)
    await page.locator('a[href="/upload"]').first().click();
    await expect(page.locator('h1')).toContainText('Загрузить файл');
  });
});
