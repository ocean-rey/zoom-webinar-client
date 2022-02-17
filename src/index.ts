import jwt from "jsonwebtoken";
import axios, { AxiosInstance } from "axios";
import {
  ZoomClientParams,
  CreateSingleWebinarParams,
  createDailyRecurringWebinarParams,
  RegisterToWebinarParams,
  Participation,
} from "..";
import {
  hoursBetweenDates,
  registrationTypeToNumber,
  recurrenceTypeToCode,
  weekdaysToCode,
  paginationWebinarParticipants,
} from "./helpers";

export default class ZoomClient {
  #zoom: AxiosInstance;
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
    this.#zoom = axios.create({
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
      const duration = hoursBetweenDates(end, start);
      const startTime = start.toISOString();
      const registrationCode = registrationTypeToNumber(approval);
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
        const response = await this.#zoom.post(requestURL, requestBody);
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
      const duration = hoursBetweenDates(end, start);
      const startTime = start.toISOString();
      const registrationCode = registrationTypeToNumber(approval);
      const requestBody = {
        topic: name,
        type: 9,
        start_time: startTime,
        timezone: this.#timezone,
        settings: {
          host_video: true,
          panelists_video: true,
          hd_video: true,
          registration_type: registrationCode,
          auto_recording: recording ?? "none",
        },
        recurrence: {
          type: recurrenceTypeToCode(type),
          repeat_interval: interval,
          weekly_days: weekdays ? weekdays.map((x) => weekdaysToCode(x)) : "",
          monthly_days: monthlyDays ?? "",
        },
        password,
        duration,
        agenda: agenda ?? "",
      };
      const requestURL = account
        ? `users/${account}/webinars`
        : `users/${this.#user}/webinars`;
      try {
        const response = await this.#zoom.post(requestURL, requestBody);
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
  }: RegisterToWebinarParams) {
    return new Promise(async (resolve, reject) => {
      const requestBody = {
        first_name: firstName,
        last_name: lastName,
        email,
      };
      try {
        const resposne = await this.#zoom.post(
          `/webinars/${webinarID}/registrants`
        );
        const joinURL = resposne.data.join_url;
        resolve(joinURL);
      } catch (error) {
        reject(error);
      }
    });
  }

  // INCOMPLETE
  async getWebinarAttendees(webinarID: string): Promise<Participation[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const instancesResponse = await this.#zoom.get(
          `/past_webinars/${webinarID}/instances`
        ); // because if its recurring we need to get attendance for every instances.
        const instances = instancesResponse.data.webinars.map(
          (x: { uuid: any }) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
        );
        const userList: Participation[] = []; // this is what we will eventually resolve
        for (let i = 0; i < instances.length; i++) {
          // iterate through instances
          userList.concat(
            await paginationWebinarParticipants(this.#zoom, instances[i])
          );
        }
        resolve(userList);
      } catch (error) {
        reject(error);
      }
    });
  }
}
