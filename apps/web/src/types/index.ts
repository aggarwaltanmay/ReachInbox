export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export type Email = {
  id: string;
  recipient: string;
  subject: string;
  scheduled_at: string;
  sent_at?: string;
  status: EmailStatus;
  error?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
};

export type EmailStats = {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
};

export type SlackStatus = {
  connected: boolean;
  teamName: string | null;
};

export type SchedulePayload = {
  requestId: string;
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
  startAt: string;
  delayMs: number;
  hourlyLimitPerSender?: number;
};

export type Tab = 'scheduled' | 'sent';
