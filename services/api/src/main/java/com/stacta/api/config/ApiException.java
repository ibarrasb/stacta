package com.stacta.api.config;

public class ApiException extends RuntimeException {
  private final String code;

  public ApiException(String code) {
    super(code);
    this.code = code;
  }

  public String getCode() {
    return code;
  }
}
