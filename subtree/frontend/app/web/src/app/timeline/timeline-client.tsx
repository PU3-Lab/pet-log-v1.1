"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, CategoryBadge, Pill, SectionHeader } from "@/components/ui";
import { categoryLabels } from "@/lib/record-constants";
import { getRecordCategoryChoiceLabel, recordCategoryChoiceOptions } from "@/lib/record-input";
import {
  getTimelineDates,
  getTimelineDetail,
  getTimelineEditCategory,
  getTimelineRecords,
  getTimelineSummary,
  type TimelineFilter,
} from "@/lib/timeline";
import type { RecordCategory, RecordCategoryChoice, RecordEntry, RecordStatus } from "@/lib/types";

const timelineFilters: { label: string; value: TimelineFilter }[] = [
  { label: "전체", value: "all" },
  { label: "식사", value: "meal" },
  { label: "산책", value: "walk" },
  { label: "배변", value: "stool" },
  { label: "병원/약", value: "medical" },
  { label: "행동", value: "behavior" },
];

const timelineFilterIcons: Record<TimelineFilter, "timeline" | RecordCategory> = {
  all: "timeline",
  meal: "meal",
  walk: "walk",
  stool: "stool",
  medical: "medical",
  behavior: "behavior",
};

const statusText: Record<RecordStatus, string> = {
  normal: "text-[#16804b]",
  notice: "text-[#bb721e]",
  alert: "text-[#be4c3c]",
};

type TimelineClientProps = {
  initialFilter: TimelineFilter;
  requestedRecordId: string | null;
};

export function TimelineClient({ initialFilter, requestedRecordId }: TimelineClientProps) {
  const { deleteRecord, records, updateRecord } = usePetLog();
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>(initialFilter);
  const [activeDateIndexOverride, setActiveDateIndexOverride] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(requestedRecordId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<RecordCategoryChoice>("meal");
  const [editingDetail, setEditingDetail] = useState("");
  const [editingError, setEditingError] = useState("");

  const timelineDates = useMemo(() => getTimelineDates(records), [records]);
  const requestedRecord = useMemo(
    () => records.find((record) => record.id === requestedRecordId) ?? null,
    [records, requestedRecordId],
  );
  const requestedDateIndex = requestedRecord ? timelineDates.indexOf(requestedRecord.date) : -1;
  const activeDateIndex = activeDateIndexOverride ?? (requestedDateIndex >= 0 ? requestedDateIndex : 0);
  const activeDate = timelineDates[activeDateIndex] ?? timelineDates[0];
  const dateSummary = useMemo(() => getTimelineSummary(records, activeDate), [activeDate, records]);
  const filteredRecords = useMemo(
    () => getTimelineRecords(records, { date: activeDate, filter: activeFilter, query: searchQuery }),
    [activeDate, activeFilter, records, searchQuery],
  );
  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );
  const selectedDetail = selectedRecord ? getTimelineDetail(selectedRecord) : null;

  const activeTitle = activeFilter === "all" ? "기록 목록" : `${categoryLabels[activeFilter]} 기록`;

  function moveDate(direction: -1 | 1) {
    setActiveDateIndexOverride((current) => {
      const currentIndex = current ?? activeDateIndex;
      const next = currentIndex + direction;
      if (next < 0 || next >= timelineDates.length) {
        return currentIndex;
      }
      return next;
    });
    setSelectedRecordId(null);
  }

  function startEdit(record: RecordEntry) {
    setEditingId(record.id);
    setEditingCategory(getTimelineEditCategory(record));
    setEditingDetail(record.detail);
    setEditingError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDetail("");
    setEditingError("");
  }

  function saveEdit(recordId: string) {
    const detail = editingDetail.trim();
    if (detail.length < 5) {
      setEditingError("기록은 5자 이상 입력해주세요.");
      return;
    }

    updateRecord(recordId, { category: editingCategory, detail });
    cancelEdit();
  }

  function removeRecord(recordId: string) {
    const shouldDelete = window.confirm("이 기록을 삭제할까요?");
    if (!shouldDelete) {
      return;
    }

    if (editingId === recordId) {
      cancelEdit();
    }
    if (selectedRecordId === recordId) {
      setSelectedRecordId(null);
    }
    deleteRecord(recordId);
  }

  return (
    <AppShell subtitle="날짜별 기록을 한눈에" title="기록 타임라인">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-[#dfe6d9] bg-white p-3">
          <button
            aria-label="이전 날짜"
            className="h-9 w-9 rounded-full bg-[#f1f5ed] font-bold text-[#596456] disabled:opacity-40"
            disabled={activeDateIndex >= timelineDates.length - 1}
            onClick={() => moveDate(1)}
            type="button"
          >
            <PetIcon className="mx-auto h-4 w-4" name="back" />
          </button>
          <div className="text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#7c8777]">
              <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="timeline" />
              {dateSummary.noticeLabel}
            </p>
            <p className="text-base font-black text-[#1f2922]">{activeDate ?? "기록 없음"}</p>
            <p className="mt-1 text-xs font-bold text-[#16804b]">{dateSummary.totalCount}개 기록</p>
          </div>
          <button
            aria-label="다음 날짜"
            className="h-9 w-9 rounded-full bg-[#f1f5ed] font-bold text-[#596456] disabled:opacity-40"
            disabled={activeDateIndex <= 0}
            onClick={() => moveDate(-1)}
            type="button"
          >
            <PetIcon className="mx-auto h-4 w-4 rotate-180" name="back" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="record" />
            <p className="text-[11px] font-bold text-[#778174]">전체</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{dateSummary.totalCount}</p>
          </div>
          <div className="rounded-2xl border border-[#f1d9af] bg-[#fffaf0] px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#bb721e]" name="activity" />
            <p className="text-[11px] font-bold text-[#9a7954]">확인</p>
            <p className="mt-1 text-base font-black text-[#bb721e]">{dateSummary.noticeCount}</p>
          </div>
          <div className="rounded-2xl border border-[#f0cbc5] bg-[#fff7f5] px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#be4c3c]" name="alert" />
            <p className="text-[11px] font-bold text-[#9a6b64]">주의</p>
            <p className="mt-1 text-base font-black text-[#be4c3c]">{dateSummary.alertCount}</p>
          </div>
        </div>

        <label className="block">
          <span className="sr-only">기록 검색</span>
          <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
            <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="question" />
            기록 검색
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[#dfe6d9] bg-white px-4 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedRecordId(null);
            }}
            placeholder="검색어를 입력하세요"
            value={searchQuery}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          {timelineFilters.map((filter) => (
            <Pill
              active={activeFilter === filter.value}
              className="w-full px-2 text-xs"
              key={filter.value}
              onClick={() => {
                setActiveFilter(filter.value);
                setSelectedRecordId(null);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <PetIcon className="h-3.5 w-3.5" name={timelineFilterIcons[filter.value]} />
              {filter.label}
              </span>
            </Pill>
          ))}
        </div>

        <section>
          <SectionHeader title={activeTitle} />
          {filteredRecords.length > 0 ? (
            <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[21px] before:top-4 before:w-px before:bg-[#dfe8d9]">
              {filteredRecords.map((record) => {
                const recordCategoryChoice = getTimelineEditCategory(record);
                return (
                <Card className="relative ml-8 p-4" key={record.id}>
                  <span className="absolute -left-[38px] top-5 grid h-8 w-8 place-items-center rounded-full border-4 border-[#f8faf5] bg-[#eaf5e8] text-xs font-black text-[#16804b]">
                    <PetIcon className="h-4 w-4" name={record.category} />
                  </span>
                  {editingId === record.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#7a8374]">{record.time}</span>
                        {editingCategory === "all" ? (
                          <span className="rounded-full bg-[#f1f5ed] px-2.5 py-1 text-xs font-bold text-[#53604f]">
                            {getRecordCategoryChoiceLabel(editingCategory)}
                          </span>
                        ) : (
                          <CategoryBadge category={editingCategory} />
                        )}
                      </div>
                      <textarea
                        className="min-h-28 w-full resize-none rounded-2xl border border-[#dde6d6] bg-[#fbfcfa] p-3 text-sm leading-6 outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                        onChange={(event) => {
                          setEditingDetail(event.target.value);
                          if (editingError) {
                            setEditingError("");
                          }
                        }}
                        value={editingDetail}
                      />
                      <div className="flex flex-wrap gap-2">
                        {recordCategoryChoiceOptions.map((option) => {
                          const active = editingCategory === option.value;
                          return (
                            <Pill
                              active={active}
                              key={option.value}
                              onClick={() => setEditingCategory(option.value)}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {active ? <PetIcon className="h-3.5 w-3.5" name="check" /> : null}
                                <PetIcon className="h-3.5 w-3.5" name={option.icon} />
                                {option.label}
                              </span>
                            </Pill>
                          );
                        })}
                      </div>
                      {editingError ? <p className="text-sm font-semibold text-[#be4c3c]">{editingError}</p> : null}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="h-10 rounded-xl border border-[#dce5d5] bg-white text-sm font-bold text-[#40513f]"
                          onClick={cancelEdit}
                          type="button"
                        >
                          <PetIcon className="mr-1 inline h-4 w-4" name="close" />
                          취소
                        </button>
                        <button
                          className="h-10 rounded-xl bg-[#16804b] text-sm font-bold text-white"
                          onClick={() => saveEdit(record.id)}
                          type="button"
                        >
                          <PetIcon className="mr-1 inline h-4 w-4" name="check" />
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button className="w-full text-left" onClick={() => setSelectedRecordId(record.id)} type="button">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#7a8374]">{record.time}</span>
                              {recordCategoryChoice === "all" && (record.structured?.detectedCategories?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {record.structured!.detectedCategories!.map((cat) => (
                                    <CategoryBadge category={cat} key={cat} />
                                  ))}
                                </div>
                              ) : recordCategoryChoice === "all" ? (
                                <span className="rounded-full bg-[#f1f5ed] px-2.5 py-1 text-xs font-bold text-[#53604f]">
                                  {getRecordCategoryChoiceLabel(recordCategoryChoice)}
                                </span>
                              ) : (
                                <CategoryBadge category={recordCategoryChoice} />
                              )}
                            </div>
                            <h3 className="mt-2 text-sm font-bold text-[#1f2922]">{record.title}</h3>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#667262]">{record.detail}</p>
                          </div>
                          <span className="mt-1 text-[#9ba597]">›</span>
                        </div>
                      </button>
                      {selectedRecordId === record.id && selectedDetail ? (
                        <div className="rounded-2xl border border-[#dfe8d9] bg-[#fbfdf8] p-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-black ${statusText[record.status]}`}>
                              <PetIcon className="h-3.5 w-3.5" name={record.status === "alert" ? "alert" : record.status === "notice" ? "activity" : "check"} />
                              {selectedDetail.statusLabel}
                            </span>
                            <span className="text-xs font-bold text-[#8a9286]">{selectedDetail.categoryLabel}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#4d584a]">{selectedDetail.statusDetail}</p>
                          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#667262]">
                            {selectedDetail.aiSummary}
                          </p>
                          {selectedDetail.measurements.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedDetail.measurements.map((measurement) => (
                                <span
                                  className="rounded-full bg-[#edf8ed] px-2.5 py-1 text-xs font-bold text-[#16804b]"
                                  key={`${measurement.label}-${measurement.value}`}
                                >
                                  {measurement.label} {measurement.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="h-9 rounded-xl border border-[#dce5d5] bg-white text-sm font-bold text-[#40513f]"
                          onClick={() => startEdit(record)}
                          type="button"
                        >
                          <PetIcon className="mr-1 inline h-4 w-4" name="record" />
                          수정
                        </button>
                        <button
                          className="h-9 rounded-xl bg-[#fff0ed] text-sm font-bold text-[#be4c3c]"
                          onClick={() => removeRecord(record.id)}
                          type="button"
                        >
                          <PetIcon className="mr-1 inline h-4 w-4" name="alert" />
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-5 text-center">
              <PetIcon className="mx-auto h-6 w-6 text-[#9aa494]" name="timeline" />
              <h3 className="text-sm font-bold text-[#1f2922]">표시할 기록이 없습니다.</h3>
              <p className="mt-2 text-sm leading-6 text-[#667262]">
                선택한 날짜, 검색어, 필터에 맞는 기록이 없습니다. 조건을 바꾸거나 새 기록을 남겨보세요.
              </p>
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
