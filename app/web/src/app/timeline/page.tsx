import { TimelineClient } from "./timeline-client";
import { parseTimelineFilter } from "@/lib/timeline-navigation";

type TimelinePageSearchParams = Record<string, string | string[] | undefined>;

type TimelinePageProps = {
  searchParams?: Promise<TimelinePageSearchParams>;
};

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const params = await searchParams;
  const requestedRecordId = getSearchValue(params?.recordId);
  const initialFilter = requestedRecordId ? "all" : parseTimelineFilter(getSearchValue(params?.filter));

  return <TimelineClient initialFilter={initialFilter} requestedRecordId={requestedRecordId} />;
}
