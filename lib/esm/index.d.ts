import { ZoomClientParams, CreateSingleWebinarParams, createDailyRecurringWebinarParams, RegisterToWebinarParams, Participation } from "..";
export default class ZoomClient {
    #private;
    constructor({ apiKey, secretKey, timezone, user }: ZoomClientParams);
    createSingleWebinar({ start, end, name, agenda, account, password, approval, recording, }: CreateSingleWebinarParams): Promise<string>;
    createRecurringWebinar({ start, end, name, agenda, account, type, interval, weekdays, monthlyDays, approval, recording, password, }: createDailyRecurringWebinarParams): Promise<unknown>;
    registerToWebinar({ webinarID, firstName, lastName, email, }: RegisterToWebinarParams): Promise<string>;
    getWebinarAttendees(webinarID: string): Promise<Participation[]>;
}
