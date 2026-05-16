import type {
  RecordCategory,
  RecordCategoryChoice,
  StructuredRecord,
} from "./types";

const categoryKeywords: Record<RecordCategory, string[]> = {
  meal: ["사료", "밥", "먹", "간식", "급여", "g", "%"],
  walk: ["산책", "걷", "활동", "운동", "분"],
  stool: ["배변", "소변", "대변", "변", "설사", "토"],
  medical: ["병원", "약", "접종", "백신", "진료", "복용"],
  behavior: ["불안", "짖", "낑낑", "기다림", "흥분", "행동", "조용"],
};

/**
 * Local fallback for record structuring using keyword matching.
 * Used before backend AI analysis is complete.
 */
export function structureRecord(detail: string, fallbackCategory: RecordCategoryChoice): StructuredRecord {
  const sourceText = detail.trim();
  const matched = getCategoryMatches(sourceText)
    .sort((a, b) => b.score - a.score);

  const bestMatch = matched[0];
  const detectedCategories = getCategoryMatches(sourceText)
    .filter((match) => match.score > 0)
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((match) => match.category);
  const suggestedCategory = bestMatch && bestMatch.score > 0 ? bestMatch.category : fallbackCategory === "all" ? "meal" : fallbackCategory;
  const confidence = bestMatch?.score
    ? Math.min(0.92, 0.54 + bestMatch.score * 0.14 + (fallbackCategory === "all" || suggestedCategory === fallbackCategory ? 0.1 : 0))
    : 0.42;

  return {
    sourceText,
    normalizedSummary: createNormalizedSummary(sourceText),
    suggestedCategory,
    detectedCategories: detectedCategories.length > 0 ? detectedCategories : [suggestedCategory],
    confidence,
    measurements: [],
    needsConfirmation: confidence < 0.7 || (fallbackCategory !== "all" && suggestedCategory !== fallbackCategory),
  };
}

function createNormalizedSummary(text: string) {
  if (!text) {
    return "입력된 기록 없음";
  }

  const firstSentence = text.split(/\n|[.!?。]/)[0]?.trim() ?? text;
  return firstSentence.length > 38 ? `${firstSentence.slice(0, 38)}...` : firstSentence;
}

function getCategoryMatches(sourceText: string) {
  return Object.entries(categoryKeywords).map(([category, keywords]) => {
    const indexes = keywords.map((keyword) => sourceText.indexOf(keyword)).filter((index) => index >= 0);
    return {
      category: category as RecordCategory,
      score: indexes.length,
      firstIndex: indexes.length > 0 ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER,
    };
  });
}
