import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { instructions } from "../src/shared/guide-instructions.js";

const addition = 'End successful guidance answers with exactly: "Check Alberta.ca for current requirements."\n';
test("packaged Foundry instructions include the requested success-only closing sentence once", () => {
  assert.ok(instructions.endsWith(addition));
  assert.equal(instructions.split("Check Alberta.ca for current requirements.").length - 1, 1);
});
test("the instruction exercise preserves every existing starter safety instruction", () => {
  assert.ok(instructions.endsWith(addition));
  const original = instructions.slice(0, -addition.length);
  assert.equal(createHash("sha256").update(original).digest("hex"),
    "b6ac09a4cfdba171cb64790239dce788b3ce25771017102e07217afb225a23b1");
});
