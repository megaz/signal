export interface LumaConcept {
  label: string;
  hook_type: string;
  luma_prompt: string;
}

export interface CreativeBrief {
  ad_id: string;
  title: string;
  hook_type: string;
  format_length: string;
  visual_pacing: string;
  creative_direction: string;
  luma_prompt: string;
  performance_rationale: string;
  concepts: LumaConcept[];
}
