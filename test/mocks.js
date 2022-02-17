export const singleWebinarResponse = {
  data: {
    uuid: "string",
    id: "integer",
    host_id: "string",
    topic: "string",
    type: "integer",
    start_time: "string [date-time]",
    duration: "integer",
    timezone: "string",
    agenda: "string",
    created_at: "string [date-time]",
    start_url: "string",
    join_url: "string",
    occurrences: [
      {
        occurrence_id: "integer",
        start_time: "string [date-time]",
        duration: "integer",
        status: "string",
      },
    ],
    settings: {
      host_video: "boolean",
      panelists_video: "boolean",
      practice_session: "boolean",
      hd_video: "boolean",
      hd_video_for_attendees: "boolean",
      send_1080p_video_to_attendees: "boolean",
      approval_type: "integer",
      registration_type: "integer",
      audio: "string",
      auto_recording: "string",
      enforce_login: "boolean",
      enforce_login_domains: "string",
      alternative_hosts: "string",
      close_registration: "boolean",
      show_share_button: "boolean",
      allow_multiple_devices: "boolean",
      email_language: "string",
      panelists_invitation_email_notification: "boolean",
      registrants_confirmation_email: "boolean",
      registrants_email_notification: "boolean",
      attendees_and_panelists_reminder_email_notification: {
        enable: "boolean",
        type: "integer",
      },
      follow_up_attendees_email_notification: {
        enable: "boolean",
        type: "integer",
      },
      follow_up_absentees_email_notification: {
        enable: "boolean",
        type: "integer",
      },
    },
  },
};
