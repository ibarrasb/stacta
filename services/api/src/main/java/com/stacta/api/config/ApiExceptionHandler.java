package com.stacta.api.config;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<?> handleApi(ApiException ex) {
    HttpStatus status = switch (ex.getCode()) {
      case "USERNAME_TAKEN" -> HttpStatus.CONFLICT;        // 409
      case "INVALID_USERNAME" -> HttpStatus.BAD_REQUEST;   // 400
      default -> HttpStatus.BAD_REQUEST;
    };

    return ResponseEntity.status(status).body(Map.of("error", ex.getCode()));
  }
}
