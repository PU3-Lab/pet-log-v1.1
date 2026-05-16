export function ageInputValue(age: string) {
  return age.replace(/[^\d]/g, "");
}

export function ageLabelFromInput(age: string) {
  const digits = ageInputValue(age);
  return digits ? `${digits}살` : "";
}

export function weightInputValue(weight: string) {
  const normalized = weight.replace(/[^\d.]/g, "");
  const [firstPart, ...restParts] = normalized.split(".");
  if (restParts.length === 0) {
    return firstPart;
  }
  return `${firstPart}.${restParts.join("")}`;
}

export function weightLabelFromInput(weight: string) {
  const value = weightInputValue(weight);
  return value ? `${value}kg` : "";
}
