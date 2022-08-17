import jwt from "jsonwebtoken";
import axios, { AxiosInstance, AxiosResponse } from "axios";

export default class ZoomClient {
  _zoom: AxiosInstance;
  #timezone: string;
  #user: string;
  #apiKey: string;
  #secretKey: string;
  constructor({ apiKey, secretKey, timezone, user }: ZoomClientParams) {
    this.#timezone = timezone ?? "Asia/Riyadh";
    this.#user = user;
    this.#apiKey = apiKey;
    this.#secretKey = secretKey;
    this._zoom = axios.create({
      baseURL: "https://api.zoom.us/v2",
    });
  }

  getToken() {
    const tokenExpiry = Math.floor(Date.now() / 1000) + 1000;
    const token = jwt.sign(
      {
        iss: this.#apiKey,
        exp: Math.floor(Date.now() / 1000) + 10000,
      },
      this.#secretKey
    );
    return token;
  }

  async createSingleWebinar({
    ...params
  }: CreateWebinarBaseParams): Promise<string> {
    if (!(params.start && params.duration && params.name)) {
      throw new Error("start, duration, and name are required parameters!");
    }
    return new Promise<string>(async (resolve, reject) => {
      const startTime = new Date(params.start).toISOString();
      const registrationCode = params.approval
        ? registrationTypeToNumber(params.approval)
        : 0;
      const requestBody = {
        topic: params.name,
        type: 5,
        start_time: startTime,
        timezone: this.#timezone,
        settings: {
          host_video: true,
          panelists_video: true,
          hd_video: true,
          approval_type: registrationCode,
          auto_recording: params.recording ?? "none",
          meeting_authentication: false,
          alternative_hosts: params.alterantiveHosts
            ? params.alterantiveHosts.join()
            : "",
        },
        password: params.password,
        duration: params.duration,
        agenda: params.agenda ?? "",
      };
      const requestURL = params.account
        ? `users/${params.account}/webinars`
        : `users/${this.#user}/webinars`;
      try {
        const response = await this._zoom.post(requestURL, requestBody, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const webinarID = `${response.data.id}`;
        resolve(webinarID);
      } catch (error) {
        reject(error);
      }
    });
  }

  async createRecurringWebinar({
    ...options
  }: CreateRecurringWebinarParams): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const startTime = new Date(options.start).toISOString();
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
          meeting_authentication: false,
          host_video: true,
          panelists_video: true,
          hd_video: true,
          approval_type: registrationCode,
          auto_recording: options.recording ?? "none",
        },
        recurrence:
          options.type === "daily"
            ? generateRecurrenceJSON({
                type: options.type,
                interval: options.interval,
                endAfter: options.endAfter,
              })
            : generateRecurrenceJSON({
                type: options.type,
                interval: options.interval,
                endAfter: options.endAfter,
                //@ts-expect-error because if type is week then monthly params are not assignable and vice versa
                params: options.params,
              }),
      };

      const requestURL = options.account
        ? `users/${options.account}/webinars`
        : `users/${this.#user}/webinars`;
      try {
        const response = await this._zoom.post(requestURL, requestBody, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        const webinarID = `${response.data.id}`;
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
          `/webinars/${webinarID}/registrants`,
          requestBody,
          {
            headers: { Authorization: `Bearer ${this.getToken()}` },
          }
        );
        const joinURL = resposne.data.join_url;
        resolve(joinURL);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getWebinarAttendees(webinarID: string): Promise<Participation[]> {
    return this._zoom
      .get(`/past_webinars/${webinarID}/instances`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      })
      .then((instancesResponse: AxiosInstance) => {
        const instances = instancesResponse.data.webinars.map(
          (x: { uuid: any }) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
        );
        var userList: Participation[] = []; // this is what we will eventually resolve
        return Promise.all(
          instances.map((instance: string) =>
            paginationWebinarParticipants(this._zoom, instance, this.getToken())
          )
        );
      });
  }

  async deleteWebinar(webinarID: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this._zoom.delete(`/webinars/${webinarID}`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        switch (res.status) {
          case 204:
          case 200:
            resolve();
            break;
          case 300:
            throw new Error(
              `Invalid webinar ID. Zoom response: ${res.statusText}`
            );
          case 400:
            throw new Error(`Bad Request. Zoom response: ${res.statusText}`);
          case 404:
            throw new Error(
              `Webinar not found or expired. Zoom response: ${res.statusText}`
            );
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateWebinar({ ...params }: UpdateWebinarParams) {
    return new Promise(async (resolve, reject) => {
      const { options } = params;
      // recurrence always requires a type
      let recurrenceJSON;
      if (options.type) {
        const recurrenceParams = trimNullKeys({
          endAfter: options.endAfter,
          interval: options.interval,
          type: options.type,
          // @ts-ignore no clue why not tho
          params: options.params,
        });
        // @ts-expect-error idk how to validate this one lmao
        recurrenceJSON = generateRecurrenceJSON(recurrenceParams);
      }
      const requestBody = {
        agenda: options.agenda ?? null,
        duration: options.duration ?? null,
        password: options.password ?? null,
        recurrence: recurrenceJSON ?? null,
        start_time: options.start
          ? new Date(options.start).toISOString()
          : null,
        timezone: this.#timezone ?? null,
        topic: options.name ?? null,
        settings: {
          meeting_authentication: false,
          host_video: true,
          panelists_video: true,
          hd_video: true,
          auto_recording: options.recording ?? "none",
          approval_type: options.approval
            ? registrationTypeToNumber(options.approval)
            : null,
          alternative_hosts: options.alterantiveHosts
            ? options.alterantiveHosts.join()
            : "",
        },
      };
      try {
        const res = await this._zoom.patch(
          `/webinars/${params.id}/${
            params.occurrence_id
              ? `?occurrence_id=${params.occurrence_id}`
              : null
          }`,
          trimNullKeys(requestBody)
        );
        switch (res.status) {
          case 204:
          case 200:
            resolve(res.data);
            break;
          case 300:
            throw new Error(
              `Invalid webinar ID or invalid recurrence settings. Zoom response: ${res.statusText}`
            );
          case 400:
            throw new Error(`Bad Request. Zoom response: ${res.statusText}`);
          case 404:
            throw new Error(
              `Webinar not found or expired. Zoom response: ${res.statusText}`
            );
        }
        resolve(res.data);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// HELPFUL FUNCTIONS

const trimNullKeys = (object: { [any: string]: any }) => {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const element = object[key];
      if (element === null) {
        delete object[key];
      } else {
        if (typeof element === "object") {
          trimNullKeys(object[key]);
        }
      }
    }
  }
  return object;
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
  token: string
): Promise<Participation[]> {
  return new Promise(async (resolve, reject) => {
    let results: Participation[] = [];
    try {
      const response = await zoom.get(
        `/report/webinars/${webinarID}/participants?page_size=300`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      results = results.concat(response.data.participants);

      if (response.data.next_page_token) {
        const nextPageToken = response.data.next_page_token;
        const nextResponse = await zoom.get(
          `/report/webinars/${webinarID}/participants?page_size=300&nextPageToken=${nextPageToken}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        results = results.concat(nextResponse.data.participants);
      }
      return resolve(results);
    } catch (err) {
      return reject(err);
    }
  });
}

// HELPFUL TYPES

type Recording = "local" | "cloud" | "none";
type Approval = "registration" | "registration+approval" | "none";
type Recurrence = "daily" | "weekly" | "monthly";
type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

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
  params: { day: number } | { week: -1 | 1 | 2 | 3 | 4; weekdays: DayOfWeek[] };
};

type DailyRecurrence = RecurrenceParams & {
  type: "daily";
};

type RecurrenceOptions = WeeklyRecurrence | MonthlyRecurrence | DailyRecurrence;

type CreateRecurringWebinarParams = CreateWebinarBaseParams &
  RecurrenceOptions & {
    endAfter: Date | number;
    interval: number;
  };

type UpdateWebinarParams = {
  id: string;
  occurrence_id?: string;
  options: Partial<CreateRecurringWebinarParams>;
};

type ZoomClientParams = {
  apiKey: string;
  secretKey: string;
  timezone: string;
  user: string; // zoom account email (probably)
};

type CreateWebinarBaseParams = {
  start: Date;
  name: string;
  agenda?: string;
  account?: string; // specify the account to be used if this api key has access to webinar creation on multiple accounts (and you want to Create the webinar on one of those accounts)
  password?: string;
  approval?: Approval;
  recording?: Recording;
  duration: number;
  alterantiveHosts?: string[];
};

type RegisterToWebinarParams = {
  webinarID: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Participation = {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: Date | string; // string before parsing
  leave_time: Date | string;
  duration: number; // zoom api doesn't specify what this represents lol. see: https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants
};
