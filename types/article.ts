export interface Article {
  id: string;
  headline: string;
  analyst_summary: string | null;
  source_name: string;
  created_at: string;
  updated_at?: string;
  original_url?: string | null;
  source_published_at?: string | null;
  section?: string;
  key_points?: string[];
  why_it_matters?: string;
  entities?: string[];
  link_status: string;
}
