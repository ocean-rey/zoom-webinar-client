"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _ZoomClient_token, _ZoomClient_apiKey, _ZoomClient_secretKey, _ZoomClient_timezone, _ZoomClient_user;
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
class ZoomClient {
    constructor({ apiKey, secretKey, timezone, user }) {
        _ZoomClient_token.set(this, void 0);
        _ZoomClient_apiKey.set(this, void 0);
        _ZoomClient_secretKey.set(this, void 0);
        _ZoomClient_timezone.set(this, void 0);
        _ZoomClient_user.set(this, void 0);
        __classPrivateFieldSet(this, _ZoomClient_timezone, timezone !== null && timezone !== void 0 ? timezone : "Asia/Riyadh", "f");
        __classPrivateFieldSet(this, _ZoomClient_user, user, "f");
        __classPrivateFieldSet(this, _ZoomClient_token, jsonwebtoken_1.default.sign({
            iss: apiKey,
            exp: Math.floor(Date.now() / 1000) + 10000, // this can probably be simplified lol
        }, secretKey), "f"); // initialize the jwt
        __classPrivateFieldSet(this, _ZoomClient_apiKey, apiKey, "f");
        __classPrivateFieldSet(this, _ZoomClient_secretKey, secretKey, "f");
        this._zoom = axios_1.default.create({
            baseURL: "https://api.zoom.us/v2",
            headers: { Authorization: `Bearer ${__classPrivateFieldGet(this, _ZoomClient_token, "f")}` },
        });
    }
    refreshToken() {
        __classPrivateFieldSet(this, _ZoomClient_token, jsonwebtoken_1.default.sign({
            iss: __classPrivateFieldGet(this, _ZoomClient_apiKey, "f"),
            exp: Math.floor(Date.now() / 1000) + 10000, // this can probably be simplified lol
        }, __classPrivateFieldGet(this, _ZoomClient_secretKey, "f")), "f");
    }
    createSingleWebinar(_a) {
        var params = __rest(_a, []);
        return __awaiter(this, void 0, void 0, function* () {
            if (!(params.start && params.duration && params.name)) {
                throw new Error("start, duration, and name are required parameters!");
            }
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c;
                const formatter = new Intl.DateTimeFormat('en-US', { timeZone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f") });
                const startTime = formatter.format(new Date(params.start));
                const registrationCode = params.approval
                    ? registrationTypeToNumber(params.approval)
                    : 0;
                const requestBody = {
                    topic: params.name,
                    type: 5,
                    start_time: startTime,
                    timezone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f"),
                    settings: {
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        approval_type: registrationCode,
                        auto_recording: (_b = params.recording) !== null && _b !== void 0 ? _b : "none",
                        meeting_authentication: false,
                        alternative_hosts: params.alterantiveHosts
                            ? params.alterantiveHosts.join()
                            : "",
                    },
                    password: params.password,
                    duration: params.duration,
                    agenda: (_c = params.agenda) !== null && _c !== void 0 ? _c : "",
                };
                const requestURL = params.account
                    ? `users/${params.account}/webinars`
                    : `users/${__classPrivateFieldGet(this, _ZoomClient_user, "f")}/webinars`;
                try {
                    const response = yield this._zoom.post(requestURL, requestBody);
                    const webinarID = `${response.data.id}`;
                    resolve(webinarID);
                }
                catch (error) {
                    this.refreshToken();
                    try {
                        const response = yield this._zoom.post(requestURL, requestBody);
                        const webinarID = response.data.id;
                        resolve(webinarID);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            }));
        });
    }
    createRecurringWebinar(_a) {
        var options = __rest(_a, []);
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c, _d;
                const formatter = new Intl.DateTimeFormat('en-US', { timeZone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f") });
                const startTime = formatter.format(new Date(options.start));
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
                        meeting_authentication: false,
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        approval_type: registrationCode,
                        auto_recording: (_d = options.recording) !== null && _d !== void 0 ? _d : "none",
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
                    : `users/${__classPrivateFieldGet(this, _ZoomClient_user, "f")}/webinars`;
                try {
                    const response = yield this._zoom.post(requestURL, requestBody);
                    const webinarID = `${response.data.id}`;
                    resolve(webinarID);
                }
                catch (error) {
                    try {
                        this.refreshToken();
                        const response = yield this._zoom.post(requestURL, requestBody);
                        const webinarID = response.data.id;
                        resolve(webinarID);
                    }
                    catch (error) {
                        reject(error);
                    }
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
                    try {
                        this.refreshToken();
                        const resposne = yield this._zoom.post(`/webinars/${webinarID}/registrants`, requestBody);
                        const joinURL = resposne.data.join_url;
                        resolve(joinURL);
                    }
                    catch (error) {
                        reject(error);
                    }
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
                    var userList = []; // this is what we will eventually resolve
                    for (let i = 0; i < instances.length; i++) {
                        // iterate through instances
                        userList = userList.concat(yield paginationWebinarParticipants(this._zoom, instances[i]));
                    }
                    resolve(userList);
                }
                catch (error) {
                    try {
                        this.refreshToken();
                        const instancesResponse = yield this._zoom.get(`/past_webinars/${webinarID}/instances`); // because if its recurring we need to get attendance for every instances.
                        const instances = instancesResponse.data.webinars.map((x) => encodeURIComponent(encodeURIComponent(x.uuid)) // https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#operation/reportWebinarParticipants yes its this dumb
                        );
                        var userList = []; // this is what we will eventually resolve
                        for (let i = 0; i < instances.length; i++) {
                            // iterate through instances
                            userList = userList.concat(yield paginationWebinarParticipants(this._zoom, instances[i]));
                        }
                        resolve(userList);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            }));
        });
    }
    deleteWebinar(webinarID) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield this._zoom.delete(`/webinars/${webinarID}`);
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
            }));
        });
    }
    updateWebinar(_a) {
        var params = __rest(_a, []);
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c, _d, _e, _f, _g;
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
                const formatter = new Intl.DateTimeFormat('en-US', { timeZone: __classPrivateFieldGet(this, _ZoomClient_timezone, "f") });
                const requestBody = {
                    agenda: (_b = options.agenda) !== null && _b !== void 0 ? _b : null,
                    duration: (_c = options.duration) !== null && _c !== void 0 ? _c : null,
                    password: (_d = options.password) !== null && _d !== void 0 ? _d : null,
                    recurrence: recurrenceJSON !== null && recurrenceJSON !== void 0 ? recurrenceJSON : null,
                    start_time: options.start
                        ? formatter.format(new Date(options.start))
                        : null,
                    timezone: (_e = __classPrivateFieldGet(this, _ZoomClient_timezone, "f")) !== null && _e !== void 0 ? _e : null,
                    topic: (_f = options.name) !== null && _f !== void 0 ? _f : null,
                    settings: {
                        meeting_authentication: false,
                        host_video: true,
                        panelists_video: true,
                        hd_video: true,
                        auto_recording: (_g = options.recording) !== null && _g !== void 0 ? _g : "none",
                        approval_type: options.approval
                            ? registrationTypeToNumber(options.approval)
                            : null,
                        alternative_hosts: options.alterantiveHosts
                            ? options.alterantiveHosts.join()
                            : "",
                    },
                };
                try {
                    const res = yield this._zoom.patch(`/webinars/${params.id}/${params.occurrence_id
                        ? `?occurrence_id=${params.occurrence_id}`
                        : null}`, trimNullKeys(requestBody));
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
            }));
        });
    }
}
exports.default = ZoomClient;
_ZoomClient_token = new WeakMap(), _ZoomClient_apiKey = new WeakMap(), _ZoomClient_secretKey = new WeakMap(), _ZoomClient_timezone = new WeakMap(), _ZoomClient_user = new WeakMap();
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
function paginationWebinarParticipants(zoom, webinarID, nextPageToken, results) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!results) {
            results = [];
        }
        try {
            const response = yield zoom.get(`/report/webinars/${webinarID}/participants?page_size=300?nextPageToken=${nextPageToken}`);
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
    });
}
