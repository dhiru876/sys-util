// Telemetry disabled by user request.

export const ANALYTICS_EVENTS = {
  APP_STARTED: "app_started",
  GET_LICENSE: "get_license",
} as const;

export const captureEvent = async (
  _eventName: string,
  _properties?: Record<string, any>
) => {
  // Telemetry explicitly disabled.
};

export const trackAppStart = async (_appVersion: string, _instanceId: string) => {
  // Telemetry explicitly disabled.
};
