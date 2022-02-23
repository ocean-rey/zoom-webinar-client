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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
            if (!(start && end && name)) {
                throw new Error("start, end, and name are required parameters!");
            }
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const duration = minutesBetweenDates(end, start);
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
                        approval_type: registrationCode,
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
    createRecurringWebinar(_a) {
        var options = __rest(_a, []);
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c, _d, _e, _f, _g;
                const startTime = options.start.toISOString();
                const registrationCode = options.approval
                    ? registrationTypeToNumber(options.approval)
                    : 0;
                const requestBody = {
                    topic: options.name,
                    type: 9,
                    start_time: startTime,
                    timezone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f"),
                    password: (_b = options.password) !== null && _b !== void 0 ? _b : undefined,
                    duration: options.duration,
                    agenda: (_c = options.agenda) !== null && _c !== void 0 ? _c : "",
                    settings: {
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        approval_type: registrationCode,
                        auto_recording: (_d = options.recording) !== null && _d !== void 0 ? _d : "none",
                    },
                    //@ts-expect-error
                    recurrence: generateRecurrenceJSON({
                        type: options.type,
                        interval: options.interval,
                        endAfter: options.endAfter,
                        params: {
                            week: (_e = options.monthlyWeek) !== null && _e !== void 0 ? _e : undefined,
                            day: (_f = options.monthlyDay) !== null && _f !== void 0 ? _f : undefined,
                            weekdays: (_g = options.weekdays) !== null && _g !== void 0 ? _g : undefined,
                        },
                    }),
                };
                const requestURL = options.account
                    ? `users/${options.account}/webinars`
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
                    const resposne = yield this._zoom.post(`/webinars/${webinarID}/registrants`, requestBody);
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
// note that this function rounds up. ie: an hour and a half becomes 2 hours.
function minutesBetweenDates(a, b) {
    const aInMs = a.getDate();
    const bInMs = b.getDate();
    const deltaMs = Math.abs(aInMs - bInMs);
    const deltaMinutes = Math.ceil(deltaMs / 60000); // didn't know this notation works. neat
    return deltaMinutes;
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
