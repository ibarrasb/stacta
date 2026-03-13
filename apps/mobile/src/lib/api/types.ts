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
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type UpdateMeRequest = {
  displayName: string;
  bio: string | null;
  avatarObjectKey?: string | null;
  isPrivate?: boolean;
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

export type FeedItem = {
  id: string;
  sourceReviewId: string;
  type: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  repostActorUsername: string | null;
  repostActorDisplayName: string | null;
  repostActorAvatarUrl: string | null;
  fragranceName: string | null;
  fragranceSource: string | null;
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
