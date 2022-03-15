import jwt from "jsonwebtoken";
import axios from "axios";
export default class ZoomClient {
    _zoom;
    #token;
    #timezone;
    #user;
    constructor({ apiKey, secretKey, timezone, user }) {
        this.#timezone = timezone ?? "Asia/Riyadh";
        this.#user = user;
        this.#token = jwt.sign({
            iss: apiKey,
            exp: Math.floor(Date.now() / 1000) + 10000, // this can probably be simplified lol
        }, secretKey); // initialize the jwt
        this._zoom = axios.create({
            baseURL: "https://api.zoom.us/v2",
            headers: { Authorization: `Bearer ${this.#token}` },
        });
    }
    async createSingleWebinar({ ...params }) {
        if (!(params.start && params.duration && params.name)) {
            throw new Error("start, duration, and name are required parameters!");
        }
        return new Promise(async (resolve, reject) => {
            const startTime = params.start.toISOString();
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
                const response = await this._zoom.post(requestURL, requestBody);
                const webinarID = `${response.data.id}`;
                resolve(webinarID);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async createRecurringWebinar({ ...options }) {
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
                    meeting_authentication: false,
                    host_video: true,
                    panelists_video: true,
                    hd_video: true,
                    approval_type: registrationCode,
                    auto_recording: options.recording ?? "none",
                },
                recurrence: options.type === "daily"
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
                const response = await this._zoom.post(requestURL, requestBody);
                const webinarID = `${response.data.id}`;
                resolve(webinarID);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async registerToWebinar({ webinarID, firstName, lastName, email, }) {
        return new Promise(async (resolve, reject) => {
            const requestBody = {
                first_name: firstName,
                last_name: lastName,
                email,
            };
            try {
                const resposne = await this._zoom.post(`/webinars/${webinarID}/registrants`, requestBody);
                const joinURL = resposne.data.join_url;
                resolve(joinURL);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async getWebinarAttendees(webinarID) {
        return new Promise(async (resolve, reject) => {
            try {
                const instancesResponse = await this._zoom.get(`/past_webinars/${webinarID}/instances`); // because if its recurring we need to get attendance for every instances.
                const instances = instancesResponse.data.webinars.map((x) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
                );
                var userList = []; // this is what we will eventually resolve
                for (let i = 0; i < instances.length; i++) {
                    // iterate through instances
                    userList = userList.concat(await paginationWebinarParticipants(this._zoom, instances[i]));
                }
                resolve(userList);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async deleteWebinar(webinarID) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this._zoom.delete(`/webinars/${webinarID}`);
                switch (res.status) {
                    case 204:
                    case 200:
                        resolve();
                        break;
                    case 300:
                        throw new Error(`Invalid webinar ID. Zoom response: ${res.statusText}`);
                    case 400:
                        throw new Error(`Bad Request. Zoom response: ${res.statusText}`);
                    case 404:
                        throw new Error(`Webinar not found or expired. Zoom response: ${res.statusText}`);
                }
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async updateWebinar({ ...params }) {
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
                start_time: options.start?.toISOString() ?? null,
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
                const res = await this._zoom.patch(`/webinars/${params.id}/${params.occurrence_id
                    ? `?occurrence_id=${params.occurrence_id}`
                    : null}`);
                switch (res.status) {
                    case 204:
                    case 200:
                        resolve(res.data);
                        break;
                    case 300:
                        throw new Error(`Invalid webinar ID or invalid recurrence settings. Zoom response: ${res.statusText}`);
                    case 400:
                        throw new Error(`Bad Request. Zoom response: ${res.statusText}`);
                    case 404:
                        throw new Error(`Webinar not found or expired. Zoom response: ${res.statusText}`);
                }
                resolve(res.data);
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
// HELPFUL FUNCTIONS
const trimNullKeys = (object) => {
    for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            const element = object[key];
            if (element === null) {
                delete object[key];
            }
            else {
                if (typeof element === "object") {
                    trimNullKeys(object[key]);
                }
            }
        }
    }
    return object;
};
const generateRecurrenceJSON = (options) => {
    const returnValue = { repeat_interval: options.interval, type: 1 };
    if (typeof options.endAfter === "number") {
        returnValue.end_times = options.endAfter;
    }
    else {
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
            }
            else {
                // @ts-expect-error
                const week = options.params.week;
                if (!(week >= 1 && week <= 4) && week != -1)
                    throw new Error("Monthly recurrence week must be one of: (-1, 1, 2, 3, 4)");
                returnValue.monthly_week = week;
                // @ts-expect-error
                returnValue.monthly_week_day = arrayOfWeekdaysToCSS(
                // @ts-expect-error
                options.params.weekdays);
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
function arrayOfWeekdaysToCSS(arr) {
    var returnString = "";
    for (let i = 0; i < arr.length; i++) {
        returnString = returnString.concat(`${weekdaysToCode(arr[i])} ${i != arr.length - 1 ? `,` : ``}`);
    }
    return returnString;
}
function registrationTypeToNumber(registrationType) {
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
function weekdaysToCode(day) {
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
            throw new Error(`weekdays must be one of "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"`);
    }
}
async function paginationWebinarParticipants(zoom, webinarID, nextPageToken, results) {
    if (!results) {
        results = [];
    }
    try {
        const response = await zoom.get(`/report/webinars/${webinarID}/participants?page_size=300?nextPageToken=${nextPageToken}`);
        results = results.concat(response.data.participants);
        if (response.data.next_page_token) {
            nextPageToken = response.data.next_page_token;
            return paginationWebinarParticipants(zoom, webinarID, nextPageToken, results);
        }
        else {
            return results;
        }
    }
    catch (err) {
        throw err;
    }
}
