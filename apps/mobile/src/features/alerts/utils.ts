import type { NotificationItem } from "../../lib/api/types";

export const DEFAULT_AVATAR_URI = "https://placehold.co/96x96/0b1220/f8fafc.png?text=S";

export function when(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function relativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo`;
  const year = Math.floor(day / 365);
  return `${year}y`;
}

export function messageFor(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") {
    return "issued you a moderation strike.";
  }
  if (item.type === "REVIEW_COMMENTED") {
    return `commented on your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  if (item.type === "REVIEW_COMMENT_REPLIED") {
    return `replied to your comment${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  if (item.type === "REVIEW_LIKED") {
    const count = Math.max(1, item.aggregateCount ?? 1);
    if (count <= 1) {
      return `liked your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
    }
    return `and ${count - 1} other${count - 1 === 1 ? "" : "s"} liked your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  return item.followedBack ? "followed you back." : "followed you.";
}

export function metaFor(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") return "Moderation";
  if (item.type === "REVIEW_COMMENTED") return "Comment";
  if (item.type === "REVIEW_COMMENT_REPLIED") return "Reply";
  if (item.type === "REVIEW_LIKED") return "Like";
  if (item.type === "REVIEW_REPOSTED") return "Repost";
  return "Follow";
}

export function iconNameFor(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") return "shield-outline";
  if (item.type === "REVIEW_COMMENTED" || item.type === "REVIEW_COMMENT_REPLIED") return "chatbubble-ellipses-outline";
  if (item.type === "REVIEW_REPOSTED") return "repeat-outline";
  if (item.type === "REVIEW_LIKED") return "heart-outline";
  return "person-add-outline";
}

export function dayBucket(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfDate) / 86400000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return "This week";
  return "Earlier";
}
