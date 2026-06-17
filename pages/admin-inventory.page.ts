import type { Page } from '@playwright/test';
import { clickHealing, expectVisibleHealing, fillHealing } from '../core/self-healing';
import type { HealingResult, LocatorStrategy } from '../core/healing-types';

const adminPath = '/app/admin';

/**
 * Admin → Operations → catalog table: per-row stock inputs and **Save**.
 */
export class AdminInventoryPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(adminPath);
  }

  private loadedStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'heading-Operations',
        resolve: (p) => p.getByRole('heading', { name: /operations/i }),
      },
      {
        name: 'text-Role-restricted',
        resolve: (p) => p.getByText(/role-restricted admin tools/i).first(),
      },
      {
        name: 'eyebrow-Admin',
        resolve: (p) => p.getByText(/^Admin$/).first(),
      },
    ];
  }

  async expectLoaded(): Promise<HealingResult<void>> {
    return expectVisibleHealing(this.page, this.loadedStrategies(), {
      timeoutPerStrategyMs: 15_000,
    });
  }

  /** When the remote DB has no rows, submit the built-in “Add product” form once so stock edits have targets. */
  async seedOneProductIfCatalogEmpty(): Promise<void> {
    const rows = this.page.locator('.rw-table-admin .rw-table-row');
    if ((await rows.count()) > 0) return;

    const suffix = Date.now();
    const nameStrategies: LocatorStrategy[] = [
      { name: 'label-Name', resolve: (p) => p.getByRole('textbox', { name: /^name$/i }) },
      { name: 'placeholder-product-name', resolve: (p) => p.getByPlaceholder(/linen shirt/i) },
    ];
    await fillHealing(this.page, nameStrategies, `Automation seed ${suffix}`, {
      timeoutPerStrategyMs: 10_000,
    });

    const addStrategies: LocatorStrategy[] = [
      {
        name: 'role-Add-to-catalog',
        resolve: (p) => p.getByRole('button', { name: /add to catalog/i }),
      },
      {
        name: 'rw-btn-primary-add',
        resolve: (p) =>
          p.locator('button.rw-btn-primary').filter({ hasText: /add to catalog/i }),
      },
    ];
    await clickHealing(this.page, addStrategies, { timeoutPerStrategyMs: 15_000 });

    await this.page.waitForFunction(
      () => document.querySelectorAll('.rw-table-admin .rw-table-row').length > 0,
      null,
      { timeout: 30_000 }
    );
  }

  private stockInputStrategies(rowIndex: number): LocatorStrategy[] {
    return [
      {
        name: 'aria-label-Stock-for',
        resolve: (p) =>
          p.locator('.rw-table-admin .rw-table-row').nth(rowIndex).getByLabel(/stock for/i),
      },
      {
        name: 'first-number-input-in-row',
        resolve: (p) =>
          p.locator('.rw-table-admin .rw-table-row').nth(rowIndex).locator('input[type="number"]').first(),
      },
    ];
  }

  private saveRowStrategies(rowIndex: number): LocatorStrategy[] {
    return [
      {
        name: 'role-button-Save',
        resolve: (p) =>
          p
            .locator('.rw-table-admin .rw-table-row')
            .nth(rowIndex)
            .getByRole('button', { name: /^save$/i }),
      },
      {
        name: 'primary-button-Save',
        resolve: (p) =>
          p
            .locator('.rw-table-admin .rw-table-row')
            .nth(rowIndex)
            .locator('button.rw-btn-primary')
            .filter({ hasText: /save/i }),
      },
    ];
  }

  /**
   * For each product row in the admin catalog table, set stock to **current + delta** and click **Save**.
   * Returns healing results per row (save click) and the number of rows processed.
   */
  async increaseEachProductStockBy(delta: number): Promise<{
    rowCount: number;
    stockFills: HealingResult<void>[];
    saveClicks: HealingResult<void>[];
  }> {
    const rows = this.page.locator('.rw-table-admin .rw-table-row');
    const rowCount = await rows.count();
    const stockFills: HealingResult<void>[] = [];
    const saveClicks: HealingResult<void>[] = [];

    for (let i = 0; i < rowCount; i++) {
      const cur = await this.page
        .locator('.rw-table-admin .rw-table-row')
        .nth(i)
        .locator('input[type="number"]')
        .first()
        .inputValue();
      const next = String(Math.max(0, Math.floor(Number(cur)) + delta));

      const filled = await fillHealing(this.page, this.stockInputStrategies(i), next, {
        timeoutPerStrategyMs: 10_000,
      });
      stockFills.push(filled);

      const saved = await clickHealing(this.page, this.saveRowStrategies(i), {
        timeoutPerStrategyMs: 15_000,
      });
      saveClicks.push(saved);

      await this.page
        .locator('.rw-table-admin .rw-table-row')
        .nth(i)
        .getByRole('button', { name: /^save$/i })
        .waitFor({ state: 'visible' });
    }

    return { rowCount, stockFills, saveClicks };
  }
}
