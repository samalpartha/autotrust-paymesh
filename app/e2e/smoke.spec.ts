import { test, expect } from '@playwright/test';

test.describe('AutoTrust Paymesh Smoke Tests', () => {

    test('should load the homepage and display connect options', async ({ page }) => {
        await page.goto('/');

        // Check for main title
        await expect(page.locator('body')).toContainText('AutoTrust');

        // Check for Connect Wallet button (since we are not connected)
        // The specific text might vary ("Connect Wallet", "Connect", etc.) 
        // depending on the WalletConnect component state.
        // Based on page.tsx logic: {!isConnected ? <WalletConnect /> : ...}
        const connectButton = page.getByRole('button', { name: /Connect|Wallet/i });
        if (await connectButton.count() > 0) {
            await expect(connectButton.first()).toBeVisible();
        } else {
            // Fallback: check for text if button role isn't clear
            await expect(page.getByText(/Connect/i).first()).toBeVisible();
        }
    });

    test('should verify console access and tab navigation', async ({ page }) => {
        // Navigate directly to /escrow
        await page.goto('/escrow');
        // Wait for hydration/rendering
        await page.waitForLoadState('networkidle');

        // Debug: Check if body contains "Demo"
        const bodyText = await page.locator('body').innerText();
        if (!bodyText.includes('Demo')) {
            console.log('Body text does not include Demo:', bodyText.substring(0, 500));
        }

        // Verify tabs
        // Using first() because sometimes multiple elements might match if tooltip text is also present
        await expect(page.getByRole('button', { name: /Demo/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Escrow/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /AI Agents/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /MeshMind|Copilot/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Advanced/i }).first()).toBeVisible();
    });

    test('should load MeshMind tab content', async ({ page }) => {
        await page.goto('/escrow');

        // Find and click MeshMind tab
        const meshMindTab = page.getByRole('button', { name: /MeshMind|Copilot/i }).first();
        await meshMindTab.click();

        // Verify content in the tab
        // Looking for "MeshMind" related headers or "Ask anything" text
        // Based on CopilotTab implementation
        await expect(page.locator('body')).toContainText(/MeshMind/i);
    });

});
