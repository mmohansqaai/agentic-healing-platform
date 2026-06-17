import { test as base } from '@playwright/test';
import { AdminInventoryPage } from '../../pages/admin-inventory.page';
import { LoginPage } from '../../pages/login.page';
import { RetailJourneyPage } from '../../pages/retail-journey.page';

type Fixtures = {
  loginPage: LoginPage;
  retailJourney: RetailJourneyPage;
  adminInventory: AdminInventoryPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  retailJourney: async ({ page }, use) => {
    await use(new RetailJourneyPage(page));
  },
  adminInventory: async ({ page }, use) => {
    await use(new AdminInventoryPage(page));
  },
});

export { expect } from '@playwright/test';
