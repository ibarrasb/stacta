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
      case "INVALID_DISPLAY_NAME" -> HttpStatus.BAD_REQUEST;
      case "INVALID_FOLLOW_TARGET" -> HttpStatus.BAD_REQUEST;
      case "INVALID_CURSOR" -> HttpStatus.BAD_REQUEST;
      case "INVALID_FEED_TAB" -> HttpStatus.BAD_REQUEST;
      case "INVALID_FEED_FILTER" -> HttpStatus.BAD_REQUEST;
      case "INVALID_COLLECTION_ITEM" -> HttpStatus.BAD_REQUEST;
      case "TOP_FRAGRANCES_LIMIT_REACHED" -> HttpStatus.BAD_REQUEST;
      case "COLLECTION_ITEM_NOT_FOUND" -> HttpStatus.NOT_FOUND;
      case "NOT_ONBOARDED" -> HttpStatus.NOT_FOUND;
      case "USER_NOT_FOUND" -> HttpStatus.NOT_FOUND;
      case "FOLLOW_REQUEST_NOT_FOUND" -> HttpStatus.NOT_FOUND;
      default -> HttpStatus.BAD_REQUEST;
    };

    return ResponseEntity.status(status).body(Map.of("error", ex.getCode()));
  }
}
