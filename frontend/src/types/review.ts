export type RefreshStatus = "pending" | "generating" | "ready" | "approved" | "shipped" | "rejected";

export interface Refresh {
  id: string;
  ad_id: string;
  video_url: string | null;
  status: RefreshStatus;
  reviewer_notes: string | null;
}
