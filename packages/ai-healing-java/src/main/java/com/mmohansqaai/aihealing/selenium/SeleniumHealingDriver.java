package com.mmohansqaai.aihealing.selenium;

import com.mmohansqaai.aihealing.model.DomElementSnapshot;
import com.mmohansqaai.aihealing.model.GeneratedLocatorQuery;
import com.mmohansqaai.aihealing.model.HealingActionType;
import java.time.Duration;
import java.util.List;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SeleniumHealingDriver {
  private final WebDriver driver;
  private final Duration defaultTimeout;

  public SeleniumHealingDriver(WebDriver driver) {
    this(driver, Duration.ofSeconds(5));
  }

  public SeleniumHealingDriver(WebDriver driver, Duration defaultTimeout) {
    this.driver = driver;
    this.defaultTimeout = defaultTimeout;
  }

  public String framework() {
    return "selenium";
  }

  public String url() {
    return driver.getCurrentUrl();
  }

  public String title() {
    return driver.getTitle();
  }

  public List<DomElementSnapshot> captureDomSnapshot(HealingActionType actionType) {
    return DomSnapshotCapture.capture(driver, actionType);
  }

  public int count(GeneratedLocatorQuery query) {
    return driver.findElements(toBy(query)).size();
  }

  public void click(GeneratedLocatorQuery query, Duration timeout, boolean force) {
    WebElement element = waitForFirst(query, timeout);
    if (force) {
      ((JavascriptExecutor) driver).executeScript("arguments[0].click();", element);
      return;
    }
    element.click();
  }

  public void fill(GeneratedLocatorQuery query, String value, Duration timeout) {
    WebElement element = waitForFirst(query, timeout);
    element.clear();
    element.sendKeys(value);
  }

  public boolean isVisible(GeneratedLocatorQuery query, Duration timeout) {
    try {
      WebElement element = waitForFirst(query, timeout);
      return element.isDisplayed();
    } catch (RuntimeException ex) {
      return false;
    }
  }

  private WebElement waitForFirst(GeneratedLocatorQuery query, Duration timeout) {
    Duration effective = timeout != null ? timeout : defaultTimeout;
    By locator = toBy(query);
    WebDriverWait wait = new WebDriverWait(driver, effective);
    List<WebElement> elements = wait.until(ExpectedConditions.presenceOfAllElementsLocatedBy(locator));
    if (elements.isEmpty()) {
      throw new IllegalStateException("No elements found for query");
    }
    return elements.get(0);
  }

  private By toBy(GeneratedLocatorQuery query) {
    if ("css".equals(query.type)) {
      return By.cssSelector(query.value);
    }
    String role = query.role == null ? "" : query.role.replace("\"", "\\\"");
    String name = query.name == null ? "" : query.name.replace("'", "\\'");
    String xpath =
        "//*[@role=\"" + role + "\" and contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), translate('" + name + "', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]";
    return By.xpath(xpath);
  }
}
