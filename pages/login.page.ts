import type { Page } from '@playwright/test';
import { clickHealing, expectVisibleHealing, fillHealing } from '../core/self-healing';
import type { HealingResult, LocatorStrategy } from '../core/healing-types';

const loginPath = '/login';

export class LoginPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(loginPath);
  }

  private emailStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'getByLabel-Email',
        resolve: (p) => p.getByLabel(/email/i),
        source: { filePath: 'pages/login.page.ts', methodName: 'emailStrategies', actionKey: 'login-email' },
      },
      {
        name: 'placeholder-email',
        resolve: (p) => p.locator('input[type="email"], input[name*="email" i], input[id*="email" i]').first(),
        source: { filePath: 'pages/login.page.ts', methodName: 'emailStrategies', actionKey: 'login-email' },
      },
      {
        name: 'role-textbox-first',
        resolve: (p) => p.getByRole('textbox').first(),
        source: { filePath: 'pages/login.page.ts', methodName: 'emailStrategies', actionKey: 'login-email' },
      },
    ];
  }

  private passwordStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'getByLabel-Password',
        resolve: (p) => p.getByLabel(/password/i),
        source: { filePath: 'pages/login.page.ts', methodName: 'passwordStrategies', actionKey: 'login-password' },
      },
      {
        name: 'input-password',
        resolve: (p) => p.locator('input[type="password"]').first(),
        source: { filePath: 'pages/login.page.ts', methodName: 'passwordStrategies', actionKey: 'login-password' },
      },
    ];
  }

  private submitStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'role-button-Sign-in',
        resolve: (p) => p.getByRole('button', { name: /sign in/i }),
        source: { filePath: 'pages/login.page.ts', methodName: 'submitStrategies', actionKey: 'login-submit' },
      },
      {
        name: 'submit-type',
        resolve: (p) => p.locator('button[type="submit"], input[type="submit"]').first(),
        source: { filePath: 'pages/login.page.ts', methodName: 'submitStrategies', actionKey: 'login-submit' },
      },
      {
        name: 'text-Sign-in',
        resolve: (p) => p.getByText(/^sign in$/i).first(),
        source: { filePath: 'pages/login.page.ts', methodName: 'submitStrategies', actionKey: 'login-submit' },
      },
    ];
  }

  private headingStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'heading-sign-in-workspace',
        resolve: (p) => p.getByRole('heading', { name: /sign in to your workspace/i }),
      },
      {
        name: 'text-sign-in-workspace',
        resolve: (p) => p.getByText(/sign in to your workspace/i).first(),
      },
      {
        name: 'text-Nova-Retail',
        resolve: (p) => p.getByText('Nova Retail').first(),
      },
    ];
  }

  async expectLoaded(): Promise<HealingResult<void>> {
    return expectVisibleHealing(this.page, this.headingStrategies());
  }

  async fillEmail(value: string): Promise<HealingResult<void>> {
    return fillHealing(this.page, this.emailStrategies(), value);
  }

  async fillPassword(value: string): Promise<HealingResult<void>> {
    return fillHealing(this.page, this.passwordStrategies(), value);
  }

  async submit(): Promise<HealingResult<void>> {
    return clickHealing(this.page, this.submitStrategies());
  }

  async loginAsCustomer(): Promise<{
    email: HealingResult<void>;
    password: HealingResult<void>;
    submit: HealingResult<void>;
  }> {
    const email = await this.fillEmail('test@demo.com');
    const password = await this.fillPassword('password123');
    const submit = await this.submit();
    return { email, password, submit };
  }

  /** Demo admin from the login page hint: admin@demo.com / admin123 */
  async loginAsAdmin(): Promise<{
    email: HealingResult<void>;
    password: HealingResult<void>;
    submit: HealingResult<void>;
  }> {
    const email = await this.fillEmail('admin@demo.com');
    const password = await this.fillPassword('admin123');
    const submit = await this.submit();
    return { email, password, submit };
  }
}
