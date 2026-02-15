export type MeResponse = {
    id: string;            // UUID
    cognitoSub: string;
    username: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
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
};
  
