# 2026-05-13 Notification TTS Sprint

## Goal

Connect care notifications to text-to-speech so newly generated unread notifications can be announced with Korean audio.

## Decisions

- Use the backend Edge TTS provider, not browser speech synthesis.
- Trigger TTS only for unread notifications that appear after initial app load.
- Keep notification read state separate from TTS playback state.
- Treat browser autoplay failures as non-fatal.

## Implementation Scope

- Add a FastAPI speech synthesis endpoint that returns `audio/mpeg`.
- Add a Next.js API proxy for the synthesis endpoint.
- Add a frontend API client for audio synthesis.
- Add notification TTS selection and playback queue logic in the provider.
- Store spoken notification IDs in `localStorage` to avoid duplicate playback.

## Out of Scope

- Push notifications and OS-level notifications.
- Browser TTS fallback.
- Voice preference UI.
- Per-notification playback controls.

## Acceptance Criteria

- Initial unread notifications do not auto-play on first load.
- A newly created unread notification is synthesized once.
- Already spoken notification IDs are skipped after reload.
- Multiple new notifications are played sequentially.
- TTS playback failures do not break app state.
