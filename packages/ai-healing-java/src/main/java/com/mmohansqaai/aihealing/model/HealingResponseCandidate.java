package com.mmohansqaai.aihealing.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class HealingResponseCandidate {
  public GeneratedLocatorQuery query;
  public String healedLocator;
  public double confidence;
  public String strategy;
  public String reasoning;
  public int score;
}
