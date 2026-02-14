export type MeResponse = {
    id: string;            // UUID
    cognitoSub: string;
    username: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: string;     // ISO-8601
    updatedAt: string;     // ISO-8601
  };

export type UpdateMeRequest = {
  displayName: string;
  bio: string | null;
};
  
