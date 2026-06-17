package com.mmohansqaai.aihealing.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class HealingRequest {
  public String framework;
  public HealingActionType action;
  public String failedLocator;
  public String error;
  public String url;
  public String pageTitle;
  public String screenshotPath;
  public List<DomElementSnapshot> domSnapshot;
  public String failureHints;
  public Map<String, Object> metadata;
}
