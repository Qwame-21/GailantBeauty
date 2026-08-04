type SecurityEvent =
  | "admin_login_failed"
  | "rate_limit_triggered"
  | "api_error";

type SafeContext = Record<string, string | number | boolean | null | undefined>;

export function securityLog(event: SecurityEvent, context: SafeContext = {}) {
  const safeContext = Object.fromEntries(
    Object.entries(context).filter(([key, value]) =>
      !/password|secret|token|authorization|email|phone|address|payload/i.test(key) && value !== undefined,
    ),
  );
  console.warn(JSON.stringify({ level: "warn", event, at: new Date().toISOString(), ...safeContext }));
}

export function logServerError(route: string, error: unknown) {
  securityLog("api_error", {
    route,
    error_type: error instanceof Error ? error.name : "UnknownError",
  });
}
