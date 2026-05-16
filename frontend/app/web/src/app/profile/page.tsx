"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { uploadProfilePhoto } from "@/lib/api-client";
import { ageInputValue, ageLabelFromInput, weightInputValue, weightLabelFromInput } from "@/lib/profile-field-formatters";
import { profileSexOptions } from "@/lib/profile-sex-options";
import { canUseProfileCameraStream, getProfileCameraConstraints, getProfilePhotoError } from "@/lib/profile-photo";
import type { PetProfile } from "@/lib/types";

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

const profileTextFields: Array<[string, keyof PetProfile]> = [
  ["이름", "name"],
  ["품종", "breed"],
  ["생일", "birthday"],
  ["성격", "personality"],
];

export default function ProfilePage() {
  const { profile, updateProfile } = usePetLog();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [draft, setDraft] = useState<PetProfile>(profile);
  const [notesText, setNotesText] = useState(profile.notes.join("\n"));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!isCameraOpen || !cameraStream || !video) {
      return;
    }

    const currentVideo = video;
    let cancelled = false;
    currentVideo.srcObject = cameraStream;

    async function playVideo() {
      try {
        await currentVideo.play();
        if (!cancelled) {
          setCameraStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setError("카메라 화면을 재생하지 못했습니다. 권한을 확인하거나 다시 촬영을 눌러주세요.");
          setCameraStatus("loading");
        }
      }
    }

    if (currentVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void playVideo();
    } else {
      currentVideo.onloadedmetadata = () => {
        void playVideo();
      };
    }

    return () => {
      cancelled = true;
      currentVideo.onloadedmetadata = null;
      if (currentVideo.srcObject === cameraStream) {
        currentVideo.srcObject = null;
      }
    };
  }, [cameraStream, isCameraOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStream(null);
    setCameraStatus("idle");
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }

  function startEdit() {
    setDraft(profile);
    setNotesText(profile.notes.join("\n"));
    setError("");
    setIsEditing(true);
  }

  function updateDraft(field: keyof PetProfile, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (error) {
      setError("");
    }
  }

  function cancelEdit() {
    stopCamera();
    setDraft(profile);
    setNotesText(profile.notes.join("\n"));
    setError("");
    setIsEditing(false);
  }

  async function uploadProfilePhotoFile(file: File) {
    const photoError = getProfilePhotoError(file);
    if (photoError) {
      setError(photoError);
      return;
    }

    try {
      const { file: uploadedFile } = await uploadProfilePhoto(file);
      setDraft((current) => ({ ...current, photoDataUrl: uploadedFile.url }));
      setError("");
    } catch {
      setError("프로필 사진을 서버에 저장하지 못했습니다.");
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await uploadProfilePhotoFile(file);
  }

  async function openCamera() {
    setError("");

    if (!canUseProfileCameraStream(navigator)) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraStream(null);
      setIsCameraOpen(true);
      setCameraStatus("loading");

      const stream = await navigator.mediaDevices.getUserMedia(getProfileCameraConstraints());
      streamRef.current = stream;
      setCameraStream(stream);
    } catch {
      setCameraStatus("idle");
      setIsCameraOpen(false);
      setError("카메라를 열 수 없습니다. 권한을 허용하거나 사진 업로드를 사용해주세요.");
      cameraInputRef.current?.click();
    }
  }

  function captureCameraPhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("카메라 화면을 불러온 뒤 다시 촬영해주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("촬영 이미지를 만들지 못했습니다.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("촬영 이미지를 만들지 못했습니다.");
        return;
      }
      void uploadProfilePhotoFile(new File([blob], "profile-photo.jpg", { type: "image/jpeg" })).then(() => {
        stopCamera();
      });
    }, "image/jpeg", 0.9);
  }

  async function saveProfile() {
    const nextProfile: PetProfile = {
      ...emptyProfile,
      ...draft,
      name: draft.name.trim(),
      breed: draft.breed.trim(),
      age: ageLabelFromInput(draft.age),
      sex: draft.sex.trim(),
      weight: weightLabelFromInput(draft.weight),
      birthday: draft.birthday.trim(),
      personality: draft.personality.trim(),
      notes: notesText
        .split("\n")
        .map((note) => note.trim())
        .filter(Boolean),
    };

    if (!nextProfile.name || !nextProfile.breed) {
      setError("이름과 품종은 필수로 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const savedProfile = await updateProfile(nextProfile);
      setDraft(savedProfile);
      setNotesText(savedProfile.notes.join("\n"));
      setError("");
      stopCamera();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell subtitle="우리 아이 정보를 관리해요" title="프로필">
      <div className="space-y-5">
        {isEditing ? (
          <Card className="border-[#b9dbc5] bg-[#fbfffb]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-1.5 text-base font-black text-[#1f2922]">
                <PetIcon className="h-4 w-4 text-[#16804b]" name="profile" />
                프로필 편집
              </h2>
              <button className="text-sm font-bold text-[#667262]" onClick={cancelEdit} type="button">
                닫기
              </button>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#dfe8d9] bg-white p-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                  <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="profile" />
                  프로필 사진
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-[#eef5e9] text-2xl font-black text-[#16804b]">
                    {draft.photoDataUrl ? (
                      <Image
                        alt="프로필 사진 미리보기"
                        className="h-full w-full object-cover"
                        height={80}
                        src={draft.photoDataUrl}
                        unoptimized
                        width={80}
                      />
                    ) : (
                      draft.name.slice(0, 1) || profile.name.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-5 text-[#667262]">2MB 이하의 이미지 파일을 저장할 수 있습니다.</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        className="h-10 rounded-xl border border-[#cfe2cd] bg-[#f4faf2] text-sm font-bold text-[#16804b]"
                        onClick={() => uploadInputRef.current?.click()}
                        type="button"
                      >
                        <PetIcon className="mr-1 inline h-4 w-4" name="plus" />
                        업로드
                      </button>
                      <button
                        className="h-10 rounded-xl border border-[#d8e1f2] bg-[#f6f9ff] text-sm font-bold text-[#356aa8]"
                        onClick={openCamera}
                        type="button"
                      >
                        <PetIcon className="mr-1 inline h-4 w-4" name="record" />
                        촬영
                      </button>
                    </div>
                    {draft.photoDataUrl ? (
                      <button
                        className="mt-2 h-9 w-full rounded-xl bg-[#fff0ed] text-sm font-bold text-[#be4c3c]"
                        onClick={() => setDraft((current) => ({ ...current, photoDataUrl: undefined }))}
                        type="button"
                      >
                        <PetIcon className="mr-1 inline h-4 w-4" name="alert" />
                        사진 삭제
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                  ref={uploadInputRef}
                  type="file"
                />
                <input
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  ref={cameraInputRef}
                  type="file"
                />
              </div>
              {isCameraOpen ? (
                <div className="rounded-2xl border border-[#d8e1f2] bg-[#f6f9ff] p-3">
                  <div className="relative overflow-hidden rounded-2xl bg-[#1f2922]">
                    <video
                      autoPlay
                      className="aspect-[4/3] w-full object-cover"
                      muted
                      playsInline
                      ref={videoRef}
                    />
                    {cameraStatus === "loading" ? (
                      <div className="absolute inset-0 grid place-items-center bg-[#1f2922] px-4 text-center text-sm font-bold text-white">
                        카메라 화면을 불러오는 중입니다
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="h-11 rounded-xl border border-[#dce5d5] bg-white text-sm font-bold text-[#40513f]"
                      onClick={stopCamera}
                      type="button"
                    >
                      <PetIcon className="mr-1 inline h-4 w-4" name="close" />
                      닫기
                    </button>
                    <button
                      className="h-11 rounded-xl bg-[#356aa8] text-sm font-bold text-white disabled:bg-[#b9c9d8]"
                      disabled={cameraStatus !== "ready"}
                      onClick={captureCameraPhoto}
                      type="button"
                    >
                      <PetIcon className="mr-1 inline h-4 w-4" name="record" />
                      사진 찍기
                    </button>
                  </div>
                </div>
              ) : null}
              {profileTextFields.slice(0, 2).map(([label, field]) => (
                <label className="block" key={field}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                    <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name={field === "weight" ? "activity" : field === "birthday" ? "schedule" : field === "personality" ? "heart" : "profile"} />
                    {label}
                  </span>
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                    onChange={(event) => updateDraft(field as keyof PetProfile, event.target.value)}
                    value={draft[field as keyof PetProfile] as string}
                  />
                </label>
              ))}
              <label className="block">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                  <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="profile" />
                  나이
                </span>
                <div className="mt-1 flex h-11 items-center rounded-xl border border-[#dde6d6] bg-white focus-within:border-[#16804b] focus-within:ring-2 focus-within:ring-[#16804b]/15">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-[#263022] outline-none"
                    inputMode="numeric"
                    onChange={(event) => updateDraft("age", event.target.value.replace(/[^\d]/g, ""))}
                    pattern="[0-9]*"
                    value={ageInputValue(draft.age)}
                  />
                  <span className="shrink-0 border-l border-[#edf1e9] px-3 text-sm font-black text-[#778174]">살</span>
                </div>
              </label>
              <label className="block">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                  <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="activity" />
                  체중
                </span>
                <div className="mt-1 flex h-11 items-center rounded-xl border border-[#dde6d6] bg-white focus-within:border-[#16804b] focus-within:ring-2 focus-within:ring-[#16804b]/15">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-[#263022] outline-none"
                    inputMode="decimal"
                    onChange={(event) => updateDraft("weight", weightInputValue(event.target.value))}
                    pattern="[0-9]*[.]?[0-9]*"
                    value={weightInputValue(draft.weight)}
                  />
                  <span className="shrink-0 border-l border-[#edf1e9] px-3 text-sm font-black text-[#778174]">kg</span>
                </div>
              </label>
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                  <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="profile" />
                  성별
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {profileSexOptions.map((option) => {
                    const selected = draft.sex === option.value;
                    return (
                      <button
                        aria-pressed={selected}
                        className={[
                          "flex h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-bold outline-none transition focus:ring-2 focus:ring-[#16804b]/20",
                          selected
                            ? "border-[#16804b] bg-[#eaf7ed] text-[#115f39] shadow-[0_6px_16px_rgba(22,128,75,0.14)]"
                            : "border-[#dde6d6] bg-white text-[#40513f]",
                        ].join(" ")}
                        key={option.value}
                        onClick={() => updateDraft("sex", option.value)}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-base font-black",
                            selected ? "bg-[#16804b] text-white" : "bg-[#f2f6ee] text-[#16804b]",
                          ].join(" ")}
                        >
                          {option.icon}
                        </span>
                        <span className="min-w-0">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {profileTextFields.slice(2).map(([label, field]) => (
                <label className="block" key={field}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                    <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name={field === "weight" ? "activity" : field === "birthday" ? "schedule" : field === "personality" ? "heart" : "profile"} />
                    {label}
                  </span>
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                    onChange={(event) => updateDraft(field as keyof PetProfile, event.target.value)}
                    value={draft[field as keyof PetProfile] as string}
                  />
                </label>
              ))}
              <label className="block">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#778174]">
                  <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name="medical" />
                  건강 메모
                </span>
                <textarea
                  className="mt-1 min-h-28 w-full resize-none rounded-xl border border-[#dde6d6] bg-white p-3 text-sm leading-6 text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                  onChange={(event) => {
                    setNotesText(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  value={notesText}
                />
              </label>
              {error ? <p className="text-sm font-semibold text-[#be4c3c]">{error}</p> : null}
              <button
                className="h-12 w-full rounded-2xl bg-[#16804b] text-base font-bold text-white shadow-[0_8px_22px_rgba(22,128,75,0.25)] disabled:bg-[#8ab99f]"
                disabled={isSaving}
                onClick={saveProfile}
                type="button"
              >
                <PetIcon className="mr-1 inline h-5 w-5" name="check" />
                {isSaving ? "저장 중" : "프로필 저장"}
              </button>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-[#eef5e9] text-2xl font-black text-[#16804b]">
                  {profile.photoDataUrl ? (
                    <Image
                      alt={`${profile.name} 프로필 사진`}
                      className="h-full w-full rounded-3xl object-cover"
                      height={80}
                      src={profile.photoDataUrl}
                      unoptimized
                      width={80}
                    />
                  ) : (
                    profile.name.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-[#1f2922]">{profile.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-[#697465]">
                        {profile.age} · {profile.breed} · {profile.sex}
                      </p>
                    </div>
                    <button className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-bold text-[#16804b]" onClick={startEdit} type="button">
                      <PetIcon className="h-4 w-4" name="record" />
                      편집
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill>{profile.weight}</Pill>
                    <Pill>{profile.birthday}</Pill>
                  </div>
                </div>
              </div>
            </Card>

            <section>
              <SectionHeader title="기본 정보" />
              <Card>
                <dl className="space-y-3 text-sm">
                  {[
                    ["성격", profile.personality],
                    ["특이사항", profile.notes[0] ?? "등록된 특이사항 없음"],
                    ["생활 정보", profile.notes[2] ?? profile.notes[1] ?? "등록된 생활 정보 없음"],
                  ].map(([label, value]) => (
                    <div className="grid gap-1.5 border-b border-[#edf1e9] pb-3 last:border-0 last:pb-0" key={label}>
                      <dt className="inline-flex items-center gap-1.5 font-bold text-[#778174]">
                        <PetIcon className="h-3.5 w-3.5 text-[#16804b]" name={label === "성격" ? "heart" : label === "특이사항" ? "medical" : "home"} />
                        {label}
                      </dt>
                      <dd className="min-w-0 break-keep text-left font-semibold leading-6 text-[#263022]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </section>

            <section>
              <SectionHeader title="체중 변화" />
              <Card>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
                      <PetIcon className="h-4 w-4" name="activity" />
                      {profile.weight}
                    </p>
                    <h2 className="text-base font-black text-[#1f2922]">체중 추이</h2>
                  </div>
                </div>
                <p className="text-center text-sm text-[#7b8576]">체중 기록 데이터가 없습니다.</p>
              </Card>
            </section>

            <section>
              <SectionHeader title="건강 메모" />
              <div className="space-y-3">
                {profile.notes.map((note) => (
                  <Card className="p-4" key={note}>
                    <p className="inline-flex items-start gap-2 text-sm font-semibold text-[#3e493b]">
                      <PetIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16804b]" name="medical" />
                      {note}
                    </p>
                  </Card>
                ))}
                {profile.notes.length === 0 ? (
                  <Card className="p-5 text-center">
                    <PetIcon className="mx-auto h-6 w-6 text-[#9aa494]" name="medical" />
                    <p className="text-sm font-bold text-[#1f2922]">등록된 건강 메모가 없습니다.</p>
                  </Card>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
