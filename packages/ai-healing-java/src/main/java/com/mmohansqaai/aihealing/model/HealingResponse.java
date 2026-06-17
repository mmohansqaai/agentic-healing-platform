package com.mmohansqaai.aihealing.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class HealingResponse {
  public String status;
  public String healedLocator;
  public Double confidence;
  public String strategy;
  public String reasoning;
  public List<HealingResponseCandidate> candidates;
  public String error;

  public boolean isHealed() {
    return "healed".equals(status);
  }
}
