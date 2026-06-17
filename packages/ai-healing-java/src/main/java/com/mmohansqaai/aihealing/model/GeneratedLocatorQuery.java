package com.mmohansqaai.aihealing.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class GeneratedLocatorQuery {
  public String type;
  public String value;
  public String role;
  public String name;

  public static GeneratedLocatorQuery css(String value) {
    GeneratedLocatorQuery query = new GeneratedLocatorQuery();
    query.type = "css";
    query.value = value;
    return query;
  }

  public static GeneratedLocatorQuery role(String role, String name) {
    GeneratedLocatorQuery query = new GeneratedLocatorQuery();
    query.type = "role";
    query.role = role;
    query.name = name;
    return query;
  }
}
