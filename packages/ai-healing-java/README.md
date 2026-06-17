# ai-healing-java

Java client for agentic test healing — calls `healing-service` `POST /heal` and provides Selenium `Healable` wrappers.

No Node.js runtime required in your Java test project.

## Maven

```xml
<dependency>
  <groupId>com.mmohansqaai</groupId>
  <artifactId>ai-healing-java</artifactId>
  <version>0.1.0</version>
</dependency>
```

Also add `selenium-java` in your test project.

## HTTP client only

```java
import com.mmohansqaai.aihealing.client.HealingServiceClient;
import com.mmohansqaai.aihealing.model.*;

HealingServiceClient client = new HealingServiceClient("http://localhost:3921");

HealingRequest request = new HealingRequest();
request.framework = "selenium";
request.action = HealingActionType.CLICK;
request.failedLocator = "#login";
request.error = "not found";
request.url = "https://example.com/login";

HealingResponse response = client.heal(request);
```

## Selenium wrappers

```java
import com.mmohansqaai.aihealing.selenium.*;

HealingContext.enable(driver, HealingConfig.builder()
    .healingServiceUrl("http://localhost:3921")
    .build());

driver.get("https://example.com");
HealingResult<Void> result = Healable.click("#login");
Healable.fill("input[name='email']", "user@demo.com");
Healable.expectVisible("h1");
```

## Build locally

```bash
mvn -f packages/ai-healing-java/pom.xml package
```
