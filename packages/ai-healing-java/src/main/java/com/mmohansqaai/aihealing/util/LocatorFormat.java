package com.mmohansqaai.aihealing.util;

import com.mmohansqaai.aihealing.model.GeneratedLocatorQuery;

public final class LocatorFormat {
  private LocatorFormat() {}

  public static String format(GeneratedLocatorQuery query) {
    if (query == null) return "unknown";
    if ("css".equals(query.type)) return query.value;
    return "role=" + query.role + "[name=\"" + query.name + "\"]";
  }

  public static GeneratedLocatorQuery normalize(Object input) {
    if (input instanceof GeneratedLocatorQuery query) {
      return query;
    }
    if (input instanceof String css) {
      return GeneratedLocatorQuery.css(css);
    }
    throw new IllegalArgumentException("Expected CSS string or GeneratedLocatorQuery");
  }
}
