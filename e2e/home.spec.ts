import { test, expect } from '@playwright/test';

test('homepage has Health in title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Health/i);
}); 