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
