package com.stacta.api.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  @GetMapping({"/health", "/api/v1/ping"})
  public String ping() {
    return "stacta-api ok";
  }
}
