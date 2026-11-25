// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, confirmSaved, createSeq, pendingChanges, pruneOldDrafts, rememberChange } from "./draftStore";

describe("draftStore", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a change until the server confirms one at least as new", () => {
    rememberChange("a", "w:1", "draft one", 10);
    confirmSaved("a", "w:1", 9); // an older save came back: keep the copy
    expect(pendingChanges("a")["w:1"].value).toBe("draft one");
    confirmSaved("a", "w:1", 10);
    expect(pendingChanges("a")).toEqual({});
    expect(localStorage.getItem("prepband.draft.a")).toBeNull();
  });

  it("a newer change replaces the older copy", () => {
    rememberChange("a", "q:1", "A", 1);
    rememberChange("a", "q:1", "B", 2);
    expect(pendingChanges("a")["q:1"]).toEqual({ value: "B", seq: 2 });
  });

  it("survives corrupt storage and clears per attempt", () => {
    localStorage.setItem("prepband.draft.bad", "{not json");
    expect(pendingChanges("bad")).toEqual({});
    rememberChange("a", "q:1", "A", 1);
    rememberChange("b", "q:1", "B", 1);
    clearDraft("a");
    expect(pendingChanges("a")).toEqual({});
    expect(pendingChanges("b")["q:1"].value).toBe("B");
  });

  it("drops drafts nobody reopened for a month", () => {
    rememberChange("a", "q:1", "A", 1);
    pruneOldDrafts(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(pendingChanges("a")).toEqual({});
  });

  it("change numbers only go up, even past a number from another device", () => {
    const seq = createSeq();
    const first = seq.next();
    expect(seq.next()).toBeGreaterThan(first);
    const farFuture = Date.now() + 10_000_000;
    seq.raise(farFuture);
    expect(seq.next()).toBe(farFuture + 1);
  });
});
