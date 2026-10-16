export type EventType = 'page_view' | 'track' | 'identify';
export type EventSource = 'browser' | 'server';

export interface AnalyticsEvent {
  event_id: string;
  type: EventType;
  name: string;
  anonymous_id?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  timestamp: string;
  url?: string | null;
  title?: string | null;
  referrer?: string | null;
  properties?: Record<string, unknown>;
}

export interface IngestResponse {
  accepted: number;
  duplicates: number;
  rejected: { index: number; error: string }[];
}
