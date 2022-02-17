var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ZoomClient_token, _ZoomClient_timezone, _ZoomClient_user;
import jwt from "jsonwebtoken";
import axios from "axios";
export default class ZoomClient {
    constructor({ apiKey, secretKey, timezone, user }) {
        _ZoomClient_token.set(this, void 0);
        _ZoomClient_timezone.set(this, void 0);
        _ZoomClient_user.set(this, void 0);
        __classPrivateFieldSet(this, _ZoomClient_timezone, timezone !== null && timezone !== void 0 ? timezone : "Asia/Riyadh", "f");
        __classPrivateFieldSet(this, _ZoomClient_user, user, "f");
        __classPrivateFieldSet(this, _ZoomClient_token, jwt.sign({
            iss: apiKey,
            exp: Math.floor(Date.now() / 1000) + 10000, // this can probably be simplified lol
        }, secretKey), "f"); // initialize the jwt
        this._zoom = axios.create({
            baseURL: "https://api.zoom.us/v2",
            headers: { Authorization: `Bearer ${__classPrivateFieldGet(this, _ZoomClient_token, "f")}` },
        });
    }
    createSingleWebinar({ start, end, name, agenda, account, password, approval, recording, }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const duration = hoursBetweenDates(end, start);
                const startTime = start.toISOString();
                const registrationCode = approval
                    ? registrationTypeToNumber(approval)
                    : 0;
                const requestBody = {
                    topic: name,
                    type: 5,
                    start_time: startTime,
                    timezone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f"),
                    settings: {
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        registration_type: registrationCode,
                        auto_recording: recording !== null && recording !== void 0 ? recording : "none",
                    },
                    password,
                    duration,
                    agenda: agenda !== null && agenda !== void 0 ? agenda : "",
                };
                const requestURL = account
                    ? `users/${account}/webinars`
                    : `users/${__classPrivateFieldGet(this, _ZoomClient_user, "f")}/webinars`;
                try {
                    const response = yield this._zoom.post(requestURL, requestBody);
                    const webinarID = response.data.id;
                    resolve(webinarID);
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
    createRecurringWebinar({ start, end, name, agenda, account, type, interval, weekdays, monthlyDays, approval, recording, password, }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const duration = hoursBetweenDates(end, start);
                const startTime = start.toISOString();
                const registrationCode = approval
                    ? registrationTypeToNumber(approval)
                    : 0;
                const requestBody = {
                    topic: name,
                    type: 9,
                    start_time: startTime,
                    timezone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f"),
                    settings: {
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        registration_type: registrationCode,
                        auto_recording: recording !== null && recording !== void 0 ? recording : "none",
                    },
                    recurrence: generateRecurrenceJSON(type, interval, weekdays, monthlyDays),
                    password,
                    duration,
                    agenda: agenda !== null && agenda !== void 0 ? agenda : "",
                };
                const requestURL = account
                    ? `users/${account}/webinars`
                    : `users/${__classPrivateFieldGet(this, _ZoomClient_user, "f")}/webinars`;
                try {
                    const response = yield this._zoom.post(requestURL, requestBody);
                    const webinarID = response.data.id;
                    resolve(webinarID);
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
    registerToWebinar({ webinarID, firstName, lastName, email, }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const requestBody = {
                    first_name: firstName,
                    last_name: lastName,
                    email,
                };
                try {
                    const resposne = yield this._zoom.post(`/webinars/${webinarID}/registrants`);
                    const joinURL = resposne.data.join_url;
                    resolve(joinURL);
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
    getWebinarAttendees(webinarID) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const instancesResponse = yield this._zoom.get(`/past_webinars/${webinarID}/instances`); // because if its recurring we need to get attendance for every instances.
                    const instances = instancesResponse.data.webinars.map((x) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
                    );
                    const userList = []; // this is what we will eventually resolve
                    for (let i = 0; i < instances.length; i++) {
                        // iterate through instances
                        userList.concat(yield paginationWebinarParticipants(this._zoom, instances[i]));
                    }
                    resolve(userList);
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
}
_ZoomClient_token = new WeakMap(), _ZoomClient_timezone = new WeakMap(), _ZoomClient_user = new WeakMap();
// HELPFUL FUNCTIONS
function generateRecurrenceJSON(recurrence, interval, weekdays, monthlyDays) {
    switch (recurrence) {
        case "daily":
            return {
                type: recurrenceTypeToCode(recurrence),
                repeat_interval: interval,
            };
        case "monthly":
            if (!monthlyDays) {
                throw new Error("Monthly recurrence must include the days on which the webinar should occur every month. ie: every 1st and 14th of the month: [1, 14]");
            }
            return {
                type: recurrenceTypeToCode(recurrence),
                monthly_days: monthlyDays.join(),
                repeat_interval: interval,
            };
        case "weekly":
            if (!weekdays) {
                throw new Error('Must specify days of the week in which the webinar should occur. ie: every monday and tuesday: ["monday", "tuesday"]');
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
function hoursBetweenDates(a, b) {
    const aInMs = a.getDate();
    const bInMs = b.getDate();
    const deltaMs = Math.abs(aInMs - bInMs);
    const deltaHours = Math.ceil(deltaMs / 3.6e6); // didn't know this notation works. neat
    return deltaHours;
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
function recurrenceTypeToCode(type) {
    switch (type) {
        case "daily":
            return 1;
        case "weekly":
            return 2;
        case "monthly":
            return 3;
        default:
            throw new Error('type property must be one of: "daily", "weekly". or "monthly"');
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
function paginationWebinarParticipants(zoom, webinarID, nextPageToken = "", results = []) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield zoom.get(`/report/webinars/${webinarID}/participants?page_size=300?nextPageToken=${nextPageToken}`);
            console.log(response); // will be removed
            results = results.concat(response.data.participants.map((x) => {
                x.join_time = new Date(x.join_time);
                x.leave_time = new Date(x.leave_time);
                return x;
            }));
            console.log(results);
            if (((_a = response.data.next_page_token) === null || _a === void 0 ? void 0 : _a.length) > 2) {
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
    });
}
