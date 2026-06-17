package com.mmohansqaai.aihealing.selenium;

import com.mmohansqaai.aihealing.model.DomElementSnapshot;
import com.mmohansqaai.aihealing.model.HealingActionType;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;

public final class DomSnapshotCapture {
  private static final int MAX = 80;

  private DomSnapshotCapture() {}

  public static List<DomElementSnapshot> capture(WebDriver driver, HealingActionType actionType) {
    String clickSelector =
        "button, [role=\"button\"], input[type=\"submit\"], input[type=\"button\"], a[href]:not([href=\"\"])";
    String fillSelector =
        "input:not([type=\"hidden\"]):not([type=\"submit\"]):not([type=\"button\"]):not([type=\"checkbox\"]):not([type=\"radio\"]), textarea, select";
    String visibleSelector = "h1, h2, h3, h4, [role=\"heading\"], [role=\"banner\"]";

    String selector = switch (actionType) {
      case click -> clickSelector;
      case fill -> fillSelector;
      case visible -> visibleSelector;
    };

    JavascriptExecutor js = (JavascriptExecutor) driver;
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> raw = (List<Map<String, Object>>) js.executeScript(
        """
        const sel = arguments[0];
        const limit = arguments[1];
        return Array.from(document.querySelectorAll(sel)).slice(0, limit).map((el) => {
          const tag = el.tagName.toLowerCase();
          const inputType = tag === 'input' ? (el.type || '').toLowerCase() : undefined;
          const text = (el.innerText || el.textContent || '').trim().slice(0, 140);
          const href = tag === 'a' ? el.href : undefined;
          const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || undefined;
          const role = el.getAttribute('role') || undefined;
          const id = el.getAttribute('id') || undefined;
          const name = el.getAttribute('name') || undefined;
          const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-test') || undefined;
          const placeholder = el.getAttribute('placeholder') || undefined;
          const disabled = el.disabled === true || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
          return { tag, inputType, id, name, testId, role, ariaLabel, placeholder, text, href, disabled };
        });
        """,
        selector,
        MAX
    );

    List<DomElementSnapshot> snapshots = new ArrayList<>();
    if (raw == null) return snapshots;

    for (Map<String, Object> item : raw) {
      DomElementSnapshot snap = new DomElementSnapshot();
      snap.tag = asString(item.get("tag"));
      snap.inputType = asString(item.get("inputType"));
      snap.id = asString(item.get("id"));
      snap.name = asString(item.get("name"));
      snap.testId = asString(item.get("testId"));
      snap.role = asString(item.get("role"));
      snap.ariaLabel = asString(item.get("ariaLabel"));
      snap.placeholder = asString(item.get("placeholder"));
      snap.text = asString(item.get("text"));
      snap.href = asString(item.get("href"));
      snap.disabled = Boolean.TRUE.equals(item.get("disabled"));
      snapshots.add(snap);
    }
    return snapshots;
  }

  private static String asString(Object value) {
    if (value == null) return null;
    String text = String.valueOf(value);
    return text.isBlank() ? null : text;
  }
}
