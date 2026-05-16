import { strict as assert } from "node:assert";
import { ageInputValue, ageLabelFromInput, weightInputValue, weightLabelFromInput } from "./profile-field-formatters";

assert.equal(ageInputValue("8살"), "8");
assert.equal(ageInputValue("8abc살"), "8");
assert.equal(ageLabelFromInput("8"), "8살");
assert.equal(ageLabelFromInput(""), "");

assert.equal(weightInputValue("3.4kg"), "3.4");
assert.equal(weightInputValue("3..4kg"), "3.4");
assert.equal(weightInputValue("abc3.4kg"), "3.4");
assert.equal(weightLabelFromInput("3.4"), "3.4kg");
assert.equal(weightLabelFromInput(""), "");
