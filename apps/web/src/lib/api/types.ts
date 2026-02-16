export type MeResponse = {
    id: string;            // UUID
    cognitoSub: string;
    username: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    createdAt: string;     // ISO-8601
    updatedAt: string;     // ISO-8601
  };

export type UpdateMeRequest = {
  displayName: string;
  bio: string | null;
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
  bio: string | null;
  isPrivate: boolean;
  isOwner: boolean;
  isVisible: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followRequested: boolean;
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
  type: "FOLLOWED_YOU" | "FOLLOWED_YOU_BACK";
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  createdAt: string;
  followedBack: boolean;
};

export type NotificationsPage = {
  items: NotificationItem[];
  nextCursor: string | null;
};
  
