import { categoryLabels } from "./record-constants";
import type { PreparedSharedCareInvite } from "./expansion-state";
import type { PetProfile, RecordEntry } from "./types";

export type ExpansionTone = "green" | "orange" | "red" | "blue";

export type SharedCareMember = {
  id: string;
  name: string;
  role: string;
  status: string;
  permission: string;
};

export type SharedCareSummary = {
  title: string;
  detail: string;
  members: SharedCareMember[];
  roleOptions: string[];
  activityItems: string[];
  notificationSharingDetail: string;
};

export type HospitalConnectSummary = {
  title: string;
  detail: string;
  warningRecords: RecordEntry[];
  reportPreview: string[];
  checklist: string[];
  shareNotice: string;
};

export type MapPosition = {
  x: number;
  y: number;
};

export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type NearbyAnimalHospital = {
  id: string;
  name: string;
  distanceLabel: string;
  etaLabel: string;
  addressHint: string;
  openLabel: string;
  tags: string[];
  mapPosition: MapPosition;
  mapCoordinate: MapCoordinate;
};

export type ShoppingRecommendation = {
  id: string;
  category: "사료" | "건강 용품" | "케어 용품" | "생활 용품";
  title: string;
  detail: string;
  reason: string;
  tone: ExpansionTone;
  product_url?: string;
  image_url?: string;
  mall_name?: string;
  lowest_price?: number;
  query?: string;
  source_record_ids?: string[];
};

const roleOptions = ["공동 보호자", "기록 담당", "읽기 전용"];


export function getSharedCareSummary(
  profile: PetProfile,
  records: RecordEntry[],
  preparedInvites: PreparedSharedCareInvite[] = [],
  notificationSharingEnabled = true,
): SharedCareSummary {
  const latestRecord = records[0];
  const latestActivity = latestRecord
    ? `${profile.name} ${categoryLabels[latestRecord.category]} 기록이 ${latestRecord.time}에 업데이트됨`
    : `${profile.name}의 첫 기록을 기다리는 중`;
  const inviteMembers = preparedInvites.map((invite) => ({
    id: invite.id,
    name: invite.target,
    role: invite.role,
    status: invite.status,
    permission: invite.role === "읽기 전용" ? "기록 보기" : invite.role === "기록 담당" ? "기록 작성 · 알림 받기" : "기록 보기 · 알림 받기",
  }));

  return {
    title: `${profile.name} 공동 관리`,
    detail: "가족이나 보호자에게 기록 확인, 일정 확인, 알림 공유 역할을 나눠줄 수 있는 UI 초안입니다.",
    members: [
      {
        id: "owner",
        name: "나",
        role: "주 보호자",
        status: "관리 중",
        permission: "전체 기록 · 일정 · 설정",
      },
      {
        id: "pending",
        name: "초대 대기",
        role: "공동 보호자",
        status: "목업 상태",
        permission: "기록 보기 · 알림 받기",
      },
      ...inviteMembers,
    ],
    roleOptions,
    activityItems: [
      latestActivity,
      notificationSharingEnabled ? "주의 기록과 일정 알림은 공동 보호자에게도 공유되도록 설정됨" : "공동 보호자 알림 공유가 꺼져 있음",
      preparedInvites.length > 0 ? `${preparedInvites[0].target} 초대가 ${preparedInvites[0].role} 역할로 준비됨` : "새 보호자 초대는 저장 후 목록에 유지됨",
      "역할 변경과 초대 수락 기록은 서버 연결 후 이력으로 저장 예정",
    ],
    notificationSharingDetail: notificationSharingEnabled
      ? "주의 기록, 기록 누락, 일정 리마인더 알림을 공동 보호자에게 함께 보여주는 흐름입니다."
      : "현재 공동 보호자 알림 공유가 꺼져 있으며, 기록 화면 공유만 유지됩니다.",
  };
}

export function getHospitalConnectSummary(profile: PetProfile, records: RecordEntry[], symptomMemo: string): HospitalConnectSummary {
  const warningRecords = records.filter((record) => record.status === "alert" || record.status === "notice").slice(0, 4);
  const recentRecords = records.slice(0, 3);
  const normalizedMemo = symptomMemo.trim();

  return {
    title: `${profile.name} 병원 상담 준비`,
    detail: "최근 주의 기록과 보호자 메모를 묶어 병원 상담 전 확인할 리포트 미리보기를 만듭니다.",
    warningRecords,
    reportPreview: [
      `${profile.name} · ${profile.breed} · ${profile.age} · ${profile.weight}`,
      `특이사항: ${profile.notes.length > 0 ? profile.notes.join(", ") : "등록된 특이사항 없음"}`,
      normalizedMemo ? `보호자 증상 메모: ${normalizedMemo}` : "보호자 증상 메모: 아직 입력되지 않음",
      `최근 기록: ${recentRecords.length > 0 ? recentRecords.map((record) => `${record.date} ${record.time} ${record.title}`).join(" / ") : "기록 없음"}`,
    ],
    checklist: ["최근 식사량 변화", "배변 상태 변화", "행동 변화 지속 시간", "복용 약 또는 접종 이력"],
    shareNotice: "현재는 병원 제출용 리포트 미리보기만 제공합니다. 병원 예약, 공유 링크, 전송 API는 제품화 단계에서 연결합니다.",
  };
}


export function getShoppingRecommendations(profile: PetProfile, records: RecordEntry[]): ShoppingRecommendation[] {
  const noteText = profile.notes.join(" ");
  const hasChickenNote = noteText.includes("닭고기");
  const hasBehaviorAlert = records.some((record) => record.category === "behavior" && record.status === "alert");
  const hasMealNotice = records.some((record) => record.category === "meal" && record.status !== "normal");
  const hasWalkNotice = records.some((record) => record.category === "walk" && record.status !== "normal");

  return [
    {
      id: "food-sensitive",
      category: "사료",
      title: hasChickenNote ? "닭고기 제외 사료 후보" : "최근 식사 기록 기반 사료 후보",
      detail: hasMealNotice ? "식사량이 흔들린 기록이 있어 급여량과 원료를 함께 확인하는 흐름입니다." : "현재 식사 기록을 기준으로 기본 사료 추천을 보여줍니다.",
      reason: hasChickenNote ? "프로필에 닭고기 알러지 의심 메모가 있어 원료 확인이 먼저 필요합니다." : "최근 식사 기록을 추천 근거로 사용합니다.",
      tone: hasMealNotice ? "orange" : "green",
    },
    {
      id: "walk-harness",
      category: "생활 용품",
      title: `${profile.breed} 산책 하네스`,
      detail: hasWalkNotice ? "산책 중 멈춤 기록이 있어 착용감과 체형 정보를 함께 확인합니다." : "산책 기록을 기반으로 기본 산책 용품 후보를 보여줍니다.",
      reason: `${profile.weight} 체중 정보를 기준으로 사이즈 확인이 필요합니다.`,
      tone: hasWalkNotice ? "orange" : "blue",
    },
    {
      id: "behavior-comfort",
      category: "케어 용품",
      title: "분리불안 완화 케어 후보",
      detail: hasBehaviorAlert ? "행동 주의 기록이 있어 외출 전후 안정 루틴에 맞는 용품 후보를 보여줍니다." : "행동 기록이 쌓이면 케어 용품 추천을 더 구체화합니다.",
      reason: "행동 기록과 프로필의 성향 메모를 추천 근거로 사용합니다.",
      tone: hasBehaviorAlert ? "red" : "blue",
    },
    {
      id: "health-basic",
      category: "건강 용품",
      title: "병원 상담 전 체크 용품",
      detail: "체중, 배변, 식사 변화를 이어서 기록하기 위한 기본 관리 용품 후보입니다.",
      reason: "병원 리포트와 함께 확인할 수 있는 생활 데이터 보강 목적입니다.",
      tone: "green",
    },
  ];
}

