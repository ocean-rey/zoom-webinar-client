import { AxiosInstance } from "axios";
import { Approval, Recurrence, DayOfWeek, Participation } from "../../types/index";
export declare function hoursBetweenDates(a: Date, b: Date): number;
export declare function registrationTypeToNumber(registrationType?: Approval): 2 | 0 | 1;
export declare function recurrenceTypeToCode(type: Recurrence): 2 | 1 | 3;
export declare function weekdaysToCode(day: DayOfWeek): 2 | 1 | 3 | 4 | 5 | 6 | 7;
export declare function paginationWebinarParticipants(zoom: AxiosInstance, webinarID: string, nextPageToken?: string, results?: Participation[]): Promise<Participation[]>;
