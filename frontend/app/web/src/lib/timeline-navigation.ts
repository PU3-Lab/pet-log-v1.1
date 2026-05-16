import type { TimelineFilter } from "./timeline";

export const timelineFilterValues = ["all", "meal", "walk", "stool", "medical", "behavior"] as const satisfies readonly TimelineFilter[];

export function parseTimelineFilter(value: string | null): TimelineFilter {
  return timelineFilterValues.includes(value as TimelineFilter) ? (value as TimelineFilter) : "all";
}

export function getTimelineFilterHref(filter: TimelineFilter) {
  return `/timeline?filter=${filter}`;
}

export function getTimelineRecordHref(recordId: string) {
  return `/timeline?recordId=${encodeURIComponent(recordId)}`;
}
