import { strict as assert } from "node:assert";
import test from "node:test";
import {
  clearSpeechAudioCache,
  getCachedSpeechAudio,
  getSpeechAudioCacheKey,
  preloadCachedSpeechAudio,
  type SpeechAudioSynthesizer,
} from "./speech-audio-cache";

test("speech audio cache reuses synthesized prompts and retries failed synthesis", async () => {
  clearSpeechAudioCache();

  assert.equal(
    getSpeechAudioCacheKey("  꾸꾸의 오늘을 들려주세요  ", undefined),
    JSON.stringify({ text: "꾸꾸의 오늘을 들려주세요", voice: "" }),
  );
  assert.notEqual(
    getSpeechAudioCacheKey("꾸꾸의 오늘을 들려주세요", "ko-KR-SunHiNeural"),
    getSpeechAudioCacheKey("꾸꾸의 오늘을 들려주세요", "ko-KR-InJoonNeural"),
  );

  let synthesizeCalls = 0;
  const synthesize: SpeechAudioSynthesizer = async (text, voice) => {
    synthesizeCalls += 1;
    return new Blob([`${voice ?? "default"}:${text}`], { type: "audio/mpeg" });
  };

  const firstAudio = await getCachedSpeechAudio("꾸꾸의 오늘을 들려주세요", synthesize);
  const secondAudio = await getCachedSpeechAudio(" 꾸꾸의 오늘을 들려주세요 ", synthesize);
  assert.equal(firstAudio, secondAudio);
  assert.equal(synthesizeCalls, 1);

  await getCachedSpeechAudio("꾸꾸의 하루를 정리하고 있어요", synthesize);
  assert.equal(synthesizeCalls, 2);

  preloadCachedSpeechAudio("꾸꾸의 오늘을 들려주세요", synthesize);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(synthesizeCalls, 2);

  clearSpeechAudioCache();

  let failedCalls = 0;
  const failingSynthesizer: SpeechAudioSynthesizer = async () => {
    failedCalls += 1;
    throw new Error("tts failed");
  };

  await assert.rejects(() => getCachedSpeechAudio("다시 시도", failingSynthesizer), /tts failed/);
  await assert.rejects(() => getCachedSpeechAudio("다시 시도", failingSynthesizer), /tts failed/);
  assert.equal(failedCalls, 2);
});
