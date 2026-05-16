from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

DEFAULT_ACTION_HREF = "/record"

VALID_ACTION_ROUTES = frozenset(
    {
        "/analysis",
        "/community",
        "/dashboard",
        "/hospital",
        "/notifications",
        "/record",
        "/schedule",
        "/settings",
        "/shopping",
        "/timeline",
    }
)

ACTION_ROUTE_ALIASES = {
    "/calendar": "/schedule",
    "/hospital-recommendations": "/hospital",
    "/hospitals": "/hospital",
    "/products": "/shopping",
    "/schedules": "/schedule",
    "/shop": "/shopping",
}


def normalize_action_href(href: str | None, fallback: str | None = DEFAULT_ACTION_HREF) -> str | None:
    if href is None:
        return fallback

    stripped = href.strip()
    if not stripped or not stripped.startswith("/") or stripped.startswith("//"):
        return fallback

    parsed = urlsplit(stripped)
    if parsed.scheme or parsed.netloc:
        return fallback

    path = ACTION_ROUTE_ALIASES.get(parsed.path, parsed.path)
    if path not in VALID_ACTION_ROUTES:
        return fallback

    return urlunsplit(("", "", path, parsed.query, parsed.fragment))
