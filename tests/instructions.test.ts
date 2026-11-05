import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { instructions } from "../src/shared/guide-instructions.js";

const addition = 'End successful guidance answers with exactly: "Check Alberta.ca for current requirements."\n';
const scopeRule = "Before asking a clarification question, check whether the request is within Alberta driver's licence renewal. For unrelated services such as tax credits, clearly say this guide only covers licence renewal and has no reviewed match. Do not ask which unrelated service the user means or offer to help with it. Ask topic clarification only when the request could be about licence renewal.\n";
test("packaged Foundry instructions include the requested success-only closing sentence once", () => {
  assert.ok(instructions.endsWith(addition));
  assert.equal(instructions.split("Check Alberta.ca for current requirements.").length - 1, 1);
});
test("the instruction exercise preserves every existing starter safety instruction", () => {
  assert.ok(instructions.endsWith(scopeRule + addition));
  const original = instructions.slice(0, -(scopeRule.length + addition.length));
  assert.equal(createHash("sha256").update(original).digest("hex"),
    "b6ac09a4cfdba171cb64790239dce788b3ce25771017102e07217afb225a23b1");
});
test("unrelated services are rejected before asking a topic clarification", () => {
  assert.equal(instructions.split(scopeRule).length - 1, 1);
});
