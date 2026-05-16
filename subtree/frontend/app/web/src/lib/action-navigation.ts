const routeAliases: Record<string, string> = {
  "/calendar": "/schedule",
  "/hospital-recommendations": "/hospital",
  "/hospitals": "/hospital",
  "/products": "/shopping",
  "/schedules": "/schedule",
  "/shop": "/shopping",
};

const validCareRoutes = new Set([
  "/",
  "/analysis",
  "/community",
  "/hospital",
  "/more",
  "/notifications",
  "/profile",
  "/record",
  "/schedule",
  "/settings",
  "/shared-care",
  "/shopping",
  "/suggestions",
  "/timeline",
]);

type CareActionSource = {
  action?: string;
  actionHref?: string | null;
  category?: string;
  detail?: string;
  reason?: string;
  title?: string;
};

export function normalizeCareActionHref(href: string | null | undefined, fallbackHref = "/record") {
  const trimmedHref = href?.trim();
  if (!trimmedHref || !trimmedHref.startsWith("/") || trimmedHref.startsWith("//")) {
    return fallbackHref;
  }

  const [, pathname = trimmedHref, suffix = ""] = trimmedHref.match(/^([^?#]*)([?#].*)?$/) ?? [];
  const normalizedPathname = routeAliases[pathname] ?? pathname;

  if (!validCareRoutes.has(normalizedPathname)) {
    return fallbackHref;
  }

  return `${normalizedPathname}${suffix}`;
}

export function getCareActionHref(actionHref: string | null | undefined, fallbackHref = "/record") {
  return normalizeCareActionHref(actionHref, fallbackHref);
}

export function getCareSuggestionHref(suggestion: CareActionSource, fallbackHref = "/record") {
  return getCareActionHref(suggestion.actionHref, fallbackHref);
}

export function getCareNotificationHref(notification: CareActionSource, fallbackHref = "/record") {
  return getCareActionHref(notification.actionHref, fallbackHref);
}
