"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NearbyAnimalHospital } from "@/lib/expansion-features";
import type { HospitalLocationStatus } from "@/lib/expansion-state";

type MapLoadStatus = "missing-key" | "loading" | "ready" | "error";

type GoogleHospitalMapProps = {
  currentLocation?: GoogleLatLngLiteral;
  hospitals: NearbyAnimalHospital[];
  locationStatus: HospitalLocationStatus;
  onSelectHospital: (hospitalId: string) => void;
  selectedHospitalId?: string;
};

type GoogleLatLngLiteral = {
  lat: number;
  lng: number;
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBoundsInstance, padding?: number | Record<string, number>) => void;
  setCenter: (center: GoogleLatLngLiteral) => void;
};

type GoogleLatLngBoundsInstance = {
  extend: (point: GoogleLatLngLiteral) => void;
};

type GoogleMarkerInstance = {
  addListener: (eventName: string, listener: () => void) => unknown;
  setAnimation: (animation: number | null) => void;
  setIcon: (icon: unknown) => void;
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleMapsNamespace = {
  Animation: {
    DROP: number;
  };
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Point: new (x: number, y: number) => unknown;
  Size: new (width: number, height: number) => unknown;
};

declare global {
  interface Window {
    __petLogGoogleMapsCallback?: () => void;
    __petLogGoogleMapsPromise?: Promise<void>;
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}

const GOOGLE_MAP_SCRIPT_ID = "pet-log-google-maps-sdk";
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type MarkerEntry = { marker: GoogleMarkerInstance; hospital: NearbyAnimalHospital };

export function GoogleHospitalMap({ currentLocation, hospitals, locationStatus, onSelectHospital, selectedHospitalId }: GoogleHospitalMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const [loadStatus, setLoadStatus] = useState<MapLoadStatus>(() => (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "loading" : "missing-key"));
  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.id === selectedHospitalId) ?? hospitals[0] ?? null,
    [hospitals, selectedHospitalId],
  );

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then(() => {
        if (isMounted) {
          setLoadStatus("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadStatus(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "error" : "missing-key");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Map + marker creation — selectedHospital 제외하여 선택 시 맵 재생성 방지
  useEffect(() => {
    if (loadStatus !== "ready" || !mapElementRef.current || !window.google?.maps) {
      return;
    }

    const maps = window.google.maps;
    const mapElement = mapElementRef.current;
    const center = currentLocation ?? DEFAULT_CENTER;
    const map = new maps.Map(mapElement, {
      center,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      keyboardShortcuts: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 14,
      zoomControl: true,
    });

    markersRef.current = hospitals.map((hospital, index) => {
      const marker = new maps.Marker({
        icon: getMarkerIcon(maps, false),
        label: {
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: "900",
          text: String(index + 1),
        },
        map,
        position: hospital.mapCoordinate,
        title: hospital.name,
      });
      marker.addListener("click", () => onSelectHospital(hospital.id));
      return { marker, hospital };
    });

    const currentLocationMarker = currentLocation
      ? new maps.Marker({
          icon: getCurrentLocationIcon(maps),
          label: {
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "900",
            text: "나",
          },
          map,
          position: currentLocation,
          title: "내 위치",
        })
      : null;

    if (currentLocation) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(currentLocation);
      hospitals.forEach((hospital) => bounds.extend(hospital.mapCoordinate));
      map.fitBounds(bounds, 36);
    }

    return () => {
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      currentLocationMarker?.setMap(null);
      mapElement.replaceChildren();
    };
  }, [currentLocation, hospitals, loadStatus, onSelectHospital]); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택 변경 시 마커 아이콘만 업데이트 (맵 재생성 없음)
  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || markersRef.current.length === 0) return;

    markersRef.current.forEach(({ marker, hospital }) => {
      const isSelected = hospital.id === selectedHospital?.id;
      marker.setIcon(getMarkerIcon(maps, isSelected));
      marker.setAnimation(isSelected ? maps.Animation.DROP : null);
    });
  }, [selectedHospital]);

  if (loadStatus !== "ready") {
    return (
      <div>
        <MockHospitalMap hospitals={hospitals} locationStatus={locationStatus} />
        <p className="mt-2 text-xs font-semibold leading-5 text-[#778174]">
          {loadStatus === "loading"
            ? "구글맵을 불러오는 중입니다."
            : loadStatus === "missing-key"
              ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 설정 시 구글맵으로 표시됩니다."
              : "구글맵을 불러오지 못해 목업 지도를 표시합니다."}
        </p>
      </div>
    );
  }

  return <div aria-label="구글맵 병원 위치" className="h-52 overflow-hidden rounded-2xl border border-[#dce6d4] bg-[#edf4e9]" ref={mapElementRef} />;
}

function MockHospitalMap({ hospitals, locationStatus }: { hospitals: NearbyAnimalHospital[]; locationStatus: HospitalLocationStatus }) {
  return (
    <div className="relative h-52 overflow-hidden rounded-2xl border border-[#dce6d4] bg-[#edf4e9]">
      <div className="absolute left-0 top-1/3 h-px w-full bg-white/80" />
      <div className="absolute left-0 top-2/3 h-px w-full bg-white/80" />
      <div className="absolute left-1/3 top-0 h-full w-px bg-white/80" />
      <div className="absolute left-2/3 top-0 h-full w-px bg-white/80" />
      <div className="absolute -left-10 top-16 h-16 w-72 rotate-[-18deg] rounded-full bg-[#d8e7d0]" />
      <div className="absolute -right-12 bottom-10 h-14 w-64 rotate-[28deg] rounded-full bg-[#d7e4f5]" />
      <div className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#16804b] text-xs font-black text-white shadow-lg">
        나
      </div>
      {hospitals.map((hospital, index) => (
        <div
          className="absolute z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full border-2 border-white bg-[#be4c3c] text-xs font-black text-white shadow-lg"
          key={hospital.id}
          style={{ left: `${hospital.mapPosition.x}%`, top: `${hospital.mapPosition.y}%` }}
          title={hospital.name}
        >
          {index + 1}
        </div>
      ))}
      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-xs font-bold text-[#1f2922]">
          {locationStatus === "ready"
            ? "현재 위치 기준 가까운 병원 후보입니다."
            : locationStatus === "blocked"
              ? "위치 권한이 없어 예상 거리로 표시합니다."
              : "위치 권한을 허용하면 거리 표시를 더 명확히 보여줍니다."}
        </p>
      </div>
    </div>
  );
}

function getMarkerIcon(maps: GoogleMapsNamespace, isSelected: boolean) {
  const color = isSelected ? "#16804b" : "#be4c3c";
  const size = isSelected ? 42 : 34;
  const encodedSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="${color}" stroke="#fff" stroke-width="3"/>
    </svg>
  `);

  return {
    labelOrigin: new maps.Point(size / 2, size / 2 + 1),
    scaledSize: new maps.Size(size, size),
    url: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
  };
}

function getCurrentLocationIcon(maps: GoogleMapsNamespace) {
  const size = 38;
  const encodedSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="#356aa8" stroke="#fff" stroke-width="3"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 10}" fill="#ffffff" opacity="0.35"/>
    </svg>
  `);

  return {
    labelOrigin: new maps.Point(size / 2, size / 2 + 1),
    scaledSize: new maps.Size(size, size),
    url: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
  };
}

function loadGoogleMaps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing Google Maps API key"));
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__petLogGoogleMapsPromise) {
    return window.__petLogGoogleMapsPromise;
  }

  window.__petLogGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    window.__petLogGoogleMapsCallback = () => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      reject(new Error("Google Maps namespace is unavailable"));
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = GOOGLE_MAP_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__petLogGoogleMapsCallback`;
    script.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")), { once: true });
    document.head.appendChild(script);
  });

  return window.__petLogGoogleMapsPromise;
}
