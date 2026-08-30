/** 与后端 schema 对应的领域类型。 */

export interface Opportunity {
  id: number;
  type: "team" | "gig" | "event" | "job";
  type_name: string;
  title: string;
  description: string;
  location: string;
  tags: string[];
  capacity: number | null;
  apply_deadline: string | null;
  status: "draft" | "in_review" | "published" | "open" | "active" | "closed" | "archived";
  review_note: string;
  promoted: number;
  views: number;
  ai_summary: string;
  ai_summary_at: string | null;
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
  author: AuthorBrief;
  application_count: number;
  publisher_card?: CardSnapshot | null;
}

export interface AuthorBrief {
  id: number;
  handle: string;
  display_name: string;
  avatar_emoji: string;
}

export interface Application {
  id: number;
  status: "pending" | "accepted" | "rejected";
  message: string;
  created_at: string;
  decided_at: string | null;
  applicant: AuthorBrief;
  card_snapshot: CardSnapshot | null;
}

export interface CardSnapshot {
  user: {
    id: number;
    handle: string;
    display_name: string;
    avatar_emoji: string;
    bio: string;
    github_login: string | null;
    level: number;
  };
  identity: {
    name: string;
    headline: string;
    bio: string;
    skills: string[];
    ai_profile: string;
    ai_profile_tags: string[];
  };
  links: { id?: number; platform: string; url: string; verified: boolean; verify_data: Record<string, unknown> }[];
}

export interface IdentityView {
  user: CardSnapshot["user"];
  identity: CardSnapshot["identity"] & { contact?: Record<string, string>; card_raw?: unknown };
  links: CardSnapshot["links"];
}

export interface CoffeeChat {
  id: number;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  message: string;
  agenda_ai: string;
  meeting_notes: string;
  summary_ai: string;
  created_at: string;
  completed_at: string | null;
  requester_id: number;
  invitee_id: number;
  requester: AuthorBrief;
  invitee: AuthorBrief;
  feedbacks?: { reviewer_id: number; reviewee_id: number; rating: number; comment: string }[];
  my_feedback_given?: boolean;
}

export interface ForumThread {
  id: number;
  title: string;
  tag: string;
  content?: string;
  pinned: boolean;
  locked: boolean;
  view_count: number;
  like_count: number;
  reply_count: number;
  ai_summary?: string;
  created_at: string;
  last_active_at: string;
  author: AuthorBrief;
  posts?: ForumPost[];
  liked?: boolean;
}

export interface ForumPost {
  id: number;
  content: string;
  like_count: number;
  created_at: string;
  author: AuthorBrief;
  liked?: boolean;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: { link?: string };
  read: boolean;
  created_at: string;
}

export const TYPE_LABELS: Record<Opportunity["type"], string> = {
  team: "组队",
  gig: "接单",
  event: "活动",
  job: "招聘试用",
};

export const STATUS_LABELS: Record<Opportunity["status"], string> = {
  draft: "草稿",
  in_review: "审核中",
  published: "已发布",
  open: "报名中",
  active: "进行中",
  closed: "已关闭",
  archived: "已归档",
};

export const STATUS_STYLES: Record<Opportunity["status"], string> = {
  draft: "border-line bg-card-2 text-mist",
  in_review: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  published: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  open: "border-accent/30 bg-accent/10 text-accent",
  active: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  closed: "border-line bg-card-2 text-fog",
  archived: "border-line bg-transparent text-fog",
};
