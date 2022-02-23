import jwt from "jsonwebtoken";
import axios, { AxiosInstance } from "axios";

export default class ZoomClient {
  _zoom: AxiosInstance;
  #token: string;
  #timezone: string;
  #user: string;
  constructor({ apiKey, secretKey, timezone, user }: ZoomClientParams) {
    this.#timezone = timezone ?? "Asia/Riyadh";
    this.#user = user;
    this.#token = jwt.sign(
      {
        iss: apiKey,
        exp: Math.floor(Date.now() / 1000) + 10000, // this can probably be simplified lol
      },
      secretKey
    ); // initialize the jwt
    this._zoom = axios.create({
      baseURL: "https://api.zoom.us/v2",
      headers: { Authorization: `Bearer ${this.#token}` },
    });
  }

  async createSingleWebinar({
    start,
    end,
    name,
    agenda,
    account,
    password,
    approval,
    recording,
  }: CreateSingleWebinarParams): Promise<string> {
    if (!(start && end && name)) {
      throw new Error("start, end, and name are required parameters!")
    }
    return new Promise(async (resolve, reject) => {
      const duration = minutesBetweenDates(end, start);
      const startTime = start.toISOString();
      const registrationCode = approval
        ? registrationTypeToNumber(approval)
        : 0;
      const requestBody = {
        topic: name,
        type: 5,
        start_time: startTime,
        timezone: this.#timezone,
        settings: {
          host_video: true,
          panelists_video: true,
          hd_video: true,
          approval_type: registrationCode,
          auto_recording: recording ?? "none",
        },
        password,
        duration,
        agenda: agenda ?? "",
      };
      const requestURL = account
        ? `users/${account}/webinars`
        : `users/${this.#user}/webinars`;
      try {
        const response = await this._zoom.post(requestURL, requestBody);
        const webinarID = response.data.id;
        resolve(webinarID);
      } catch (error) {
        reject(error);
      }
    });
  }

  async createRecurringWebinar({ ...options }: createRecurringWebinarParams) {
    return new Promise(async (resolve, reject) => {
      const startTime = options.start.toISOString();
      const registrationCode = options.approval
        ? registrationTypeToNumber(options.approval)
        : 0;
      const requestBody = {
        topic: options.name,
        type: 9,
        start_time: startTime,
        timezone: this.#timezone,
        password: options.password ?? undefined,
        duration: options.duration,
        agenda: options.agenda ?? "",
        settings: {
          host_video: true,
          panelists_video: true,
          hd_video: true,
          approval_type: registrationCode,
          auto_recording: options.recording ?? "none",
        },
        //@ts-expect-error
        recurrence: generateRecurrenceJSON({
          type: options.type,
          interval: options.interval,
          endAfter: options.endAfter,
          params: {
            week: options.monthlyWeek ?? undefined,
            day: options.monthlyDay ?? undefined,
            weekdays: options.weekdays ?? undefined,
          },
        }),
      };
      const requestURL = options.account
        ? `users/${options.account}/webinars`
        : `users/${this.#user}/webinars`;
      try {
        const response = await this._zoom.post(requestURL, requestBody);
        const webinarID = response.data.id;
        resolve(webinarID);
      } catch (error) {
        reject(error);
      }
    });
  }

  async registerToWebinar({
    webinarID,
    firstName,
    lastName,
    email,
  }: RegisterToWebinarParams): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const requestBody = {
        first_name: firstName,
        last_name: lastName,
        email,
      };
      try {
        const resposne = await this._zoom.post(
          `/webinars/${webinarID}/registrants`, requestBody
        );
        const joinURL = resposne.data.join_url;
        resolve(joinURL);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getWebinarAttendees(webinarID: string): Promise<Participation[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const instancesResponse = await this._zoom.get(
          `/past_webinars/${webinarID}/instances`
        ); // because if its recurring we need to get attendance for every instances.
        const instances = instancesResponse.data.webinars.map(
          (x: { uuid: any }) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
        );
        const userList: Participation[] = []; // this is what we will eventually resolve
        for (let i = 0; i < instances.length; i++) {
          // iterate through instances
          userList.concat(
            await paginationWebinarParticipants(this._zoom, instances[i])
          );
        }
        resolve(userList);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// HELPFUL FUNCTIONS

type RecurrenceParams = {
  type: Recurrence;
  interval: number;
  endAfter: Date | Number;
};

type WeeklyRecurrence = RecurrenceParams & {
  type: "weekly";
  params: { weekdays: DayOfWeek[] };
};

type MonthlyRecurrence = RecurrenceParams & {
  type: "monthly";
  params: { day: number } | { week: number; weekdays: DayOfWeek[] };
};

type DailyRecurrence = RecurrenceParams & {
  type: "daily";
};

const generateRecurrenceJSON = (
  options: WeeklyRecurrence | MonthlyRecurrence | DailyRecurrence
) => {
  const returnValue: {
    end_times?: number;
    type: 1 | 2 | 3;
    end_date_time?: string;
    monthly_week?: -1 | 1 | 2 | 3 | 4;
    monthly_day?: number;
    monthly_week_day?: number;
    weekly_days?: string;
    repeat_interval: number;
  } = { repeat_interval: options.interval, type: 1 };
  if (typeof options.endAfter === "number") {
    returnValue.end_times = options.endAfter;
  } else {
    // @ts-expect-error
    returnValue.end_date_time = options.endAfter.toISOString();
  }
  switch (options.type) {
    case "daily":
      returnValue.type = 1;
      if (options.interval > 90)
        throw new Error("Daily interval must be less than or equal 90.");
      return returnValue;
    case "monthly":
      returnValue.type = 3;
      if (options.interval > 3)
        throw new Error("Monthly interval must be less than or equal 3");
      // @ts-expect-error
      if (options.params.day) {
        // @ts-expect-error
        returnValue.monthly_day = options.params.day;
      } else {
        // @ts-expect-error
        const week = options.params.week;
        if (!(week >= 1 && week <= 4) && week != -1)
          throw new Error(
            "Monthly recurrence week must be one of: (-1, 1, 2, 3, 4)"
          );
        returnValue.monthly_week = week;
        // @ts-expect-error
        returnValue.monthly_week_day = arrayOfWeekdaysToCSS(
          // @ts-expect-error
          options.params.weekdays
        );
      }
      return returnValue;
    case "weekly":
      returnValue.type = 2;
      if (options.interval > 12)
        throw new Error("Weekly interval must be less than or equal 12");
      // how do i not need a ts-expect-error here lmao
      returnValue.weekly_days = arrayOfWeekdaysToCSS(options.params.weekdays);
      return returnValue;
    default:
      throw new Error("Recurrence type must be one of: weekly, monthly, daily");
  }
};

// css = comma seperated string
function arrayOfWeekdaysToCSS(arr: DayOfWeek[]) {
  var returnString = "";
  for (let i = 0; i < arr.length; i++) {
    returnString = returnString.concat(
      `${weekdaysToCode(arr[i])} ${i != arr.length - 1 ? `,` : ``}`
    );
  }
  return returnString;
}

// note that this function rounds up. ie: an hour and a half becomes 2 hours.
function minutesBetweenDates(a: Date, b: Date) {
  const aInMs = a.getDate();
  const bInMs = b.getDate();
  const deltaMs = Math.abs(aInMs - bInMs);
  const deltaMinutes = Math.ceil(deltaMs / 60000); // didn't know this notation works. neat
  return deltaMinutes;
}

function registrationTypeToNumber(registrationType?: Approval) {
  switch (registrationType) {
    case "none":
      return 2;
    case "registration":
      return 0;
    case "registration+approval":
      return 1;
    default:
      return 2;
  }
}

function weekdaysToCode(day: DayOfWeek) {
  switch (day) {
    case "sunday":
      return 1;
    case "monday":
      return 2;
    case "tuesday":
      return 3;
    case "wednesday":
      return 4;
    case "thursday":
      return 5;
    case "friday":
      return 6;
    case "saturday":
      return 7;
    default:
      throw new Error(
        `weekdays must be one of "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"`
      );
  }
}

async function paginationWebinarParticipants(
  zoom: AxiosInstance,
  webinarID: string,
  nextPageToken: string = "",
  results: Participation[] = []
): Promise<Participation[]> {
  try {
    const response = await zoom.get(
      `/report/webinars/${webinarID}/participants?page_size=300?nextPageToken=${nextPageToken}`
    );
    console.log(response); // will be removed
    results = results.concat(
      response.data.participants.map((x: Participation): Participation => {
        x.join_time = new Date(x.join_time);
        x.leave_time = new Date(x.leave_time);
        return x;
      })
    );
    console.log(results);
    if (response.data.next_page_token?.length > 2) {
      nextPageToken = response.data.next_page_token;
      return paginationWebinarParticipants(
        zoom,
        webinarID,
        nextPageToken,
        results
      );
    } else {
      return results;
    }
  } catch (err) {
    throw err;
  }
}

// HELPFUL TYPES

export type createRecurringWebinarParams = {
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
  weekdays?: DayOfWeek[]; // for weekly & monthly recurrence, the days of the week to occur on
  monthlyDay: number; // for monthly recurrence, value between 1 and 31
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
