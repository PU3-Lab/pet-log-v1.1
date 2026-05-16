import { strict as assert } from "node:assert";
import {
  canUseProfileCameraStream,
  getProfileCameraConstraints,
  getProfilePhotoError,
  maxProfilePhotoBytes,
} from "./profile-photo";

assert.equal(getProfilePhotoError({ size: 120_000, type: "image/jpeg" }), "");
assert.equal(getProfilePhotoError({ size: 120_000, type: "image/png" }), "");
assert.ok(getProfilePhotoError({ size: 120_000, type: "application/pdf" }).includes("이미지"));
assert.ok(getProfilePhotoError({ size: maxProfilePhotoBytes + 1, type: "image/jpeg" }).includes("2MB"));

assert.equal(canUseProfileCameraStream({ mediaDevices: { getUserMedia: async () => ({}) } }), true);
assert.equal(canUseProfileCameraStream({ mediaDevices: {} }), false);
assert.equal(canUseProfileCameraStream({}), false);
assert.deepEqual(getProfileCameraConstraints(), {
  audio: false,
  video: { facingMode: { ideal: "environment" } },
});
