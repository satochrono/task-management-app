import { describe, expect, it } from "vitest";

import { InvalidTaskStatusTransitionError } from "@/modules/task/domain/errors/invalid-task-status-transition-error";
import {
  assertTaskStatusTransition,
  type TaskStatus,
} from "@/modules/task/domain/task";

describe("assertTaskStatusTransition", () => {
  const allowedTransitions: ReadonlyArray<readonly [TaskStatus, TaskStatus]> = [
    ["TODO", "TODO"],
    ["TODO", "IN_PROGRESS"],
    ["TODO", "DONE"],
    ["IN_PROGRESS", "TODO"],
    ["IN_PROGRESS", "IN_PROGRESS"],
    ["IN_PROGRESS", "DONE"],
    ["DONE", "IN_PROGRESS"],
    ["DONE", "DONE"],
  ];

  it.each(allowedTransitions)(
    "allows %s -> %s",
    (currentStatus, nextStatus) => {
      expect(() => {
        assertTaskStatusTransition(currentStatus, nextStatus);
      }).not.toThrow();
    },
  );

  it("rejects DONE -> TODO", () => {
    expect(() => {
      assertTaskStatusTransition("DONE", "TODO");
    }).toThrow(InvalidTaskStatusTransitionError);
  });
});
