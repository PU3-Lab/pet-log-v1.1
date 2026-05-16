"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { createPreparedInvite } from "@/lib/expansion-state";
import { getSharedCareSummary } from "@/lib/expansion-features";
import type { SharedCareRole } from "@/lib/expansion-state";

export default function SharedCarePage() {
  const { profile, records, expansionState, updateSharedCareState } = usePetLog();
  const sharedCareState = expansionState.sharedCare;
  const summary = useMemo(
    () =>
      getSharedCareSummary(
        profile,
        records,
        sharedCareState.preparedInvites,
        sharedCareState.notificationSharingEnabled,
      ),
    [profile, records, sharedCareState.preparedInvites, sharedCareState.notificationSharingEnabled],
  );

  function saveInviteDraft() {
    const target = sharedCareState.inviteTarget.trim();
    if (!target) {
      updateSharedCareState({ inviteDraftMessage: "초대할 이메일 또는 연락처를 입력해주세요." });
      return;
    }

    const preparedInvite = createPreparedInvite(target, sharedCareState.selectedRole);
    updateSharedCareState({
      inviteTarget: "",
      inviteDraftMessage: `${target} · ${sharedCareState.selectedRole} 초대가 저장되었습니다.`,
      preparedInvites: [preparedInvite, ...sharedCareState.preparedInvites],
    });
  }

  return (
    <AppShell subtitle="보호자와 함께 보는 기록" title="공동 관리">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#edf8ed]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
            <PetIcon className="h-4 w-4" name="shared" />
            공유 준비
          </p>
          <h2 className="mt-1 text-xl font-black text-[#1f2922]">{summary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667262]">{summary.detail}</p>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="community" />
            <p className="text-[11px] font-bold text-[#778174]">멤버</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{summary.members.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name="plus" />
            <p className="text-[11px] font-bold text-[#778174]">초대 준비</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{sharedCareState.preparedInvites.length}</p>
          </div>
          <div className="rounded-2xl border border-[#dfe6d9] bg-white px-3 py-3 text-center">
            <PetIcon className="mx-auto h-4 w-4 text-[#bb721e]" name="bell" />
            <p className="text-[11px] font-bold text-[#778174]">알림</p>
            <p className="mt-1 text-base font-black text-[#1f2922]">{sharedCareState.notificationSharingEnabled ? "ON" : "OFF"}</p>
          </div>
        </div>

        <section>
          <SectionHeader title="보호자 초대" />
          <Card>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-[#778174]">이메일 또는 연락처</span>
                <input
                  className="mt-1 h-11 w-full rounded-xl border border-[#dde6d6] bg-white px-3 text-sm font-semibold text-[#263022] outline-none focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15"
                  onChange={(event) => updateSharedCareState({ inviteTarget: event.target.value })}
                  placeholder="예: family@example.com"
                  value={sharedCareState.inviteTarget}
                />
              </label>
              <div>
                <p className="mb-2 text-xs font-bold text-[#778174]">역할</p>
                <div className="grid grid-cols-1 gap-2">
                  {summary.roleOptions.map((role) => (
                    <Pill
                      active={sharedCareState.selectedRole === role}
                      className="w-full"
                      key={role}
                      onClick={() => updateSharedCareState({ selectedRole: role as SharedCareRole })}
                    >
                      {role}
                    </Pill>
                  ))}
                </div>
              </div>
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#16804b] text-base font-bold text-white shadow-[0_8px_22px_rgba(22,128,75,0.25)]"
                onClick={saveInviteDraft}
                type="button"
              >
                <PetIcon className="h-5 w-5" name="plus" />
                초대 저장
              </button>
              {sharedCareState.inviteDraftMessage ? (
                <p className="rounded-xl bg-[#f4f7f0] px-3 py-2 text-sm font-semibold leading-6 text-[#3d4639]">
                  {sharedCareState.inviteDraftMessage}
                </p>
              ) : null}
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="관리 멤버" />
          <div className="space-y-3">
            {summary.members.map((member) => (
              <Card className="p-4" key={member.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16804b]">
                      <PetIcon className="h-3.5 w-3.5" name="profile" />
                      {member.role}
                    </p>
                    <h2 className="mt-1 text-base font-black text-[#1f2922]">{member.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#667262]">{member.permission}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f0f3ed] px-2.5 py-1 text-xs font-bold text-[#667262]">{member.status}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="활동 기록" />
          <Card>
            <ul className="space-y-2">
              {summary.activityItems.map((item) => (
                <li className="rounded-xl bg-[#f4f7f0] px-3 py-2 text-xs font-semibold leading-5 text-[#3d4639]" key={item}>
                  <PetIcon className="mr-1 inline h-3.5 w-3.5 text-[#16804b]" name="activity" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card className="bg-[#fffaf0]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b56d19]">
                <PetIcon className="h-4 w-4" name="bell" />
                알림 공유 범위
              </p>
              <p className="mt-2 text-sm leading-6 text-[#65533a]">{summary.notificationSharingDetail}</p>
            </div>
            <button
              aria-pressed={sharedCareState.notificationSharingEnabled}
              className={`h-8 min-w-14 rounded-full px-3 text-xs font-black ${
                sharedCareState.notificationSharingEnabled ? "bg-[#16804b] text-white" : "bg-white text-[#8a7050]"
              }`}
              onClick={() => updateSharedCareState({ notificationSharingEnabled: !sharedCareState.notificationSharingEnabled })}
              type="button"
            >
              {sharedCareState.notificationSharingEnabled ? "ON" : "OFF"}
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#7b6b4d]">실제 초대 발송과 권한 검증은 서버 연결 후 적용합니다.</p>
        </Card>
      </div>
    </AppShell>
  );
}
