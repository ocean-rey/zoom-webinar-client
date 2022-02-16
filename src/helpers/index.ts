import { Approval, Recurrence, DayOfWeek } from "../..";

// note that this function rounds up. ie: an hour and a half becomes 2 hours.
export function hoursBetweenDates(a: Date, b: Date) {
  const aInMs = a.getDate();
  const bInMs = b.getDate();
  const deltaMs = Math.abs(aInMs - bInMs);
  const deltaHours = Math.ceil(deltaMs / 3.6e6); // didn't know this notation works. neat
  return deltaHours;
}

export function registrationTypeToNumber(registrationType?: Approval) {
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
export function recurrenceTypeToCode(type: Recurrence) {
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

export function weekdaysToCode(day: DayOfWeek) {
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