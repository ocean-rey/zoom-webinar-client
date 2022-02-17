export type createDailyRecurringWebinarParams = {
  start: Date;
  end: Date;
  name: string;
  approval?: Approval;
  recording?: Recording;
  agenda?: string;
  account?: string;
  type: Recurrence;
  interval?: number;
  weekdays?: DayOfWeek[]; // for weekly recurrence, the days of the week to occur on
  monthlyDays?: number; // for monthly recurrence, value between 1 and 31
  password: string;
};

export type Recurrence = "daily" | "weekly" | "monthly";

export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ZoomClientParams = {
  apiKey: string;
  secretKey: string;
  timezone: string;
  user: string; // zoom account email (probably)
};

export type Recording = "local" | "cloud" | "none";

export type Approval = "registration" | "registration+approval" | "none";

export type CreateSingleWebinarParams = {
  start: Date;
  end: Date;
  name: string;
  agenda?: string;
  account?: string; // specify the account to be used if this api key has access to webinar creation on multiple accounts (and you want to create the webinar on one of those accounts)
  password?: string;
  approval?: Approval;
  recording?: Recording;
};

export type RegisterToWebinarParams = {
  webinarID: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type Participation = {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: Date | string; // string before parsing
  leave_time: Date | string;
  duration: number; // zoom api doesn't specify what this represents lol. see: https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants
};