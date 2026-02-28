export type CollectionItem = {
  source: string;
  externalId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  collectionTag: string | null;
  userRating: number | null;
  addedAt: string;
};

export type MeResponse = {
    id: string;            // UUID
    cognitoSub: string;
    username: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    avatarObjectKey: string | null;
    isVerified: boolean;
    isAdmin: boolean;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    creatorRatingAverage: number;
    creatorRatingCount: number;
    collectionCount: number;
    wishlistCount: number;
    reviewCount: number;
    communityFragranceCount: number;
    collectionItems: CollectionItem[];
    wishlistItems: CollectionItem[];
    topFragrances: CollectionItem[];
    communityFragrances: CollectionItem[];
    createdAt: string;     // ISO-8601
    updatedAt: string;     // ISO-8601
  };

export type UpdateMeRequest = {
  displayName: string;
  bio: string | null;
  avatarObjectKey?: string | null;
  isPrivate?: boolean;
};

export type UserSearchItem = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

export type UserProfileResponse = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarObjectKey: string | null;
  bio: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  isVisible: boolean;
  followersCount: number;
  followingCount: number;
  creatorRatingAverage: number;
  creatorRatingCount: number;
  viewerCreatorRating: number | null;
  collectionCount: number;
  wishlistCount: number;
  reviewCount: number;
  communityFragranceCount: number;
  collectionItems: CollectionItem[];
  wishlistItems: CollectionItem[];
  topFragrances: CollectionItem[];
  communityFragrances: CollectionItem[];
  followsYou: boolean;
  isFollowing: boolean;
  followRequested: boolean;
};

export type CreatorRatingSummary = {
  average: number;
  count: number;
  userRating: number | null;
};

export type FollowActionResponse = {
  status: "PENDING" | "ACCEPTED";
};

export type PendingFollowRequestItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  requestedAt: string;
};

export type PendingFollowRequestsPage = {
  items: PendingFollowRequestItem[];
  nextCursor: string | null;
};

export type FollowConnectionItem = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  followedAt: string;
};

export type FollowConnectionsPage = {
  items: FollowConnectionItem[];
  nextCursor: string | null;
};

export type NotificationItem = {
  id: string;
  type:
    | "FOLLOWED_YOU"
    | "FOLLOWED_YOU_BACK"
    | "MODERATION_STRIKE"
    | "REVIEW_LIKED"
    | "REVIEW_COMMENTED"
    | "REVIEW_COMMENT_REPLIED"
    | string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  createdAt: string;
  followedBack: boolean;
  sourceReviewId: string | null;
  sourceCommentId: string | null;
  aggregateCount: number | null;
  reviewFragranceName: string | null;
  reviewFragranceSource: string | null;
  reviewFragranceExternalId: string | null;
};

export type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export type NoteReportItem = {
  id: string;
  noteId: string;
  noteName: string;
  noteUsageCount: number;
  reportedByUsername: string | null;
  reportedByDisplayName: string | null;
  reason: "SPAM" | "INAPPROPRIATE" | "DUPLICATE" | "OTHER" | string;
  details: string | null;
  status: "OPEN" | "RESOLVED_DISMISSED" | "RESOLVED_MERGED" | string;
  mergedIntoNoteId: string | null;
  mergedIntoNoteName: string | null;
  resolutionNote: string | null;
  resolvedByUsername: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type NoteReportListResponse = {
  items: NoteReportItem[];
};

export type NoteReportOffender = {
  userId: string;
  username: string | null;
  displayName: string | null;
  fragranceCount: number;
  strikeCount: number;
};

export type FragranceReportItem = {
  id: string;
  fragranceId: string;
  fragranceExternalId: string;
  fragranceName: string;
  fragranceBrand: string;
  creatorUsername: string | null;
  creatorUserId: string | null;
  reportedByUsername: string | null;
  reportedByDisplayName: string | null;
  reason: "SPAM" | "INAPPROPRIATE" | "OTHER" | string;
  details: string | null;
  status: "OPEN" | "RESOLVED_DISMISSED" | "RESOLVED_DELETED" | string;
  resolutionNote: string | null;
  resolvedByUsername: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type FragranceReportListResponse = {
  items: FragranceReportItem[];
};

export type FeedItem = {
  id: string;
  sourceReviewId: string;
  type: "USER_FOLLOWED_USER" | "REVIEW_POSTED" | "COLLECTION_ITEM_ADDED" | "WISHLIST_ITEM_ADDED" | "REVIEW_REPOSTED";
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  repostActorUsername: string | null;
  repostActorDisplayName: string | null;
  repostActorAvatarUrl: string | null;
  targetUsername: string | null;
  targetDisplayName: string | null;
  fragranceName: string | null;
  fragranceSource: "FRAGELLA" | "COMMUNITY" | string | null;
  fragranceExternalId: string | null;
  fragranceImageUrl: string | null;
  collectionTag: string | null;
  reviewRating: number | null;
  reviewExcerpt: string | null;
  reviewPerformance: string | null;
  reviewSeason: string | null;
  reviewOccasion: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  viewerHasLiked: boolean;
  viewerHasReposted: boolean;
  createdAt: string;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
};

export type ReviewCommentItem = {
  id: string;
  reviewId: string;
  parentCommentId: string | null;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  viewerCanDelete: boolean;
};

export type ReviewThreadResponse = {
  review: FeedItem;
  comments: ReviewCommentItem[];
};
  
