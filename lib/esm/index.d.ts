import { AxiosInstance } from "axios";
export default class ZoomClient {
    #private;
    _zoom: AxiosInstance;
    constructor({ apiKey, secretKey, timezone, user }: ZoomClientParams);
    createSingleWebinar({ start, end, name, agenda, account, password, approval, recording, }: CreateSingleWebinarParams): Promise<string>;
    createRecurringWebinar({ ...options }: createRecurringWebinarParams): Promise<unknown>;
    registerToWebinar({ webinarID, firstName, lastName, email, }: RegisterToWebinarParams): Promise<string>;
    getWebinarAttendees(webinarID: string): Promise<Participation[]>;
}
export declare type createRecurringWebinarParams = {
    start: Date;
    endAfter: Date | number;
    name: string;
    duration: number;
    approval?: Approval;
    recording?: Recording;
    agenda?: string;
    account?: string;
    type: Recurrence;
    interval: number;
    monthlyWeek: -1 | 1 | 2 | 3 | 4;
    weekdays?: DayOfWeek[];
    monthlyDay: number;
    password: string;
};
export declare type Recurrence = "daily" | "weekly" | "monthly";
export declare type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
export declare type ZoomClientParams = {
    apiKey: string;
    secretKey: string;
    timezone: string;
    user: string;
};
export declare type Recording = "local" | "cloud" | "none";
export declare type Approval = "registration" | "registration+approval" | "none";
export declare type CreateSingleWebinarParams = {
    start: Date;
    end: Date;
    name: string;
    agenda?: string;
    account?: string;
    password?: string;
    approval?: Approval;
    recording?: Recording;
};
export declare type RegisterToWebinarParams = {
    webinarID: string;
    firstName: string;
    lastName: string;
    email: string;
};
export declare type Participation = {
    id: string;
    user_id: string;
    name: string;
    user_email: string;
    join_time: Date | string;
    leave_time: Date | string;
    duration: number;
};
