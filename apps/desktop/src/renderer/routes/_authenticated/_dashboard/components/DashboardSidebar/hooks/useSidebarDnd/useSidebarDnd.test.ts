import { describe, expect, it, test } from "bun:test";
import {
	hasInFlightRowWrite,
	planExternalSync,
	projectSectionFromNeighbors,
	toStoredProjectLane,
} from "./useSidebarDnd";

const dropped = new Set(["a", "b"]);

describe("hasInFlightRowWrite", () => {
	test("holds while a row the drop wrote has an unsettled host update", () => {
		expect(hasInFlightRowWrite({ a: { type: "update" } }, dropped)).toBe(true);
		expect(hasInFlightRowWrite({ b: { type: "update" } }, dropped)).toBe(true);
	});

	test("ignores updates for rows the drop did not touch", () => {
		expect(hasInFlightRowWrite({ zzz: { type: "update" } }, dropped)).toBe(
			false,
		);
	});

	test("does not hold on inserts or deletes", () => {
		expect(
			hasInFlightRowWrite(
				{ a: { type: "insert" }, b: { type: "delete" } },
				dropped,
			),
		).toBe(false);
	});

	test("is false with nothing in flight or nothing dropped", () => {
		expect(hasInFlightRowWrite({}, dropped)).toBe(false);
		expect(hasInFlightRowWrite({ a: { type: "update" } }, new Set())).toBe(
			false,
		);
	});
});

describe("planExternalSync", () => {
	test("holds while the drop's write is in flight, whatever the props say", () => {
		expect(
			planExternalSync({
				inFlight: true,
				wasHeld: false,
				fingerprint: "stale",
				prevFingerprint: "synced",
			}),
		).toBe("hold");
	});

	test("syncs on a data change when nothing was held", () => {
		expect(
			planExternalSync({
				inFlight: false,
				wasHeld: false,
				fingerprint: "b",
				prevFingerprint: "a",
			}),
		).toBe("sync");
	});

	test("skips when nothing changed and nothing was held", () => {
		expect(
			planExternalSync({
				inFlight: false,
				wasHeld: false,
				fingerprint: "a",
				prevFingerprint: "a",
			}),
		).toBe("skip");
	});

	test("rejected write: props roll back to the pre-drop shape, still reconciles", () => {
		// The hold kept the optimistic order on screen; the rolled-back props
		// fingerprint exactly what was last synced, so only the held flag can
		// force the model back to the truth.
		expect(
			planExternalSync({
				inFlight: false,
				wasHeld: true,
				fingerprint: "pre-drop",
				prevFingerprint: "pre-drop",
			}),
		).toBe("sync");
	});
});

describe("projects lane", () => {
	const ids = ["a", "psec::work", "b", "psec::closed", "c", "d"];
	const model = {
		membership: { b: "psec::work", c: "psec::closed" },
		collapsedSectionIds: new Set(["psec::closed"]),
	};

	it("a project joins the section whose header or project is above it", () => {
		expect(
			projectSectionFromNeighbors(["a", "psec::work", "x"], model, "x"),
		).toBe("psec::work");
		expect(projectSectionFromNeighbors(ids, model, "b")).toBe("psec::work");
		expect(projectSectionFromNeighbors(ids, model, "a")).toBeNull();
	});

	it("a collapsed section's header doesn't capture a dropped project", () => {
		expect(
			projectSectionFromNeighbors(["psec::closed", "x"], model, "x"),
		).toBeNull();
	});

	it("unwraps section ids for persistence", () => {
		expect(
			toStoredProjectLane(["psec::work", "b", "a"], model.membership),
		).toEqual([
			{ type: "section", id: "work" },
			{ type: "project", id: "b", sectionId: "work" },
			{ type: "project", id: "a", sectionId: null },
		]);
	});
});
