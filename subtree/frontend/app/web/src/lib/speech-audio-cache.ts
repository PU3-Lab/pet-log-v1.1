export type SpeechAudioSynthesizer = (text: string, voice?: string) => Promise<Blob>;

const speechAudioCache = new Map<string, Promise<Blob>>();

export function getSpeechAudioCacheKey(text: string, voice?: string) {
  return JSON.stringify({ text: text.trim(), voice: voice ?? "" });
}

export function getCachedSpeechAudio(text: string, synthesize: SpeechAudioSynthesizer, voice?: string) {
  const normalizedText = text.trim();
  const cacheKey = getSpeechAudioCacheKey(normalizedText, voice);
  const cachedAudio = speechAudioCache.get(cacheKey);
  if (cachedAudio) {
    return cachedAudio;
  }

  const audio = synthesize(normalizedText, voice).catch((error: unknown) => {
    speechAudioCache.delete(cacheKey);
    throw error;
  });
  speechAudioCache.set(cacheKey, audio);
  return audio;
}

export function preloadCachedSpeechAudio(text: string, synthesize: SpeechAudioSynthesizer, voice?: string) {
  void getCachedSpeechAudio(text, synthesize, voice).catch(() => undefined);
}

export function clearSpeechAudioCache() {
  speechAudioCache.clear();
}
