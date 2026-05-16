"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GoogleHospitalMap } from "@/components/google-hospital-map";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, CategoryBadge, SectionHeader } from "@/components/ui";
import { fetchHospitalRecommendations, type HospitalRecommendationItem } from "@/lib/api-client";
import { getHospitalConnectSummary, type NearbyAnimalHospital } from "@/lib/expansion-features";

export default function HospitalPage() {
  const { profile, records, expansionState, updateHospitalState } = usePetLog();
  const hospitalState = expansionState.hospital;
  const summary = useMemo(
    () => getHospitalConnectSummary(profile, records, hospitalState.symptomMemo),
    [profile, records, hospitalState.symptomMemo],
  );
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyAnimalHospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const checkedChecklistCount = hospitalState.checkedChecklistItems.length;
  const selectHospital = useCallback(
    (selectedHospitalId: string) => updateHospitalState({ selectedHospitalId }),
    [updateHospitalState],
  );

  useEffect(() => {
    if (!hospitalState.currentLocation) return;

    let cancelled = false;
    const { lat, lng } = hospitalState.currentLocation;

    setHospitalsLoading(true);
    fetchHospitalRecommendations(lat, lng, { text: hospitalState.symptomMemo || undefined })
      .then((data) => {
        if (cancelled || !data) return;
        const { latitude: cLat, longitude: cLng } = data.search_center;
        const sorted = data.recommendations
          .slice()
          .sort((a, b) => (a.distance_meters ?? Infinity) - (b.distance_meters ?? Infinity));
        setNearbyHospitals(sorted.map((item) => toNearbyHospital(item, cLat, cLng)));
      })
      .catch(() => {
        if (!cancelled) setNearbyHospitals([]);
      })
      .finally(() => {
        if (!cancelled) setHospitalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hospitalState.currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  function requestNearbyLocation() {
    if (!("geolocation" in navigator)) {
      updateHospitalState({ locationStatus: "blocked" });
      return;
    }

    updateHospitalState({ locationStatus: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        updateHospitalState({
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          locationStatus: "ready",
        }),
      () => updateHospitalState({ currentLocation: undefined, locationStatus: "blocked" }),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 5000 },
    );
  }

  function toggleChecklistItem(item: string) {
    const checkedChecklistItems = hospitalState.checkedChecklistItems.includes(item)
      ? hospitalState.checkedChecklistItems.filter((current) => current !== item)
      : [...hospitalState.checkedChecklistItems, item];
    updateHospitalState({ checkedChecklistItems });
  }

  return (
    <AppShell subtitle="상담 전 기록을 정리해요" title="병원 연계">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#eaf2ff]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2e67a7]">
            <PetIcon className="h-4 w-4" name="hospital" />
            방문 준비
          </p>
          <h2 className="mt-1 text-xl font-black text-[#1f2922]">{summary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667262]">{summary.detail}</p>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#be4c3c]" name="alert" />
            <p className="text-[11px] font-bold text-[#778174]">주의 기록</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{summary.warningRecords.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="check" />
            <p className="text-[11px] font-bold text-[#778174]">체크</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">
              {checkedChecklistCount}/{summary.checklist.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name="hospital" />
            <p className="text-[11px] font-bold text-[#778174]">병원</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{hospitalState.selectedHospitalId ? "선택" : "미정"}</p>
          </div>
        </div>

        <section>
          <SectionHeader title="증상 및 변화 메모" />
          <Card>
            <label className="block">
              <span className="text-xs font-bold text-[#778174]">병원에 말할 내용을 정리하세요</span>
              <textarea
                className="mt-2 min-h-28 w-full resize-none rounded-xl border border-[#dde6d6] bg-white p-3 text-sm leading-6 text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                onChange={(event) => updateHospitalState({ symptomMemo: event.target.value })}
                placeholder="예: 어제부터 산책 중 자주 멈추고 현관 앞에서 기다리는 시간이 길어졌어요."
                value={hospitalState.symptomMemo}
              />
            </label>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#778174]">입력한 메모는 저장되어 새로고침 후에도 리포트 미리보기에 유지됩니다.</p>
          </Card>
        </section>

        <section>
          <SectionHeader
            action={
              <button
                className="h-9 rounded-full border border-[#d8e3d2] bg-white px-3 text-xs font-bold text-[#16804b] disabled:text-[#9ca697]"
                disabled={hospitalState.locationStatus === "loading"}
                onClick={requestNearbyLocation}
                type="button"
              >
                {hospitalState.locationStatus === "loading"
                  ? "확인 중"
                  : hospitalState.locationStatus === "ready"
                    ? "내 위치 적용됨"
                    : "내 위치 찾기"}
              </button>
            }
            title="근처 동물병원"
          />
          <Card>
            <GoogleHospitalMap
              currentLocation={hospitalState.currentLocation}
              hospitals={nearbyHospitals}
              locationStatus={hospitalState.locationStatus}
              onSelectHospital={selectHospital}
              selectedHospitalId={hospitalState.selectedHospitalId}
            />

            <div className="mt-4 space-y-3">
              {hospitalsLoading && (
                <p className="py-4 text-center text-sm font-semibold text-[#778174]">병원 정보를 불러오는 중...</p>
              )}
              {!hospitalsLoading && hospitalState.locationStatus === "ready" && nearbyHospitals.length === 0 && (
                <p className="py-4 text-center text-sm font-semibold text-[#778174]">근처 동물병원을 찾지 못했습니다.</p>
              )}
              {nearbyHospitals.map((hospital, index) => (
                <button
                  className={`w-full rounded-2xl border p-3 text-left ${
                    hospitalState.selectedHospitalId === hospital.id ? "border-[#16804b] bg-[#f4fbef]" : "border-[#e0e6da] bg-[#fbfdf8]"
                  }`}
                  key={hospital.id}
                  onClick={() => selectHospital(hospital.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#16804b]">
                        {index + 1} · {hospital.distanceLabel} · {hospital.etaLabel}
                      </p>
                      <h2 className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-[#1f2922]">
                        <PetIcon className="h-4 w-4 text-[#16804b]" name="hospital" />
                        {hospital.name}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-[#778174]">
                        {hospital.addressHint} · {hospital.openLabel}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#fff2df] px-2.5 py-1 text-xs font-bold text-[#bb721e]">
                      {hospitalState.selectedHospitalId === hospital.id ? "선택됨" : "선택"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hospital.tags.map((tag) => (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#667262]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#778174]">
              구글맵 키가 설정되면 지도 위 마커로 병원을 선택할 수 있습니다.
            </p>
          </Card>
        </section>

        <section>
          <SectionHeader title="최근 주의 기록" />
          <div className="space-y-3">
            {summary.warningRecords.map((record) => (
              <Card className="p-4" key={record.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={record.category} />
                  <span className="rounded-full bg-[#fff2df] px-2.5 py-1 text-xs font-bold text-[#bb721e]">
                    {record.status === "alert" ? "주의" : "확인 필요"}
                  </span>
                </div>
                <h2 className="mt-3 text-base font-black text-[#1f2922]">{record.title}</h2>
                <p className="mt-1 text-sm font-semibold text-[#667262]">
                  {record.date} · {record.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#667262]">{record.detail}</p>
              </Card>
            ))}
            {summary.warningRecords.length === 0 ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">주의 기록이 없습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">기록이 쌓이면 상담 준비용 변화 기록을 자동으로 모읍니다.</p>
              </Card>
            ) : null}
          </div>
        </section>

        <section>
          <SectionHeader title="병원 제출용 리포트" />
          <Card>
            <ul className="space-y-2">
              {summary.reportPreview.map((item) => (
                <li className="rounded-xl bg-[#f4f7f0] px-3 py-2 text-xs font-semibold leading-5 text-[#3d4639]" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <SectionHeader title="방문 전 체크" />
          <Card>
            <div className="grid grid-cols-2 gap-2">
              {summary.checklist.map((item) => (
                <button
                  className={`rounded-xl px-3 py-3 text-left text-xs font-bold leading-5 ${
                    hospitalState.checkedChecklistItems.includes(item) ? "bg-[#eaf5e5] text-[#16804b]" : "bg-[#f8faf5] text-[#3d4639]"
                  }`}
                  key={item}
                  onClick={() => toggleChecklistItem(item)}
                  type="button"
                >
                  <PetIcon className="mr-1 inline h-3.5 w-3.5" name={hospitalState.checkedChecklistItems.includes(item) ? "check" : "record"} />
                  {item}
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Card className="bg-[#fffaf0]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b56d19]">
            <PetIcon className="h-4 w-4" name="alert" />
            공유 전 확인
          </p>
          <p className="mt-2 text-sm leading-6 text-[#65533a]">{summary.shareNotice}</p>
        </Card>
      </div>
    </AppShell>
  );
}

function toNearbyHospital(item: HospitalRecommendationItem, centerLat: number, centerLng: number): NearbyAnimalHospital {
  const dist = item.distance_meters ?? 0;
  const distanceLabel = dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
  const etaLabel = dist < 600 ? `도보 ${Math.max(1, Math.round(dist / 70))}분` : `차량 ${Math.max(1, Math.round(dist / 200))}분`;
  const openLabel = item.is_24_hours ? "24시 운영" : item.is_open_now === true ? "진료 중" : item.is_open_now === false ? "진료 종료" : "운영 미확인";
  const tags = item.is_24_hours ? ["24시"] : [];

  const lat = item.latitude ?? centerLat;
  const lng = item.longitude ?? centerLng;
  const range = 0.05;
  const x = Math.min(95, Math.max(5, 50 + ((lng - centerLng) / range) * 50));
  const y = Math.min(95, Math.max(5, 50 - ((lat - centerLat) / range) * 50));

  return {
    id: item.place_id,
    name: item.name,
    distanceLabel,
    etaLabel,
    addressHint: item.address.length > 30 ? `${item.address.slice(0, 30)}…` : item.address,
    openLabel,
    tags,
    mapPosition: { x, y },
    mapCoordinate: { lat, lng },
  };
}
