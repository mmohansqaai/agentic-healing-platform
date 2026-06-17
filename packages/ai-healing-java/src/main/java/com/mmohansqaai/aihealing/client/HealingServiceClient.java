package com.mmohansqaai.aihealing.client;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mmohansqaai.aihealing.model.HealingRequest;
import com.mmohansqaai.aihealing.model.HealingResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class HealingServiceClient {
  private final String baseUrl;
  private final Duration timeout;
  private final HttpClient httpClient;
  private final ObjectMapper mapper;

  public HealingServiceClient(String baseUrl) {
    this(baseUrl, Duration.ofSeconds(8));
  }

  public HealingServiceClient(String baseUrl, Duration timeout) {
    this.baseUrl = baseUrl == null ? "" : baseUrl.replaceAll("/+$", "");
    this.timeout = timeout;
    this.httpClient = HttpClient.newBuilder().connectTimeout(timeout).build();
    this.mapper = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  public HealingResponse heal(HealingRequest request) throws IOException, InterruptedException {
    String body = mapper.writeValueAsString(request);
    HttpRequest httpRequest = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/heal"))
        .timeout(timeout)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();

    HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
    HealingResponse payload = mapper.readValue(response.body(), HealingResponse.class);

    if (response.statusCode() >= 400) {
      HealingResponse error = new HealingResponse();
      error.status = "error";
      error.error = payload.error != null
          ? payload.error
          : "healing-service responded with " + response.statusCode();
      return error;
    }
    return payload;
  }
}
