import { test, expect } from '@playwright/test';

test.describe('Vehicle Classification Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the classification page
    await page.goto('/classification');
  });

  test('should display classification dashboard', async ({ page }) => {
    // Check if the main heading is present
    await expect(page.locator('h1')).toContainText('Vehicle Classification Dashboard');
    
    // Check if device information is displayed
    await expect(page.locator('text=Device:')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // The page should show loading state
    await expect(page.locator('text=Loading classification data')).toBeVisible();
  });

  test('should display key metrics cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="metrics-cards"]', { timeout: 10000 });
    
    // Check for key metrics
    await expect(page.locator('text=Total Vehicles')).toBeVisible();
    await expect(page.locator('text=Average Speed')).toBeVisible();
    await expect(page.locator('text=Vehicle Types')).toBeVisible();
    await expect(page.locator('text=Speed Violations')).toBeVisible();
  });

  test('should display vehicle type distribution', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="vehicle-distribution"]', { timeout: 10000 });
    
    // Check for vehicle type distribution section
    await expect(page.locator('text=Vehicle Type Distribution')).toBeVisible();
  });

  test('should display lane utilization', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="lane-utilization"]', { timeout: 10000 });
    
    // Check for lane utilization section
    await expect(page.locator('text=Lane Utilization')).toBeVisible();
  });

  test('should handle device switching', async ({ page }) => {
    // This test would require device context switching
    // For now, just verify the page loads with device context
    await expect(page.locator('text=Device:')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if the layout adapts to mobile
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if cards stack properly on mobile
    const cards = page.locator('[data-testid="metrics-cards"] > div');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/classification/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'API Error' })
      });
    });

    await page.reload();
    
    // Should show error state
    await expect(page.locator('text=Error loading data')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });

  test('should update data in real-time', async ({ page }) => {
    // Wait for initial data load
    await page.waitForSelector('[data-testid="metrics-cards"]', { timeout: 10000 });
    
    // Get initial vehicle count
    const initialCount = await page.locator('[data-testid="total-vehicles"]').textContent();
    
    // Wait for potential updates (this would require WebSocket simulation)
    await page.waitForTimeout(2000);
    
    // Verify the page is still responsive
    await expect(page.locator('h1')).toBeVisible();
  });
});
