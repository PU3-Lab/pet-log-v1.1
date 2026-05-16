export type ProfileSexOption = {
  value: string;
  label: string;
  icon: string;
};

export const profileSexOptions: ProfileSexOption[] = [
  { value: "남아", label: "남아", icon: "♂" },
  { value: "여아", label: "여아", icon: "♀" },
  { value: "중성화남아", label: "중성화남아", icon: "♂" },
  { value: "중성화여아", label: "중성화여아", icon: "♀" },
];

export function isProfileSexOption(value: string) {
  return profileSexOptions.some((option) => option.value === value);
}
