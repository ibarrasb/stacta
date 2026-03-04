package com.stacta.api.upload;

import com.stacta.api.config.ApiException;
import com.stacta.api.config.aws.AwsProperties;
import com.stacta.api.upload.dto.PresignUploadRequest;
import com.stacta.api.upload.dto.PresignUploadResponse;
import com.stacta.api.upload.dto.UploadedImageResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.io.IOException;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class PresignedUploadService {
  private static final long MAX_UPLOAD_BYTES = 5L * 1024L * 1024L;
  private static final long EXPIRES_IN_SECONDS = 600L;

  private static final Map<String, String> CONTENT_TYPE_TO_EXT = Map.of(
    "image/jpeg", "jpg",
    "image/jpg", "jpg",
    "image/png", "png",
    "image/webp", "webp",
    "image/heic", "heic",
    "image/heif", "heif",
    "image/heic-sequence", "heic",
    "image/heif-sequence", "heif"
  );

  private final S3Presigner presigner;
  private final S3Client s3;
  private final AwsProperties aws;
  private final UserRepository users;
  private final UploadImageUrlResolver imageUrlResolver;

  public PresignedUploadService(
    S3Presigner presigner,
    S3Client s3,
    AwsProperties aws,
    UserRepository users,
    UploadImageUrlResolver imageUrlResolver
  ) {
    this.presigner = presigner;
    this.s3 = s3;
    this.aws = aws;
    this.users = users;
    this.imageUrlResolver = imageUrlResolver;
  }

  public PresignUploadResponse createFragranceUploadUrl(String viewerSub, PresignUploadRequest req) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String contentType = normalizeContentType(req.contentType());
    long contentLength = req.contentLength() == null ? 0L : req.contentLength();
    if (contentLength <= 0L || contentLength > MAX_UPLOAD_BYTES) {
      throw new ApiException("UPLOAD_FILE_TOO_LARGE");
    }

    String ext = CONTENT_TYPE_TO_EXT.get(contentType);
    if (ext == null) {
      throw new ApiException("UPLOAD_UNSUPPORTED_CONTENT_TYPE");
    }

    String objectKey = buildObjectKey(me.getId(), ext, req.uploadKind());

    PutObjectRequest putObject = PutObjectRequest.builder()
      .bucket(aws.s3().bucket())
      .key(objectKey)
      .contentType(contentType)
      .build();

    PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
      .signatureDuration(Duration.ofSeconds(EXPIRES_IN_SECONDS))
      .putObjectRequest(putObject)
      .build();

    String uploadUrl = presigner.presignPutObject(presignRequest).url().toString();
    String publicUrl = imageUrlResolver.resolveFromObjectKey(objectKey);
    return new PresignUploadResponse(uploadUrl, objectKey, publicUrl, EXPIRES_IN_SECONDS);
  }

  public UploadedImageResponse uploadImage(String viewerSub, MultipartFile file, String uploadKindRaw) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    if (file == null || file.isEmpty()) {
      throw new ApiException("UPLOAD_FILE_EMPTY");
    }
    long contentLength = file.getSize();
    if (contentLength <= 0L || contentLength > MAX_UPLOAD_BYTES) {
      throw new ApiException("UPLOAD_FILE_TOO_LARGE");
    }

    String contentType = normalizeContentType(file.getContentType(), file.getOriginalFilename());
    String ext = CONTENT_TYPE_TO_EXT.get(contentType);
    if (ext == null) {
      throw new ApiException("UPLOAD_UNSUPPORTED_CONTENT_TYPE");
    }

    String objectKey = buildObjectKey(me.getId(), ext, uploadKindRaw);
    PutObjectRequest putObject = PutObjectRequest.builder()
      .bucket(aws.s3().bucket())
      .key(objectKey)
      .contentType(contentType)
      .build();
    try {
      s3.putObject(putObject, RequestBody.fromBytes(file.getBytes()));
    } catch (IOException e) {
      throw new ApiException("UPLOAD_FAILED");
    }

    String publicUrl = imageUrlResolver.resolveFromObjectKey(objectKey);
    return new UploadedImageResponse(objectKey, publicUrl);
  }

  private String normalizeContentType(String raw) {
    return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeContentType(String raw, String filename) {
    String contentType = normalizeContentType(raw);
    if (!contentType.isBlank()) return contentType;

    String name = filename == null ? "" : filename.trim().toLowerCase(Locale.ROOT);
    if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".jpe")) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".heic")) return "image/heic";
    if (name.endsWith(".heif")) return "image/heif";
    return "";
  }

  private String buildObjectKey(UUID userId, String ext, String uploadKindRaw) {
    String uploadKind = uploadKindRaw == null ? "FRAGRANCE" : uploadKindRaw.trim().toUpperCase(Locale.ROOT);
    String folder = switch (uploadKind) {
      case "PROFILE" -> "profile";
      default -> "fragrances";
    };
    return "users/" + userId + "/" + folder + "/" + UUID.randomUUID() + "." + ext;
  }

}
