export const sharedCareRoles = ["공동 보호자", "기록 담당", "읽기 전용"] as const;
export type SharedCareRole = (typeof sharedCareRoles)[number];

export const hospitalLocationStatuses = ["idle", "loading", "ready", "blocked"] as const;
export type HospitalLocationStatus = (typeof hospitalLocationStatuses)[number];

export const shoppingFilters = ["전체", "사료", "건강 용품", "케어 용품", "생활 용품"] as const;
export type ShoppingFilter = (typeof shoppingFilters)[number];

export type PreparedSharedCareInvite = {
  id: string;
  target: string;
  role: SharedCareRole;
  status: "초대 준비";
};

export type SharedCareState = {
  inviteTarget: string;
  selectedRole: SharedCareRole;
  inviteDraftMessage: string;
  preparedInvites: PreparedSharedCareInvite[];
  notificationSharingEnabled: boolean;
};

export type HospitalState = {
  symptomMemo: string;
  locationStatus: HospitalLocationStatus;
  selectedHospitalId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  checkedChecklistItems: string[];
};

export type ShoppingState = {
  activeFilter: ShoppingFilter;
  expandedReasonId: string | null;
  savedRecommendationIds: string[];
};

export type ExpansionState = {
  sharedCare: SharedCareState;
  hospital: HospitalState;
  shopping: ShoppingState;
};

export const defaultExpansionState: ExpansionState = {
  sharedCare: {
    inviteTarget: "",
    selectedRole: "공동 보호자",
    inviteDraftMessage: "",
    preparedInvites: [],
    notificationSharingEnabled: true,
  },
  hospital: {
    symptomMemo: "",
    locationStatus: "idle",
    selectedHospitalId: undefined,
    currentLocation: undefined,
    checkedChecklistItems: [],
  },
  shopping: {
    activeFilter: "전체",
    expandedReasonId: null,
    savedRecommendationIds: [],
  },
};

export function createPreparedInvite(target: string, role: SharedCareRole, createdAt = Date.now()): PreparedSharedCareInvite {
  return {
    id: `invite-${createdAt}`,
    target: target.trim(),
    role,
    status: "초대 준비",
  };
}

export function toggleSavedRecommendation(currentIds: string[], recommendationId: string) {
  return currentIds.includes(recommendationId) ? currentIds.filter((id) => id !== recommendationId) : [...currentIds, recommendationId];
}

export function normalizeExpansionState(value: unknown): ExpansionState {
  if (!value || typeof value !== "object") {
    return defaultExpansionState;
  }

  const source = value as Partial<ExpansionState>;
  const sharedCare =
    source.sharedCare && typeof source.sharedCare === "object" ? (source.sharedCare as Partial<SharedCareState>) : {};
  const hospital = source.hospital && typeof source.hospital === "object" ? (source.hospital as Partial<HospitalState>) : {};
  const shopping = source.shopping && typeof source.shopping === "object" ? (source.shopping as Partial<ShoppingState>) : {};

  return {
    sharedCare: {
      inviteTarget: typeof sharedCare.inviteTarget === "string" ? sharedCare.inviteTarget : "",
      selectedRole: isSharedCareRole(sharedCare.selectedRole) ? sharedCare.selectedRole : "공동 보호자",
      inviteDraftMessage: typeof sharedCare.inviteDraftMessage === "string" ? sharedCare.inviteDraftMessage : "",
      preparedInvites: Array.isArray(sharedCare.preparedInvites) ? sharedCare.preparedInvites.filter(isPreparedInvite) : [],
      notificationSharingEnabled:
        typeof sharedCare.notificationSharingEnabled === "boolean" ? sharedCare.notificationSharingEnabled : true,
    },
    hospital: {
      symptomMemo: typeof hospital.symptomMemo === "string" ? hospital.symptomMemo : "",
      locationStatus: isHospitalLocationStatus(hospital.locationStatus) ? hospital.locationStatus : "idle",
      selectedHospitalId: typeof hospital.selectedHospitalId === "string" ? hospital.selectedHospitalId : undefined,
      currentLocation: isMapCoordinate(hospital.currentLocation) ? hospital.currentLocation : undefined,
      checkedChecklistItems: Array.isArray(hospital.checkedChecklistItems)
        ? hospital.checkedChecklistItems.filter((item): item is string => typeof item === "string")
        : [],
    },
    shopping: {
      activeFilter: isShoppingFilter(shopping.activeFilter) ? shopping.activeFilter : "전체",
      expandedReasonId: typeof shopping.expandedReasonId === "string" ? shopping.expandedReasonId : null,
      savedRecommendationIds: Array.isArray(shopping.savedRecommendationIds)
        ? shopping.savedRecommendationIds.filter((id): id is string => typeof id === "string")
        : [],
    },
  };
}

export function isExpansionState(value: unknown): value is ExpansionState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as ExpansionState;
  const normalized = normalizeExpansionState(value);

  return (
    state.sharedCare?.inviteTarget === normalized.sharedCare.inviteTarget &&
    state.sharedCare?.selectedRole === normalized.sharedCare.selectedRole &&
    state.sharedCare?.inviteDraftMessage === normalized.sharedCare.inviteDraftMessage &&
    state.sharedCare?.notificationSharingEnabled === normalized.sharedCare.notificationSharingEnabled &&
    areInvitesEqual(state.sharedCare?.preparedInvites, normalized.sharedCare.preparedInvites) &&
    state.hospital?.symptomMemo === normalized.hospital.symptomMemo &&
    state.hospital?.locationStatus === normalized.hospital.locationStatus &&
    state.hospital?.selectedHospitalId === normalized.hospital.selectedHospitalId &&
    areMapCoordinatesEqual(state.hospital?.currentLocation, normalized.hospital.currentLocation) &&
    areStringArraysEqual(state.hospital?.checkedChecklistItems, normalized.hospital.checkedChecklistItems) &&
    state.shopping?.activeFilter === normalized.shopping.activeFilter &&
    state.shopping?.expandedReasonId === normalized.shopping.expandedReasonId &&
    areStringArraysEqual(state.shopping?.savedRecommendationIds, normalized.shopping.savedRecommendationIds)
  );
}

function isSharedCareRole(value: unknown): value is SharedCareRole {
  return sharedCareRoles.includes(value as SharedCareRole);
}

function isHospitalLocationStatus(value: unknown): value is HospitalLocationStatus {
  return hospitalLocationStatuses.includes(value as HospitalLocationStatus);
}

function isMapCoordinate(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const coordinate = value as { lat?: unknown; lng?: unknown };
  return (
    typeof coordinate.lat === "number" &&
    Number.isFinite(coordinate.lat) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    typeof coordinate.lng === "number" &&
    Number.isFinite(coordinate.lng) &&
    coordinate.lng >= -180 &&
    coordinate.lng <= 180
  );
}

function isShoppingFilter(value: unknown): value is ShoppingFilter {
  return shoppingFilters.includes(value as ShoppingFilter);
}

function isPreparedInvite(value: unknown): value is PreparedSharedCareInvite {
  if (!value || typeof value !== "object") {
    return false;
  }

  const invite = value as PreparedSharedCareInvite;
  return typeof invite.id === "string" && typeof invite.target === "string" && isSharedCareRole(invite.role) && invite.status === "초대 준비";
}

function areStringArraysEqual(left: unknown, right: string[]) {
  return Array.isArray(left) && left.length === right.length && left.every((item, index) => item === right[index]);
}

function areMapCoordinatesEqual(left: unknown, right: { lat: number; lng: number } | undefined) {
  if (right === undefined) {
    return left === undefined;
  }
  return isMapCoordinate(left) && left.lat === right.lat && left.lng === right.lng;
}

function areInvitesEqual(left: unknown, right: PreparedSharedCareInvite[]) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((invite, index) => {
      const rightInvite = right[index];
      return (
        isPreparedInvite(invite) &&
        invite.id === rightInvite.id &&
        invite.target === rightInvite.target &&
        invite.role === rightInvite.role &&
        invite.status === rightInvite.status
      );
    })
  );
}
