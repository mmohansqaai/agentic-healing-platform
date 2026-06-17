package com.mmohansqaai.aihealing.selenium;

import java.time.Duration;

public final class HealingConfig {
  public boolean healingEnabled = true;
  public String healingServiceUrl;
  public String framework = "selenium";
  public Duration timeout = Duration.ofSeconds(8);
  public int maxCandidates = 8;
  public boolean verboseLogs = false;

  public static Builder builder() {
    return new Builder();
  }

  public static final class Builder {
    private final HealingConfig config = new HealingConfig();

    public Builder healingEnabled(boolean enabled) {
      config.healingEnabled = enabled;
      return this;
    }

    public Builder healingServiceUrl(String url) {
      config.healingServiceUrl = url;
      return this;
    }

    public Builder framework(String framework) {
      config.framework = framework;
      return this;
    }

    public Builder timeout(Duration timeout) {
      config.timeout = timeout;
      return this;
    }

    public Builder maxCandidates(int maxCandidates) {
      config.maxCandidates = maxCandidates;
      return this;
    }

    public HealingConfig build() {
      if (config.healingServiceUrl == null || config.healingServiceUrl.isBlank()) {
        String env = System.getenv("HEALING_SERVICE_URL");
        if (env != null && !env.isBlank()) {
          config.healingServiceUrl = env;
        }
      }
      return config;
    }
  }
}
