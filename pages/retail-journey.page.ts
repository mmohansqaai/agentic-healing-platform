import type { Page } from '@playwright/test';
import { clickHealing, expectVisibleHealing } from '../core/self-healing';
import type { HealingResult, LocatorStrategy } from '../core/healing-types';
import { LoginPage } from './login.page';

/**
 * Login → products → add to cart → cart → checkout → pay.
 * Locators use multiple strategies to survive minor UI / copy changes (and optional “testing mode” quirks).
 */
export class RetailJourneyPage {
  readonly login: LoginPage;

  constructor(readonly page: Page) {
    this.login = new LoginPage(page);
  }

  private productsHeadingStrategies(): LocatorStrategy[] {
    return [
      { name: 'heading-Products', resolve: (p) => p.getByRole('heading', { name: /^(Products|Catalog)$/ }) },
      { name: 'eyebrow-Storefront', resolve: (p) => p.getByText('Storefront').first() },
      { name: 'placeholder-search', resolve: (p) => p.getByPlaceholder(/search products/i) },
    ];
  }

  private addToCartStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'role-button-Add-to-cart',
        resolve: (p) => p.getByRole('button', { name: /add to cart/i }).first(),
      },
      {
        name: 'role-button-Add-item',
        resolve: (p) => p.getByRole('button', { name: /add item/i }).first(),
      },
      {
        name: 'card-primary-button',
        resolve: (p) => p.locator('.rw-card-actions .rw-btn-primary').first(),
      },
    ];
  }

  private cartCheckoutStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'role-button-Checkout',
        resolve: (p) => p.getByRole('button', { name: /^checkout$/i }),
      },
      {
        name: 'primary-checkout',
        resolve: (p) => p.locator('.rw-row .rw-btn-primary').filter({ hasText: /checkout/i }).first(),
      },
    ];
  }

  private payOrderStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'id-place-order',
        resolve: (p) => p.locator('#place-order'),
      },
      {
        name: 'role-button-Pay',
        resolve: (p) => p.getByRole('button', { name: /pay\s*\$/i }),
      },
      {
        name: 'form-submit-primary',
        resolve: (p) => p.locator('form.rw-form .rw-btn-primary').first(),
      },
    ];
  }

  private orderConfirmedStrategies(): LocatorStrategy[] {
    return [
      {
        name: 'text-confirmed',
        resolve: (p) => p.getByText(/confirmed/i).first(),
      },
      {
        name: 'rw-success',
        resolve: (p) => p.locator('.rw-success').first(),
      },
    ];
  }

  async expectProductsReady(): Promise<HealingResult<void>> {
    return expectVisibleHealing(this.page, this.productsHeadingStrategies(), {
      timeoutPerStrategyMs: 15_000,
    });
  }

  async addFirstProductToCart(): Promise<HealingResult<void>> {
    return clickHealing(this.page, this.addToCartStrategies(), { timeoutPerStrategyMs: 15_000 });
  }

  async gotoCart(): Promise<void> {
    await this.page.goto('/app/cart');
  }

  async clickCheckoutFromCart(): Promise<HealingResult<void>> {
    return clickHealing(this.page, this.cartCheckoutStrategies(), { timeoutPerStrategyMs: 15_000 });
  }

  async gotoCheckout(): Promise<void> {
    await this.page.goto('/app/checkout');
  }

  async placeOrder(): Promise<HealingResult<void>> {
    return clickHealing(this.page, this.payOrderStrategies(), { timeoutPerStrategyMs: 30_000 });
  }

  async expectOrderConfirmed(): Promise<HealingResult<void>> {
    return expectVisibleHealing(this.page, this.orderConfirmedStrategies(), {
      timeoutPerStrategyMs: 30_000,
    });
  }

  /** Full path (caller must already be logged in as a customer): products → add line → cart → checkout → pay → confirmation. */
  async completeCheckoutAfterLogin(): Promise<{
    products: HealingResult<void>;
    addToCart: HealingResult<void>;
    checkout: HealingResult<void>;
    pay: HealingResult<void>;
    confirmed: HealingResult<void>;
  }> {
    await this.page.goto('/app/products');
    const products = await this.expectProductsReady();
    const addToCart = await this.addFirstProductToCart();
    await this.gotoCart();
    const checkout = await this.clickCheckoutFromCart();
    await this.page.waitForURL(/\/app\/checkout/, { timeout: 20_000 });
    const pay = await this.placeOrder();
    const confirmed = await this.expectOrderConfirmed();
    return { products, addToCart, checkout, pay, confirmed };
  }
}
