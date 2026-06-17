package com.mmohansqaai.aihealing.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DomElementSnapshot {
  public String tag;
  public String inputType;
  public String id;
  public String name;
  public String testId;
  public String role;
  public String ariaLabel;
  public String placeholder;
  public String text;
  public String href;
  public boolean disabled;
}
