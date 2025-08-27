/**
 * CRITICAL E2E TESTS - These must pass before any deployment
 * Tests the complete user workflows that matter most
 */

const { test, expect } = require('@playwright/test');

// CRITICAL WORKFLOW 1: Timer Start/Stop
test('CRITICAL: Timer start button actually starts timer', async ({ page }) => {
  // 1. Create a new game
  await page.goto('/');
  await page.fill('[data-testid="team-a-input"]', 'TestTeamA');
  await page.fill('[data-testid="team-b-input"]', 'TestTeamB');
  await page.selectOption('[data-testid="quarter-length"]', '10');
  await page.click('[data-testid="create-game-button"]');
  
  // 2. Navigate to admin panel
  const gameUrl = page.url();
  const gameId = gameUrl.split('/').pop();
  await page.goto(`/admin/${gameId}`);
  
  // 3. Enter admin password
  await page.fill('[data-testid="admin-password"]', 'netball2025');
  await page.click('[data-testid="admin-login-button"]');
  
  // 4. Verify timer is in stopped state
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Ready');
  await expect(page.locator('[data-testid="timer-display"]')).toHaveText('10:00');
  
  // 5. Click start button
  await page.click('[data-testid="start-button"]');
  
  // 6. Verify timer actually started
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Live', { timeout: 2000 });
  
  // 7. Wait 2 seconds and verify timer is counting down
  await page.waitForTimeout(2000);
  const timeAfter = await page.locator('[data-testid="timer-display"]').textContent();
  expect(timeAfter).not.toBe('10:00'); // Should have counted down
  expect(timeAfter).toMatch(/9:5[0-9]/); // Should be around 9:58 or 9:57
});

// CRITICAL WORKFLOW 2: Score Updates
test('CRITICAL: Add goal buttons actually update scores', async ({ page }) => {
  // Setup game (similar to above)
  await page.goto('/');
  await page.fill('[data-testid="team-a-input"]', 'TestTeamA');
  await page.fill('[data-testid="team-b-input"]', 'TestTeamB');
  await page.selectOption('[data-testid="quarter-length"]', '10');
  await page.click('[data-testid="create-game-button"]');
  
  const gameUrl = page.url();
  const gameId = gameUrl.split('/').pop();
  await page.goto(`/admin/${gameId}`);
  
  await page.fill('[data-testid="admin-password"]', 'netball2025');
  await page.click('[data-testid="admin-login-button"]');
  
  // Verify initial scores are 0
  await expect(page.locator('[data-testid="team-a-score"]')).toHaveText('0');
  await expect(page.locator('[data-testid="team-b-score"]')).toHaveText('0');
  
  // Add goal to Team A
  await page.click('[data-testid="team-a-add-goal"]');
  await expect(page.locator('[data-testid="team-a-score"]')).toHaveText('1');
  
  // Add goal to Team B
  await page.click('[data-testid="team-b-add-goal"]');
  await expect(page.locator('[data-testid="team-b-score"]')).toHaveText('1');
  
  // Add another goal to Team A
  await page.click('[data-testid="team-a-add-goal"]');
  await expect(page.locator('[data-testid="team-a-score"]')).toHaveText('2');
});

// CRITICAL WORKFLOW 3: Admin/Spectator Sync
test('CRITICAL: Spectator view syncs with admin changes', async ({ browser }) => {
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  const spectatorPage = await context.newPage();
  
  // Create game in admin
  await adminPage.goto('/');
  await adminPage.fill('[data-testid="team-a-input"]', 'TestTeamA');
  await adminPage.fill('[data-testid="team-b-input"]', 'TestTeamB');
  await adminPage.selectOption('[data-testid="quarter-length"]', '10');
  await adminPage.click('[data-testid="create-game-button"]');
  
  const gameUrl = adminPage.url();
  const gameId = gameUrl.split('/').pop();
  
  // Open admin panel
  await adminPage.goto(`/admin/${gameId}`);
  await adminPage.fill('[data-testid="admin-password"]', 'netball2025');
  await adminPage.click('[data-testid="admin-login-button"]');
  
  // Open spectator view
  await spectatorPage.goto(`/game/${gameId}`);
  
  // Verify spectator shows same initial state
  await expect(spectatorPage.locator('[data-testid="timer-display"]')).toHaveText('10:00');
  await expect(spectatorPage.locator('[data-testid="team-a-score"]')).toHaveText('0');
  
  // Start timer in admin
  await adminPage.click('[data-testid="start-button"]');
  
  // Verify spectator syncs (may take a few seconds)
  await expect(spectatorPage.locator('[data-testid="timer-status"]')).toHaveText('Live', { timeout: 5000 });
  
  // Add score in admin
  await adminPage.click('[data-testid="team-a-add-goal"]');
  
  // Verify spectator syncs score
  await expect(spectatorPage.locator('[data-testid="team-a-score"]')).toHaveText('1', { timeout: 5000 });
});

// CRITICAL WORKFLOW 4: Timer State Persistence
test('CRITICAL: Timer state persists correctly after page reload', async ({ page }) => {
  // Create game and start timer
  await page.goto('/');
  await page.fill('[data-testid="team-a-input"]', 'TestTeamA');
  await page.fill('[data-testid="team-b-input"]', 'TestTeamB');
  await page.selectOption('[data-testid="quarter-length"]', '10');
  await page.click('[data-testid="create-game-button"]');
  
  const gameUrl = page.url();
  const gameId = gameUrl.split('/').pop();
  await page.goto(`/admin/${gameId}`);
  
  await page.fill('[data-testid="admin-password"]', 'netball2025');
  await page.click('[data-testid="admin-login-button"]');
  
  // Start timer
  await page.click('[data-testid="start-button"]');
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Live');
  
  // Pause timer
  await page.click('[data-testid="pause-button"]');
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Ready');
  
  // Reload page
  await page.reload();
  await page.fill('[data-testid="admin-password"]', 'netball2025');
  await page.click('[data-testid="admin-login-button"]');
  
  // Verify timer is still paused (not running)
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Ready');
  
  // Verify start button works after reload
  await page.click('[data-testid="start-button"]');
  await expect(page.locator('[data-testid="timer-status"]')).toHaveText('Live');
});
