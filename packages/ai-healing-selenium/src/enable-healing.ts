import type { WebDriver } from 'selenium-webdriver';
import type { SeleniumHealingConfig } from './config';
import { setSeleniumHealingConfig } from './config';

/** Register WebDriver and enable healing behavior for Selenium wrappers. */
export function enableHealing(
  driver: WebDriver,
  config?: Partial<Omit<SeleniumHealingConfig, 'driver'>>
): SeleniumHealingConfig {
  return setSeleniumHealingConfig({ ...config, driver });
}
