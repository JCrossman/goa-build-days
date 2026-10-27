import assert from "node:assert/strict";
import { test } from "node:test";

test("WorkshopQaExerciseTests: intentional failure is opt-in, not an app defect", () => {
  assert.notEqual(process.env.WORKSHOP_QA_DEMONSTRATE_FAILURE, "true",
    "Intentional workshop exercise. Rerun Workshop QA with demonstrate_failure=false. This is not an application defect.");
});
