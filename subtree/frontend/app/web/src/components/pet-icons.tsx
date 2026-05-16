type PetIconProps = {
	name:
		| "home"
		| "record"
		| "analysis"
		| "suggestions"
		| "profile"
		| "community"
		| "more"
		| "bell"
		| "back"
		| "plus"
		| "timeline"
		| "schedule"
		| "settings"
		| "shared"
		| "hospital"
		| "shopping"
		| "chat"
		| "question"
		| "send"
		| "mic"
		| "close"
		| "heart"
		| "bookmark"
		| "syringe"
		| "meal"
		| "walk"
		| "stool"
		| "medical"
		| "behavior"
		| "sparkle"
		| "check"
		| "alert"
		| "activity";
  className?: string;
};

const iconPaths: Record<PetIconProps["name"], string> = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z",
  record: "M7 4h10a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1Zm3 5h4M10 13h4",
  analysis: "M5 19V9m7 10V5m7 14v-7",
  suggestions: "M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3Zm-2 18h4",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  community: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0m-2-2a5 5 0 0 1 10 0",
  more: "M6 12h.01M12 12h.01M18 12h.01",
	bell: "M18 16H6l2-2v-4a4 4 0 0 1 8 0v4l2 2Zm-8 3h4",
	back: "M15 18 9 12l6-6",
	plus: "M12 5v14M5 12h14",
	timeline: "M6 5v14M10 7h8M10 12h6M10 17h8M6 7h.01M6 12h.01M6 17h.01",
	schedule: "M7 4v3m10-3v3M5 9h14M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm4 7 2 2 4-5",
	settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M4.9 4.9 7 7m10 10 2.1 2.1M3 12h3m12 0h3M4.9 19.1 7 17m10-10 2.1-2.1",
	shared: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0m-1-3a5 5 0 0 1 9 3",
		hospital: "M12 5v14M5 12h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
		shopping: "M6 8h12l-1 12H7L6 8Zm3 0a3 3 0 0 1 6 0",
		chat: "M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm3 5h.01M12 11h.01M16 11h.01",
		question: "M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9.7-1.4 1.1-1.4 2.4M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
		send: "M4 12 20 4l-4 16-4-7-8-1Z",
		mic: "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 19v3m-4 0h8",
		close: "M6 6l12 12M18 6 6 18",
		heart: "M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6Z",
		bookmark: "M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1Z",
		syringe: "M18 3l3 3M11 10l7-7 3 3-7 7M4 20l6-6M6 18l-2 2M9 15l-4-4 6-6 4 4",
		meal: "M6 3v7m4-7v7M6 10h4m-2 0v11m8-18v18m0-18c2.2 1.4 3.5 3.6 3.5 6.5 0 2.2-1.3 4-3.5 4",
		walk: "M9 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.5 6.5 2 2.5 3 1M7 9l4 2 2 4 3 6M11 11l-3 4-4 1",
		stool: "M7 17h10M6 20h12M9 14h6a3 3 0 0 0-3-3 3 3 0 0 0-3 3Zm2-3a3 3 0 0 1 3-5 3 3 0 0 1 3 5",
		medical: "M12 5v14M5 12h14M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
		behavior: "M4 14c2.5-5 5.5-5 8 0 2.5-5 5.5-5 8 0M7 17c3.2 2.5 6.8 2.5 10 0M8 10h.01M16 10h.01",
		sparkle: "M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14ZM5 4l.8 2.2L8 7l-2.2.8L5 10l-.8-2.2L2 7l2.2-.8L5 4Z",
		check: "M5 12.5 10 17l9-10",
		alert: "M12 8v5m0 4h.01M10.3 4.7 2.9 17.5A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.5L13.7 4.7a2 2 0 0 0-3.4 0Z",
		activity: "M4 12h4l2-6 4 12 2-6h4",
	};

export function PetIcon({ name, className }: PetIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
