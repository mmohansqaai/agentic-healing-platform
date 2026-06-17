package com.mmohansqaai.aihealing.selenium;

import org.openqa.selenium.WebDriver;

public final class HealingContext {
  private static WebDriver driver;
  private static HealingConfig config = HealingConfig.builder().build();

  private HealingContext() {}

  public static HealingConfig enable(WebDriver webDriver, HealingConfig healingConfig) {
    driver = webDriver;
    config = healingConfig == null ? HealingConfig.builder().build() : healingConfig;
    return config;
  }

  public static WebDriver requireDriver() {
    if (driver == null) {
      throw new IllegalStateException("No WebDriver registered. Call HealingContext.enable(driver, config) first.");
    }
    return driver;
  }

  public static HealingConfig config() {
    return config;
  }
}
