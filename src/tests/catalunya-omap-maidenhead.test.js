import {describe, expect, it} from "@jest/globals";
import {maidenheadLocator} from "../app/catalunya-omap-maidenhead";

describe("maidenheadLocator()", () => {
    it("gives ARRL's own example, FN31pr", () => {
        expect(maidenheadLocator(41.714775, -72.727260)).toBe("FN31pr");
    });

    it("places Barcelona in JN11cj", () => {
        expect(maidenheadLocator(41.3851, 2.1734)).toBe("JN11cj");
    });

    it("gives the cell that holds the origin and the south-west corner", () => {
        expect(maidenheadLocator(0, 0)).toBe("JJ00aa");
        expect(maidenheadLocator(-90, -180)).toBe("AA00aa");
    });

    it("keeps 90 N and 180 E inside the last cell instead of one past it", () => {
        expect(maidenheadLocator(90, 0)).toBe("JR09ax");
        expect(maidenheadLocator(0, 180)).toBe("RJ90xa");
    });

    it("accepts coordinates written as strings, as the markers file has them", () => {
        expect(maidenheadLocator("41.714775", "-72.727260")).toBe("FN31pr");
    });

    it("gives nothing for a missing or out-of-range coordinate", () => {
        expect(maidenheadLocator(undefined, 2)).toBe("");
        expect(maidenheadLocator(null, 2)).toBe("");
        expect(maidenheadLocator("", "")).toBe("");
        expect(maidenheadLocator("x", 2)).toBe("");
        expect(maidenheadLocator(91, 0)).toBe("");
        expect(maidenheadLocator(0, -181)).toBe("");
        expect(maidenheadLocator(NaN, 0)).toBe("");
    });
});
