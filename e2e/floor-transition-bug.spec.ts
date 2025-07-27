import { test, expect } from '@playwright/test';

test.describe('Floor Transition Bug Reproduction', () => {
	test('should reproduce floor transition issues', async ({ page }) => {
		// Navigate to the game
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for game to load and take initial screenshot
		const gameCanvas = page.locator('canvas').first();
		await expect(gameCanvas).toBeVisible();
		await page.waitForTimeout(2000); // Wait for game to fully initialize

		// Take initial screenshot to document starting state
		await page.screenshot({ path: 'test-results/01-initial-state.png', fullPage: true });

		// Get initial game state
		const initialGameState = await page.evaluate(() => {
			const game = (window as any).game;
			const gameState = (window as any).gameState;
			return {
				currentFloor: game?.getCurrentFloor?.() || gameState?.currentFloor || 'unknown',
				playerPosition: game?.getPlayerPosition?.() || gameState?.playerPosition || 'unknown',
				availableFloors: game?.getAvailableFloors?.() || 'unknown',
			};
		});

		console.log('Initial game state:', initialGameState);

		// Verify we start on floor 0
		expect(initialGameState.currentFloor).toBe(0);

		// Move player to a known position to test fog persistence
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(500);

		// Take screenshot after movement
		await page.screenshot({ path: 'test-results/02-after-movement.png', fullPage: true });

		// Get position after movement
		const positionAfterMovement = await page.evaluate(() => {
			const game = (window as any).game;
			return game?.getPlayerPosition?.() || 'unknown';
		});

		console.log('Position after movement:', positionAfterMovement);

		// Now try to find and use an elevator console
		// First, let's check what floors are available
		const availableFloors = await page.evaluate(() => {
			const game = (window as any).game;
			return game?.getAvailableFloors?.() || [];
		});

		console.log('Available floors:', availableFloors);

		// If we have multiple floors, try to navigate to an elevator
		if (availableFloors.length > 1) {
			// Try to find elevator console by moving around and pressing space
			let elevatorFound = false;
			let attempts = 0;
			const maxAttempts = 20;

			while (!elevatorFound && attempts < maxAttempts) {
				// Move in a pattern to explore
				const directions = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
				const direction = directions[attempts % 4];
				await page.keyboard.press(direction);
				await page.waitForTimeout(300);

				// Try to interact with spacebar
				await page.keyboard.press('Space');
				await page.waitForTimeout(500);

				// Check if elevator modal appeared
				const elevatorModal = page.locator('[data-testid="elevator-console"]').or(
					page.locator('.modal').filter({ hasText: /floor|elevator/i }),
				);

				if (await elevatorModal.isVisible()) {
					elevatorFound = true;
					console.log('Elevator console found!');
					await page.screenshot({ path: 'test-results/03-elevator-found.png', fullPage: true });
					break;
				}

				attempts++;
			}

			if (elevatorFound) {
				// Try to select floor 1
				await page.keyboard.press('ArrowDown'); // Navigate to floor 1
				await page.waitForTimeout(500);
				await page.keyboard.press('Enter'); // Select floor 1
				await page.waitForTimeout(2000); // Wait for transition

				// Take screenshot after floor transition
				await page.screenshot({ path: 'test-results/04-after-floor-transition.png', fullPage: true });

				// Get game state after transition
				const afterTransitionState = await page.evaluate(() => {
					const game = (window as any).game;
					const gameState = (window as any).gameState;
					return {
						currentFloor: game?.getCurrentFloor?.() || gameState?.currentFloor || 'unknown',
						playerPosition: game?.getPlayerPosition?.() || gameState?.playerPosition || 'unknown',
					};
				});

				console.log('State after floor transition:', afterTransitionState);

				// Verify we're on floor 1
				expect(afterTransitionState.currentFloor).toBe(1);

				// Now go back to floor 0
				await page.keyboard.press('Space');
				await page.waitForTimeout(500);

				const backToFloor0Modal = page.locator('[data-testid="elevator-console"]').or(
					page.locator('.modal').filter({ hasText: /floor|elevator/i }),
				);

				if (await backToFloor0Modal.isVisible()) {
					await page.keyboard.press('ArrowUp'); // Navigate to floor 0
					await page.waitForTimeout(500);
					await page.keyboard.press('Enter'); // Select floor 0
					await page.waitForTimeout(2000); // Wait for transition

					// Take screenshot after returning to floor 0
					await page.screenshot({ path: 'test-results/05-back-to-floor-0.png', fullPage: true });

					// Get final game state
					const finalState = await page.evaluate(() => {
						const game = (window as any).game;
						const gameState = (window as any).gameState;
						return {
							currentFloor: game?.getCurrentFloor?.() || gameState?.currentFloor || 'unknown',
							playerPosition: game?.getPlayerPosition?.() || gameState?.playerPosition || 'unknown',
						};
					});

					console.log('Final state after returning to floor 0:', finalState);

					// Verify we're back on floor 0
					expect(finalState.currentFloor).toBe(0);

					// Check if player position was restored (this is the bug - it should be restored)
					if (positionAfterMovement !== 'unknown' && finalState.playerPosition !== 'unknown') {
						console.log('Player position comparison:');
						console.log('  Before transition:', positionAfterMovement);
						console.log('  After returning:', finalState.playerPosition);

						// The bug: player position should be restored to where they were before
						// Currently it's probably reset to (0,0) or elevator position
						expect(finalState.playerPosition).toEqual(positionAfterMovement);
					}
				}
			} else {
				console.log('No elevator console found during exploration');
				await page.screenshot({ path: 'test-results/03-no-elevator-found.png', fullPage: true });
			}
		} else {
			console.log('Only one floor available, cannot test floor transitions');
			await page.screenshot({ path: 'test-results/03-single-floor.png', fullPage: true });
		}

		// Additional debugging: Check elevator manager state
		const elevatorDebug = await page.evaluate(() => {
			const game = (window as any).game;
			if (game?.elevatorDebug?.testElevatorSpawn) {
				return {
					floor0Spawn: game.elevatorDebug.testElevatorSpawn(0),
					floor1Spawn: game.elevatorDebug.testElevatorSpawn(1),
				};
			}
			return 'elevatorDebug not available';
		});

		console.log('Elevator debug info:', elevatorDebug);
	});

	test('should verify floor 0 starting position issue', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const gameCanvas = page.locator('canvas').first();
		await expect(gameCanvas).toBeVisible();
		await page.waitForTimeout(2000);

		// Check if floor 0 has an elevator room at (0,0)
		const floor0Info = await page.evaluate(() => {
			const game = (window as any).game;
			if (game?.elevatorDebug?.logRooms) {
				game.elevatorDebug.logRooms();
			}

			// Get all rooms on floor 0
			const rooms = game?.rooms || [];
			const floor0Rooms = rooms.filter((r: any) => r.floor === 0);

			// Check if any room contains (0,0)
			const roomAtOrigin = floor0Rooms.find((r: any) =>
				r.startX <= 0 && r.endX >= 0 && r.startY <= 0 && r.endY >= 0
			);

			return {
				floor0Rooms: floor0Rooms.map((r: any) => ({
					id: r.id,
					name: r.name,
					startX: r.startX,
					endX: r.endX,
					startY: r.startY,
					endY: r.endY,
					containsOrigin: r.startX <= 0 && r.endX >= 0 && r.startY <= 0 && r.endY >= 0
				})),
				roomAtOrigin,
				playerPosition: game?.getPlayerPosition?.() || 'unknown'
			};
		});

		console.log('Floor 0 room analysis:', floor0Info);

		// The bug: Floor 0 should have a room at (0,0) for proper elevator positioning
		expect(floor0Info.roomAtOrigin).toBeTruthy();
		expect(floor0Info.roomAtOrigin.name).toMatch(/elevator/i);
	});
});
