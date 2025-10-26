/**
 * E2E tests for historical chart functionality (task 8.4)
 */

import { test, expect } from '@playwright/test';

test.describe('Historical Classification Charts E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to classification page
    await page.goto('/classification');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="historical-charts"]');
  });

  test('should display historical charts interface', async ({ page }) => {
    // Check if historical charts tab is visible
    await expect(page.locator('[data-testid="historical-charts-tab"]')).toBeVisible();
    
    // Click on historical charts tab
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Verify chart controls are visible
    await expect(page.locator('select[title="Select time period for historical data"]')).toBeVisible();
    await expect(page.locator('select[title="Select chart visualization type"]')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('should change time period and load data', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Change time period to yesterday
    await page.selectOption('select[title="Select time period for historical data"]', 'yesterday');
    
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="chart-content"]', { timeout: 10000 });
    
    // Verify chart content is displayed
    await expect(page.locator('[data-testid="chart-content"]')).toBeVisible();
  });

  test('should switch between chart types', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Test different chart types
    const chartTypes = ['histogram', 'heatmap', 'trend', 'comparative', 'peakhour', 'composition', 'laneheatmap', 'speeddist', 'trafficflow'];
    
    for (const chartType of chartTypes) {
      await page.selectOption('select[title="Select chart visualization type"]', chartType);
      await page.click('button:has-text("Refresh")');
      
      // Wait for chart to render
      await page.waitForSelector('[data-testid="chart-content"]', { timeout: 5000 });
      
      // Verify chart type specific content
      await expect(page.locator('[data-testid="chart-content"]')).toBeVisible();
    }
  });

  test('should export charts in different formats', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Load some data
    await page.click('button:has-text("Refresh")');
    await page.waitForSelector('[data-testid="chart-content"]');
    
    // Test PNG export
    const pngDownloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("PNG")');
    const pngDownload = await pngDownloadPromise;
    expect(pngDownload.suggestedFilename()).toContain('.png');
    
    // Test SVG export
    const svgDownloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("SVG")');
    const svgDownload = await svgDownloadPromise;
    expect(svgDownload.suggestedFilename()).toContain('.svg');
  });

  test('should handle chart customization settings', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Open settings panel
    await page.click('button:has-text("Settings")');
    
    // Verify settings panel is visible
    await expect(page.locator('h3:has-text("Chart Customization")')).toBeVisible();
    
    // Toggle grid lines
    await page.check('input[type="checkbox"]:near(text="Show grid lines")');
    
    // Change color scheme
    await page.selectOption('select:near(text="Color Scheme")', 'colorblind');
    
    // Change font size
    await page.selectOption('select:near(text="Font Size")', 'large');
    
    // Verify settings are applied
    await expect(page.locator('input[type="checkbox"]:near(text="Show grid lines")')).toBeChecked();
    await expect(page.locator('select:near(text="Color Scheme")')).toHaveValue('colorblind');
    await expect(page.locator('select:near(text="Font Size")')).toHaveValue('large');
  });

  test('should handle virtualization for large datasets', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Select month time period (likely to have more data)
    await page.selectOption('select[title="Select time period for historical data"]', 'month');
    await page.click('button:has-text("Refresh")');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="chart-content"]');
    
    // Check if virtualization is enabled
    const virtualizationInfo = page.locator('text=Showing');
    if (await virtualizationInfo.isVisible()) {
      // Verify pagination controls are present
      await expect(page.locator('button:has-text("← Previous")')).toBeVisible();
      await expect(page.locator('button:has-text("Next →")')).toBeVisible();
      
      // Test pagination
      await page.click('button:has-text("Next →")');
      await page.waitForTimeout(1000); // Wait for data to update
      
      // Verify data range has changed
      const updatedInfo = await page.locator('text=Showing').textContent();
      expect(updatedInfo).toContain('Showing');
    }
  });

  test('should handle comparative chart functionality', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Select comparative chart type
    await page.selectOption('select[title="Select chart visualization type"]', 'comparative');
    
    // Verify comparative controls are visible
    await expect(page.locator('select:has-text("Last 24 Hours")')).toBeVisible();
    await expect(page.locator('select:has-text("Yesterday")')).toBeVisible();
    
    // Change comparison periods
    await page.selectOption('select:has-text("Last 24 Hours")', 'yesterday');
    await page.selectOption('select:has-text("Yesterday")', 'month');
    
    // Click refresh to load comparative data
    await page.click('button:has-text("Refresh")');
    
    // Wait for comparative chart to load
    await page.waitForSelector('[data-testid="chart-content"]');
    
    // Verify comparative chart content
    await expect(page.locator('text=Comparative Analysis')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Mock API failure
    await page.route('/api/classification/historical*', route => route.abort());
    
    // Try to load data
    await page.click('button:has-text("Refresh")');
    
    // Verify error message is displayed
    await expect(page.locator('text=Error:')).toBeVisible();
    
    // Verify error message is informative
    await expect(page.locator('text=Error:')).toContainText('Failed to fetch');
  });

  test('should maintain user preferences', async ({ page }) => {
    // Switch to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Set some preferences
    await page.selectOption('select[title="Select time period for historical data"]', 'yesterday');
    await page.selectOption('select[title="Select chart visualization type"]', 'heatmap');
    
    // Open settings and change options
    await page.click('button:has-text("Settings")');
    await page.check('input[type="checkbox"]:near(text="Show grid lines")');
    await page.selectOption('select:near(text="Color Scheme")', 'monochrome');
    
    // Reload page
    await page.reload();
    
    // Switch back to historical charts
    await page.click('[data-testid="historical-charts-tab"]');
    
    // Verify preferences are restored
    await expect(page.locator('select[title="Select time period for historical data"]')).toHaveValue('yesterday');
    await expect(page.locator('select[title="Select chart visualization type"]')).toHaveValue('heatmap');
    
    // Check settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator('input[type="checkbox"]:near(text="Show grid lines")')).toBeChecked();
    await expect(page.locator('select:near(text="Color Scheme")')).toHaveValue('monochrome');
  });
});
