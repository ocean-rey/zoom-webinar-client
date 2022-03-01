import { AxiosInstance } from "axios";
export default class ZoomClient {
    #private;
    _zoom: AxiosInstance;
    constructor({ apiKey, secretKey, timezone, user }: ZoomClientParams);
    createSingleWebinar({ start, duration, name, agenda, account, password, approval, recording, }: CreateWebinarBaseParams): Promise<string>;
    createRecurringWebinar({ ...options }: CreateRecurringWebinarParams): Promise<unknown>;
    registerToWebinar({ webinarID, firstName, lastName, email, }: RegisterToWebinarParams): Promise<string>;
    getWebinarAttendees(webinarID: string): Promise<Participation[]>;
}
declare type Recording = "local" | "cloud" | "none";
declare type Approval = "registration" | "registration+approval" | "none";
declare type Recurrence = "daily" | "weekly" | "monthly";
declare type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
declare type RecurrenceParams = {
    type: Recurrence;
    interval: number;
    endAfter: Date | Number;
};
declare type WeeklyRecurrence = RecurrenceParams & {
    type: "weekly";
    params: {
        weekdays: DayOfWeek[];
    };
};
declare type MonthlyRecurrence = RecurrenceParams & {
    type: "monthly";
    params: {
        day: number;
    } | {
        week: -1 | 1 | 2 | 3 | 4;
        weekdays: DayOfWeek[];
    };
};
declare type DailyRecurrence = RecurrenceParams & {
    type: "daily";
};
declare type RecurrenceOptions = WeeklyRecurrence | MonthlyRecurrence | DailyRecurrence;
declare type CreateRecurringWebinarParams = CreateWebinarBaseParams & RecurrenceOptions & {
    endAfter: Date | number;
    interval: number;
};
declare type ZoomClientParams = {
    apiKey: string;
    secretKey: string;
    timezone: string;
    user: string;
};
declare type CreateWebinarBaseParams = {
    start: Date;
    name: string;
    agenda?: string;
    account?: string;
    password?: string;
    approval?: Approval;
    recording?: Recording;
    duration: number;
};
declare type RegisterToWebinarParams = {
    webinarID: string;
    firstName: string;
    lastName: string;
    email: string;
};
declare type Participation = {
    id: string;
    user_id: string;
    name: string;
    user_email: string;
    join_time: Date | string;
    leave_time: Date | string;
    duration: number;
};
export {};
