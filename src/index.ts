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
          registration_type: registrationCode,
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

  async createRecurringWebinar({
    start,
    end,
    name,
    agenda,
    account,
    type,
    interval,
    weekdays,
    monthlyDays,
    approval,
    recording,
    password,
  }: createDailyRecurringWebinarParams) {
    return new Promise(async (resolve, reject) => {
      const duration = minutesBetweenDates(end, start);
      const startTime = start.toISOString();
      const registrationCode = approval
        ? registrationTypeToNumber(approval)
        : 0;
      const requestBody = {
        topic: name,
        type: 9,
        start_time: startTime,
        timezone: this.#timezone,
        password: password,
        duration: duration,
        agenda: agenda ?? "",
        settings: {
          host_video: true,
          panelists_video: true,
          hd_video: true,
          registration_type: registrationCode,
          auto_recording: recording ?? "none",
        },
        recurrence: generateRecurrenceJSON(
          type,
          interval,
          weekdays,
          monthlyDays
        ),
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
          `/webinars/${webinarID}/registrants`
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

function generateRecurrenceJSON(
  recurrence: Recurrence,
  interval: number,
  weekdays?: DayOfWeek[],
  monthlyDays?: number[]
) {
  switch (recurrence) {
    case "daily":
      return {
        type: recurrenceTypeToCode(recurrence),
        repeat_interval: interval,
      };
    case "monthly":
      if (!monthlyDays) {
        throw new Error(
          "Monthly recurrence must include the days on which the webinar should occur every month. ie: every 1st and 14th of the month: [1, 14]"
        );
      }
      return {
        type: recurrenceTypeToCode(recurrence),
        monthly_days: monthlyDays.join(),
        repeat_interval: interval,
      };
    case "weekly":
      if (!weekdays) {
        throw new Error(
          'Must specify days of the week in which the webinar should occur. ie: every monday and tuesday: ["monday", "tuesday"]'
        );
      }
      return {
        type: recurrenceTypeToCode(recurrence),
        weekly_days: weekdays.map((x) => weekdaysToCode(x)).join(),
        reapeat_interval: interval,
      };
    default:
      throw new Error("Recurrence type must be one of: weekly, monthly, daily");
  }
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
function recurrenceTypeToCode(type: Recurrence) {
  switch (type) {
    case "daily":
      return 1;
    case "weekly":
      return 2;
    case "monthly":
      return 3;
    default:
      throw new Error(
        'type property must be one of: "daily", "weekly". or "monthly"'
      );
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

export type createDailyRecurringWebinarParams = {
  start: Date;
  end: Date;
  name: string;
  approval?: Approval;
  recording?: Recording;
  agenda?: string;
  account?: string;
  type: Recurrence;
  interval: number;
  weekdays?: DayOfWeek[]; // for weekly recurrence, the days of the week to occur on
  monthlyDays?: number[]; // for monthly recurrence, value between 1 and 31
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
