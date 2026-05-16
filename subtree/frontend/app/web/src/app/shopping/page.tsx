"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { fetchShoppingRecommendations } from "@/lib/api-client";
import { shoppingFilters, toggleSavedRecommendation } from "@/lib/expansion-state";
import { getShoppingRecommendations, type ShoppingRecommendation } from "@/lib/expansion-features";
import type { ShoppingFilter } from "@/lib/expansion-state";

const toneClasses = {
  green: "bg-[#edf8ed] text-[#16804b]",
  orange: "bg-[#fff2df] text-[#bb721e]",
  red: "bg-[#ffe9e6] text-[#be4c3c]",
  blue: "bg-[#eaf2ff] text-[#2e67a7]",
};

const shoppingSyncLabel = "상품 추천 동기화 중";

export default function ShoppingPage() {
  const { profile, records, expansionState, updateShoppingState } = usePetLog();
  const shoppingState = expansionState.shopping;
  const [apiRecommendations, setApiRecommendations] = useState<ShoppingRecommendation[]>([]);
  const [isShoppingLoading, setIsShoppingLoading] = useState(false);
  const [shoppingError, setShoppingError] = useState("");
  const fallbackRecommendations = useMemo(() => getShoppingRecommendations(profile, records), [profile, records]);
  const recommendations = apiRecommendations.length > 0 ? apiRecommendations : fallbackRecommendations;
  const filteredRecommendations = useMemo(() => {
    if (shoppingState.activeFilter === "전체") {
      return recommendations;
    }

    return recommendations.filter((item) => item.category === shoppingState.activeFilter);
  }, [shoppingState.activeFilter, recommendations]);

  useEffect(() => {
    function clearRecommendations() {
      setApiRecommendations([]);
    }

    function startLoading() {
      setIsShoppingLoading(true);
      setShoppingError("");
    }

    if (!profile.id) {
      clearRecommendations();
      return;
    }

    let cancelled = false;
    startLoading();

    fetchShoppingRecommendations(profile.id)
      .then(({ recommendations }) => {
        if (cancelled) {
          return;
        }
        setApiRecommendations(recommendations);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setApiRecommendations([]);
        setShoppingError("쇼핑 API 추천을 불러오지 못해 기록 기반 기본 추천을 표시합니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsShoppingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  function toggleSavedItem(recommendationId: string) {
    updateShoppingState({
      savedRecommendationIds: toggleSavedRecommendation(shoppingState.savedRecommendationIds, recommendationId),
    });
  }

  return (
    <AppShell subtitle="기록 기반 추천 흐름" title="쇼핑">
      <div className="space-y-5">
        <Card className={`bg-gradient-to-br from-white to-[#fff2df] ${isShoppingLoading ? "pet-log-loading-border pet-log-shopping-loading-border" : ""}`}>
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#bb721e]">
            <PetIcon className="h-4 w-4" name="shopping" />
            맞춤 추천
          </p>
          <h2 className="mt-1 text-xl font-black text-[#1f2922]">{profile.name}에게 맞는 상품 후보</h2>
          <p className="mt-2 text-sm leading-6 text-[#667262]">
            프로필, 식사 기록, 산책 기록, 행동 기록을 근거로 사료와 케어 용품 추천 화면을 구성합니다.
          </p>
          <p className="mt-3 text-xs font-bold text-[#bb721e]">
            {isShoppingLoading ? <ShoppingSyncText text={shoppingSyncLabel} /> : `저장한 추천 ${shoppingState.savedRecommendationIds.length}개`}
          </p>
          {shoppingError ? <p className="mt-2 text-xs font-bold text-[#be4c3c]">{shoppingError}</p> : null}
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="shopping" />
            <p className="text-[11px] font-bold text-[#778174]">추천</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{recommendations.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="heart" />
            <p className="text-[11px] font-bold text-[#778174]">저장</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{shoppingState.savedRecommendationIds.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name="more" />
            <p className="text-[11px] font-bold text-[#778174]">필터</p>
            <p className="mt-1 truncate text-base font-black text-[#1f2922]">{shoppingState.activeFilter}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {shoppingFilters.map((filter) => (
            <Pill
              active={shoppingState.activeFilter === filter}
              className="w-full px-2 text-xs"
              key={filter}
              onClick={() => updateShoppingState({ activeFilter: filter as ShoppingFilter })}
            >
              {filter}
            </Pill>
          ))}
        </div>

        <section>
          <SectionHeader title="추천 카드" />
          <div className="space-y-3">
            {filteredRecommendations.map((item) => (
              <Card className="p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses[item.tone]}`}>{item.category}</span>
                    <h2 className="mt-3 text-base font-black text-[#1f2922]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#667262]">{item.detail}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {typeof item.lowest_price === "number" && item.lowest_price > 0 ? (
                        <span className="text-base font-black text-[#16804b]">{item.lowest_price.toLocaleString("ko-KR")}원</span>
                      ) : null}
                      {item.mall_name ? <span className="rounded-full bg-[#f4f7f0] px-2.5 py-1 text-xs font-bold text-[#667262]">{item.mall_name}</span> : null}
                    </div>
                  </div>
                  {item.image_url ? (
                    <img
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-2xl border border-[#dfe6d9] bg-[#f4f7f0] object-cover"
                      loading="lazy"
                      src={item.image_url}
                    />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#f4f7f0] text-lg font-black text-[#16804b]">
                      <PetIcon className="h-7 w-7" name="shopping" />
                    </div>
                  )}
                </div>
                <button
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dbe4d4] bg-white text-sm font-bold text-[#16804b]"
                  aria-expanded={shoppingState.expandedReasonId === item.id}
                  onClick={() =>
                    updateShoppingState({
                      expandedReasonId: shoppingState.expandedReasonId === item.id ? null : item.id,
                    })
                  }
                  type="button"
                >
                  <PetIcon className="h-4 w-4" name="question" />
                  {shoppingState.expandedReasonId === item.id ? "추천 이유 닫기" : "추천 이유 보기"}
                </button>
                {shoppingState.expandedReasonId === item.id ? (
                  <div className="mt-3 rounded-xl bg-[#f8faf5] px-3 py-2 text-xs font-semibold leading-5 text-[#3d4639]">
                    <p>{item.reason}</p>
                    {item.mall_name ? <p className="mt-1 text-[#667262]">{item.mall_name}</p> : null}
                    {typeof item.lowest_price === "number" && item.lowest_price > 0 ? (
                      <p className="mt-1 text-[#667262]">최저가 {item.lowest_price.toLocaleString("ko-KR")}원</p>
                    ) : null}
                  </div>
                ) : null}
                {item.product_url ? (
                  <a
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dbe4d4] bg-white text-sm font-bold text-[#356aa8]"
                    href={item.product_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <PetIcon className="h-4 w-4" name="shopping" />
                    상품 보기
                  </a>
                ) : null}
                <button
                  className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${
                    shoppingState.savedRecommendationIds.includes(item.id) ? "bg-[#16804b] text-white" : "bg-[#f4f7f0] text-[#16804b]"
                  }`}
                  onClick={() => toggleSavedItem(item.id)}
                  type="button"
                >
                  <PetIcon className="h-4 w-4" name={shoppingState.savedRecommendationIds.includes(item.id) ? "check" : "heart"} />
                  {shoppingState.savedRecommendationIds.includes(item.id) ? "저장됨" : "추천 저장"}
                </button>
              </Card>
            ))}
          </div>
        </section>

        <Card className="bg-[#fffaf0]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b56d19]">
            <PetIcon className="h-4 w-4" name="alert" />
            구매 연결 범위
          </p>
          <p className="mt-2 text-sm leading-6 text-[#65533a]">
            현재는 추천 카드와 상품 연결 진입 흐름만 제공합니다. 결제, 쿠폰, 제휴 링크, 구매 전환 추적은 제품화 단계에서 연결합니다.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function ShoppingSyncText({ text }: { text: string }) {
  return (
    <span aria-label={text} className="pet-log-sync-wave inline-flex min-h-4 items-baseline whitespace-pre">
      {Array.from(text).map((letter, index) => (
        <span aria-hidden="true" key={`${letter}-${index}`} style={{ animationDelay: `${index * 120}ms` }}>
          {letter}
        </span>
      ))}
    </span>
  );
}
