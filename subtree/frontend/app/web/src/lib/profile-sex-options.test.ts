import { strict as assert } from "node:assert";
import { isProfileSexOption, profileSexOptions } from "./profile-sex-options";

assert.deepEqual(
  profileSexOptions.map((option) => option.value),
  ["남아", "여아", "중성화남아", "중성화여아"],
);

assert.equal(isProfileSexOption("여아"), true);
assert.equal(isProfileSexOption("중성화여아"), true);
assert.equal(isProfileSexOption(""), false);
assert.equal(isProfileSexOption("암컷"), false);
