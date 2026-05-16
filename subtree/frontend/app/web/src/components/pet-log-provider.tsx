"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createRecord as createRecordApi,
  createSchedule as createScheduleApi,
  deleteRecord as deleteRecordApi,
  deleteSchedule as deleteScheduleApi,
  fetchMe,
  fetchNotifications,
  fetchPets,
  fetchRecords,
  fetchSchedules,
  fetchAiInsights,
  fetchAiSuggestions,
  synthesizeSpeech,
  updateExpansionState as updateExpansionStateApi,
  updateProfile as updateProfileApi,
  updateReadNotifications,
  updateRecord as updateRecordApi,
  updateSchedule as updateScheduleApi,
  updateSettings as updateSettingsApi,
} from "@/lib/api-client";
import { defaultExpansionState, normalizeExpansionState } from "@/lib/expansion-state";
import {
  buildNotificationSpeechBatchText,
  getNewUnreadNotificationsForSpeech,
  isBrowserAudioAutoplayBlocked,
  isSpeechSynthesisBackendUnavailable,
} from "@/lib/notification-tts";
import { sortCareNotificationsByLatest } from "@/lib/notifications";
import { defaultAppSettings } from "@/lib/settings";
import type { ExpansionState, HospitalState, SharedCareState, ShoppingState } from "@/lib/expansion-state";
import type {
  AiInsight,
  AiSuggestion,
  AppSettings,
  CareNotification,
  CareSchedule,
  PetProfile,
  RecordCategoryChoice,
  RecordEntry,
  ScheduleCategory,
} from "@/lib/types";

type NewRecordInput = {
  category: RecordCategoryChoice;
  detail: string;
};

type UpdateRecordInput = {
  category: RecordCategoryChoice;
  detail: string;
};

type NewScheduleInput = {
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
};

type StoredPetLogState = {
  version: 1;
  profile: PetProfile;
  records: RecordEntry[];
  schedules?: CareSchedule[];
  settings?: AppSettings;
  readNotificationIds?: string[];
  expansionState?: ExpansionState;
};

type PetLogContextValue = {
  profile: PetProfile;
  records: RecordEntry[];
  schedules: CareSchedule[];
  settings: AppSettings;
  notifications: CareNotification[];
  readNotificationIds: string[];
  expansionState: ExpansionState;
  insights: AiInsight[];
  suggestions: AiSuggestion[];
  isLoading: boolean;
  isAnalysisLoading: boolean;
  error: string;
  syncStatus: "idle" | "synced" | "offline" | "error";
  addRecord: (input: NewRecordInput) => Promise<RecordEntry>;
  updateRecord: (id: string, input: UpdateRecordInput) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  updateProfile: (input: PetProfile) => Promise<PetProfile>;
  updateSettings: (input: AppSettings) => Promise<void>;
  updateSharedCareState: (input: Partial<SharedCareState>) => Promise<void>;
  updateHospitalState: (input: Partial<HospitalState>) => Promise<void>;
  updateShoppingState: (input: Partial<ShoppingState>) => Promise<void>;
  resetPetLogData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (ids: string[]) => Promise<void>;
  addSchedule: (input: NewScheduleInput) => Promise<CareSchedule>;
  toggleScheduleDone: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  refreshAnalysis: (petId: string) => Promise<void>;
};

const storageKey = "pet-log-state-v1";
const PetLogContext = createContext<PetLogContextValue | null>(null);

const emptyProfile: PetProfile = {
  name: "",
  breed: "",
  age: "",
  sex: "",
  weight: "",
  birthday: "",
  personality: "",
  notes: [],
};

function createLocalSchedule(input: NewScheduleInput, createdAt = new Date()): CareSchedule {
  return {
    id: `schedule-${createdAt.getTime()}`,
    category: input.category,
    title: input.title.trim(),
    dueDate: input.dueDate,
    repeatLabel: input.repeatLabel.trim() || "한 번",
    note: input.note.trim(),
    isDone: false,
  };
}

export function PetLogProvider({ children }: { children: ReactNode }) {
  console.log("[provider] 초기화 시작 → 클라이언트 fetch 예정");
  const [profile, setProfile] = useState<PetProfile>(emptyProfile);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [schedules, setSchedules] = useState<CareSchedule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [notifications, setNotifications] = useState<CareNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [expansionState, setExpansionState] = useState<ExpansionState>(
    normalizeExpansionState(undefined),
  );
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [error, setError] = useState("API 연결에 실패했습니다. 서버 연결을 확인해주세요.");
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced" | "offline" | "error">(
    "error",
  );
  const hasCompletedInitialNotificationLoadRef = useRef(false);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const notificationTtsQueueRef = useRef<CareNotification[]>([]);
  const isPlayingNotificationTtsRef = useRef(false);
  const notificationTtsRetryAbortControllerRef = useRef<AbortController | null>(null);
  const playQueuedNotificationTtsRef = useRef<() => Promise<void>>(async () => {});
  const spokenNotificationIdsRef = useRef<Set<string>>(new Set());

  const playAudioBlob = useCallback(async (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    try {
      const audio = new Audio(audioUrl);
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener("ended", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("Notification TTS playback failed")), { once: true });
        audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(audioUrl);
    }
  }, []);

  const playBrowserSpeechText = useCallback(async (text: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      throw new Error("Browser speech synthesis is not available");
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";

    await new Promise<void>((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        const error = new Error(`Browser speech synthesis failed: ${event.error}`);
        if (event.error === "not-allowed") {
          error.name = "NotAllowedError";
        }
        reject(error);
      };
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const markNotificationSpoken = useCallback((id: string) => {
    const nextSpokenIds = new Set(spokenNotificationIdsRef.current);
    nextSpokenIds.add(id);
    spokenNotificationIdsRef.current = nextSpokenIds;
  }, []);

  const scheduleNotificationTtsRetryOnUserGesture = useCallback(() => {
    if (notificationTtsRetryAbortControllerRef.current) {
      return;
    }

    const controller = new AbortController();
    notificationTtsRetryAbortControllerRef.current = controller;
    const retry = () => {
      notificationTtsRetryAbortControllerRef.current = null;
      controller.abort();
      void playQueuedNotificationTtsRef.current();
    };

    window.addEventListener("pointerdown", retry, { once: true, signal: controller.signal });
    window.addEventListener("keydown", retry, { once: true, signal: controller.signal });
  }, []);

  const requeueNotificationTtsAfterUserGesture = useCallback((notifications: CareNotification[]) => {
    notificationTtsQueueRef.current = [...notifications, ...notificationTtsQueueRef.current];
    scheduleNotificationTtsRetryOnUserGesture();
  }, [scheduleNotificationTtsRetryOnUserGesture]);

  const playQueuedNotificationTts = useCallback(async () => {
    if (isPlayingNotificationTtsRef.current) {
      return;
    }

    isPlayingNotificationTtsRef.current = true;
    try {
      let queuedNotifications = notificationTtsQueueRef.current;
      notificationTtsQueueRef.current = [];
      while (queuedNotifications.length > 0) {
        const notificationsToSpeak = queuedNotifications.filter(
          (notification) => !spokenNotificationIdsRef.current.has(notification.id) && !notification.isRead,
        );
        if (notificationsToSpeak.length > 0) {
          const text = buildNotificationSpeechBatchText(notificationsToSpeak);
          try {
            console.info("[provider] 알림 TTS 백엔드 합성 호출", {
              notificationIds: notificationsToSpeak.map((notification) => notification.id),
              textLength: text.length,
            });
            const audioBlob = await synthesizeSpeech(text);
            await playAudioBlob(audioBlob);
            notificationsToSpeak.forEach((notification) => markNotificationSpoken(notification.id));
          } catch (backendSpeechErr) {
            if (isBrowserAudioAutoplayBlocked(backendSpeechErr)) {
              requeueNotificationTtsAfterUserGesture(notificationsToSpeak);
              break;
            }

            if (isSpeechSynthesisBackendUnavailable(backendSpeechErr)) {
              try {
                await playBrowserSpeechText(text);
                notificationsToSpeak.forEach((notification) => markNotificationSpoken(notification.id));
                continue;
              } catch (browserSpeechErr) {
                if (isBrowserAudioAutoplayBlocked(browserSpeechErr)) {
                  requeueNotificationTtsAfterUserGesture(notificationsToSpeak);
                  break;
                }
                console.error("[provider] 브라우저 알림 TTS 재생 실패:", browserSpeechErr);
              }
            }
            console.error("[provider] 알림 TTS 재생 실패:", backendSpeechErr);
          }
        }
        queuedNotifications = notificationTtsQueueRef.current;
        notificationTtsQueueRef.current = [];
      }
    } finally {
      isPlayingNotificationTtsRef.current = false;
    }
  }, [markNotificationSpoken, playAudioBlob, playBrowserSpeechText, requeueNotificationTtsAfterUserGesture]);

  useEffect(() => {
    playQueuedNotificationTtsRef.current = playQueuedNotificationTts;
  }, [playQueuedNotificationTts]);

  useEffect(() => {
    return () => {
      notificationTtsRetryAbortControllerRef.current?.abort();
      notificationTtsRetryAbortControllerRef.current = null;
    };
  }, []);

  const refreshAnalysis = useCallback(async (petId: string) => {
    setIsAnalysisLoading(true);
    try {
      const [insightsData, suggestionsData] = await Promise.all([
        fetchAiInsights(petId),
        fetchAiSuggestions(petId),
      ]);
      setInsights(insightsData.insights);
      setSuggestions(suggestionsData.suggestions);
    } catch (err) {
      console.error("[provider] AI 분석 갱신 실패:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      setIsLoading(true);
      try {
        console.log("[provider] 개별 API 병렬 로딩 시작");
        
        // 1. 유저 정보와 반려동물 목록을 먼저 가져옴
        const [, { pets }] = await Promise.all([
          fetchMe(),
          fetchPets()
        ]);
        
        if (cancelled) return;

        const activePet = pets[0];
        if (!activePet) {
          console.log("[provider] 등록된 반려동물이 없어 빈 상태로 시작합니다.");
          setProfile(emptyProfile);
          setRecords([]);
          setSchedules([]);
          setSettings(defaultAppSettings);
          setReadNotificationIds([]);
          setExpansionState(defaultExpansionState);
          setInsights([]);
          setSuggestions([]);
          setError("반려동물을 등록하면 기록을 시작할 수 있습니다.");
          setSyncStatus("synced");
          setIsStorageReady(true);
          setIsLoading(false);
          return;
        }

        // 2. 해당 반려동물의 상세 데이터들을 병렬로 가져옴
        const [recordsData, schedulesData, notificationsData] = await Promise.all([
          fetchRecords(activePet.id),
          fetchSchedules(activePet.id),
          fetchNotifications(activePet.id)
        ]);

        if (cancelled) return;

        console.log(`[provider] 로딩 완료: pet=${activePet.name}, records=${recordsData.records.length}, schedules=${schedulesData.schedules.length}`);

        // 3. 상태 업데이트
        setProfile(activePet);
        setRecords(recordsData.records);
        setSchedules(schedulesData.schedules);
        
        // 설정과 확장 UI 상태는 아직 서버 저장 API가 없어 기본값으로 초기화한다.
        setSettings(defaultAppSettings);
        setNotifications(sortCareNotificationsByLatest(notificationsData.notifications ?? []));
        setReadNotificationIds(notificationsData.readNotificationIds ?? []);
        setExpansionState(defaultExpansionState);

        // 4. AI 분석 초기 데이터 로드
        void refreshAnalysis(activePet.id);

        setError("");
        setSyncStatus("synced");
        setIsStorageReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error("[provider] 로딩 실패:", err);
        if (cancelled) return;
        
        setError("데이터를 불러오지 못했습니다. 서버 연결을 확인해주세요.");
        setSyncStatus("error");
        setIsLoading(false);
      }
    }

    void loadInitialState().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [refreshAnalysis]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    const currentNotificationIds = notifications.map((notification) => notification.id);
    const pendingNotifications = getNewUnreadNotificationsForSpeech({
      hasCompletedInitialLoad: hasCompletedInitialNotificationLoadRef.current,
      knownNotificationIds: [...knownNotificationIdsRef.current],
      notifications,
      spokenNotificationIds: [...spokenNotificationIdsRef.current],
    });

    knownNotificationIdsRef.current = new Set(currentNotificationIds);
    if (!hasCompletedInitialNotificationLoadRef.current) {
      hasCompletedInitialNotificationLoadRef.current = true;
    }
    if (pendingNotifications.length === 0) {
      return;
    }

    const queuedIds = new Set(notificationTtsQueueRef.current.map((notification) => notification.id));
    notificationTtsQueueRef.current = [
      ...notificationTtsQueueRef.current,
      ...pendingNotifications.filter((notification) => !queuedIds.has(notification.id)),
    ];
    void playQueuedNotificationTts();
  }, [isStorageReady, notifications, playQueuedNotificationTts]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    const state: StoredPetLogState = {
      version: 1,
      profile,
      records,
      schedules,
      settings,
      readNotificationIds,
      expansionState,
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // 저장소 사용이 막힌 환경에서는 현재 세션 상태만 유지합니다.
    }
  }, [isStorageReady, profile, records, schedules, settings, readNotificationIds, expansionState]);

  const refreshNotifications = useCallback(async (petId?: string) => {
    const targetPetId = petId ?? profile.id;
    if (!targetPetId) {
      return;
    }

    try {
      const notificationsData = await fetchNotifications(targetPetId);
      setNotifications(sortCareNotificationsByLatest(notificationsData.notifications ?? []));
      setReadNotificationIds(notificationsData.readNotificationIds ?? []);
    } catch (err) {
      console.error("[provider] 알림 갱신 실패:", err);
    }
  }, [profile.id]);

  const addRecord = useCallback(async (input: NewRecordInput) => {
    try {
      const { records } = await createRecordApi(input);
      const firstRecord = records[0];
      if (!firstRecord) {
        throw new Error("저장된 기록이 없습니다.");
      }
      setRecords((current) => [...records, ...current]);

      // 분석 데이터 갱신 (비동기)
      if (profile.id) {
        void refreshAnalysis(profile.id);
        void refreshNotifications(profile.id);
      }

      setError("");
      setSyncStatus("synced");
      return firstRecord;
    } catch {
      setError("API 저장에 실패했습니다.");
      setSyncStatus("error");
      throw new Error("API 저장에 실패했습니다.");
    }
  }, [profile.id, refreshAnalysis, refreshNotifications]);

  const updateRecord = useCallback(async (id: string, input: UpdateRecordInput) => {
    try {
      const { record } = await updateRecordApi(id, input);
      setRecords((current) => current.map((item) => (item.id === id ? record : item)));

      // 분석 데이터 갱신 (비동기)
      if (profile.id) {
        void refreshAnalysis(profile.id);
        void refreshNotifications(profile.id);
      }

      setError("");
      setSyncStatus("synced");
    } catch {
      setError("API 수정에 실패해 이전 기록으로 되돌렸습니다.");
      setSyncStatus("offline");
    }
  }, [profile.id, refreshAnalysis, refreshNotifications]);

  const deleteRecord = useCallback(async (id: string) => {
    const previousRecords = records;
    setRecords((current) => current.filter((record) => record.id !== id));

    try {
      await deleteRecordApi(id);

      // 분석 데이터 갱신 (비동기)
      if (profile.id) {
        void refreshAnalysis(profile.id);
        void refreshNotifications(profile.id);
      }

      setError("");
      setSyncStatus("synced");
    } catch {
      setRecords(previousRecords);
      setError("API 삭제에 실패해 이전 기록으로 되돌렸습니다.");
      setSyncStatus("offline");
    }
  }, [profile.id, records, refreshAnalysis, refreshNotifications]);

  const updateProfile = useCallback(async (input: PetProfile) => {
    const nextProfile = {
      ...input,
      notes: input.notes.map((note) => note.trim()).filter(Boolean),
      photoDataUrl: input.photoDataUrl || undefined,
    };
    const previousProfile = profile;
    setProfile(nextProfile);

    try {
      const { profile } = await updateProfileApi(nextProfile);
      setProfile(profile);
      setError("");
      setSyncStatus("synced");
      return profile;
    } catch {
      setProfile(previousProfile);
      setError("API 프로필 저장에 실패했습니다.");
      setSyncStatus("offline");
      return previousProfile;
    }
  }, [profile]);

  const updateSettings = useCallback(async (input: AppSettings) => {
    const nextSettings = {
      notificationPreferences: {
        missingRecord: input.notificationPreferences.missingRecord,
        alert: input.notificationPreferences.alert,
        schedule: input.notificationPreferences.schedule,
      },
      aiInsightEnabled: input.aiInsightEnabled,
    };
    const previousSettings = settings;
    setSettings(nextSettings);

    try {
      const { settings } = await updateSettingsApi(nextSettings);
      setSettings(settings);
      setError("");
      setSyncStatus("synced");
    } catch {
      setSettings(previousSettings);
      setError("API 설정 저장에 실패했습니다.");
      setSyncStatus("offline");
    }
  }, [settings]);

  const persistExpansionState = useCallback(async (nextState: ExpansionState, previousState: ExpansionState) => {
    try {
      const { expansionState } = await updateExpansionStateApi(nextState);
      setExpansionState(expansionState);
      setError("");
      setSyncStatus("synced");
    } catch {
      setExpansionState(previousState);
      setError("API 확장 상태 저장에 실패했습니다.");
      setSyncStatus("offline");
    }
  }, []);

  const updateSharedCareState = useCallback(async (input: Partial<SharedCareState>) => {
    const previousState = expansionState;
    const nextState = normalizeExpansionState({
      ...expansionState,
      sharedCare: {
        ...expansionState.sharedCare,
        ...input,
      },
    });
    setExpansionState(nextState);
    await persistExpansionState(nextState, previousState);
  }, [expansionState, persistExpansionState]);

  const updateHospitalState = useCallback(async (input: Partial<HospitalState>) => {
    const previousState = expansionState;
    const nextState = normalizeExpansionState({
      ...expansionState,
      hospital: {
        ...expansionState.hospital,
        ...input,
      },
    });
    setExpansionState(nextState);
    await persistExpansionState(nextState, previousState);
  }, [expansionState, persistExpansionState]);

  const updateShoppingState = useCallback(async (input: Partial<ShoppingState>) => {
    const previousState = expansionState;
    const nextState = normalizeExpansionState({
      ...expansionState,
      shopping: {
        ...expansionState.shopping,
        ...input,
      },
    });
    setExpansionState(nextState);
    await persistExpansionState(nextState, previousState);
  }, [expansionState, persistExpansionState]);

  const resetPetLogData = useCallback(async () => {
    try {
      // 실제 프로덕션에서는 서버 측 초기화 API 호출 후 다시 불러온다.
      console.log("[provider] 데이터 리로딩 시작");
      const [, { pets }] = await Promise.all([fetchMe(), fetchPets()]);
      const activePet = pets[0];
      if (activePet) {
        const [recordsData, schedulesData, notificationsData] = await Promise.all([
          fetchRecords(activePet.id),
          fetchSchedules(activePet.id),
          fetchNotifications(activePet.id)
        ]);
        setProfile(activePet);
        setRecords(recordsData.records);
        setSchedules(schedulesData.schedules);
        setNotifications(sortCareNotificationsByLatest(notificationsData.notifications ?? []));
        setReadNotificationIds(notificationsData.readNotificationIds ?? []);
      }
      setError("");
      setSyncStatus("synced");
    } catch {
      setError("데이터 초기화에 실패했습니다. 서버 연결을 확인해주세요.");
      setSyncStatus("error");
    }
  }, []);

  const persistReadNotificationIds = useCallback(async (ids: string[]) => {
    if (!profile.id) return;
    try {
      const response = await updateReadNotifications(profile.id, ids);
      setReadNotificationIds(response.readNotificationIds);
      setError("");
      setSyncStatus("synced");
    } catch {
      setError("API 알림 읽음 저장에 실패했습니다.");
      setSyncStatus("offline");
    }
  }, [profile.id]);

  const markNotificationRead = useCallback(async (id: string) => {
    const nextIds = readNotificationIds.includes(id) ? readNotificationIds : [...readNotificationIds, id];
    setReadNotificationIds(nextIds);
    setNotifications((current) => current.map((n) => n.id === id ? { ...n, isRead: true } : n));
    await persistReadNotificationIds(nextIds);
  }, [persistReadNotificationIds, readNotificationIds]);

  const markAllNotificationsRead = useCallback(async (ids: string[]) => {
    const nextIds = Array.from(new Set([...readNotificationIds, ...ids]));
    setReadNotificationIds(nextIds);
    setNotifications((current) => current.map((n) => ids.includes(n.id) ? { ...n, isRead: true } : n));
    await persistReadNotificationIds(nextIds);
  }, [persistReadNotificationIds, readNotificationIds]);

  const addSchedule = useCallback(async (input: NewScheduleInput) => {
    const fallbackSchedule = createLocalSchedule(input);
    setSchedules((current) => [fallbackSchedule, ...current]);

    try {
      const { schedule } = await createScheduleApi(input);
      setSchedules((current) => current.map((item) => (item.id === fallbackSchedule.id ? schedule : item)));
      if (profile.id) {
        void refreshNotifications(profile.id);
      }
      setError("");
      setSyncStatus("synced");
      return schedule;
    } catch {
      setError("API 일정 저장에 실패해 로컬 일정으로 유지했습니다.");
      setSyncStatus("offline");
      return fallbackSchedule;
    }
  }, [profile.id, refreshNotifications]);

  const toggleScheduleDone = useCallback(async (id: string) => {
    const targetSchedule = schedules.find((schedule) => schedule.id === id);
    if (!targetSchedule) {
      return;
    }

    const previousSchedules = schedules;
    const nextDone = !targetSchedule.isDone;
    setSchedules((current) => current.map((schedule) => (schedule.id === id ? { ...schedule, isDone: nextDone } : schedule)));

    try {
      const { schedule } = await updateScheduleApi(id, { isDone: nextDone });
      setSchedules((current) => current.map((item) => (item.id === id ? schedule : item)));
      if (profile.id) {
        void refreshNotifications(profile.id);
      }
      setError("");
      setSyncStatus("synced");
    } catch {
      setSchedules(previousSchedules);
      setError("API 일정 수정에 실패했습니다.");
      setSyncStatus("offline");
    }
  }, [profile.id, refreshNotifications, schedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    const previousSchedules = schedules;
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));

    try {
      await deleteScheduleApi(id);
      if (profile.id) {
        void refreshNotifications(profile.id);
      }
      setError("");
      setSyncStatus("synced");
    } catch {
      setSchedules(previousSchedules);
      setError("API 일정 삭제에 실패했습니다.");
      setSyncStatus("offline");
    }
  }, [profile.id, refreshNotifications, schedules]);

  const value = useMemo(
    () => ({
      profile,
      records,
      schedules,
      settings,
      notifications,
      readNotificationIds,
      expansionState,
      insights,
      suggestions,
      isLoading,
      isAnalysisLoading,
      error,
      syncStatus,
      addRecord,
      updateRecord,
      deleteRecord,
      updateProfile,
      updateSettings,
      updateSharedCareState,
      updateHospitalState,
      updateShoppingState,
      resetPetLogData,
      markNotificationRead,
      markAllNotificationsRead,
      addSchedule,
      toggleScheduleDone,
      deleteSchedule,
      refreshAnalysis,
    }),
    [
      profile,
      records,
      schedules,
      settings,
      notifications,
      readNotificationIds,
      expansionState,
      insights,
      suggestions,
      isLoading,
      isAnalysisLoading,
      error,
      syncStatus,
      addRecord,
      updateRecord,
      deleteRecord,
      updateProfile,
      updateSettings,
      updateSharedCareState,
      updateHospitalState,
      updateShoppingState,
      resetPetLogData,
      markNotificationRead,
      markAllNotificationsRead,
      addSchedule,
      toggleScheduleDone,
      deleteSchedule,
      refreshAnalysis,
    ],
  );

  return <PetLogContext.Provider value={value}>{children}</PetLogContext.Provider>;
}

export function usePetLog() {
  const context = useContext(PetLogContext);
  if (!context) {
    throw new Error("usePetLog must be used within PetLogProvider");
  }
  return context;
}
