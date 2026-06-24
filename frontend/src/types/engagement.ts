export interface Engagement {
  ad_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
  author_name: string | null;
  author_nick: string | null;
  author_avatar: string | null;
  author_verified: boolean;
  author_fans: number | null;
  is_sponsored: boolean;
  posted_at: string | null;
}

export interface EngagementResponse {
  items: Engagement[];
}
