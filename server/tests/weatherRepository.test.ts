import { describe, expect, it } from "vitest";
import { DatasetUnavailableError, WeatherRepository, parseRecord } from "../src/weatherRepository.js";

const validRecord = {
  state: "California",
  abbreviation: "CA",
  average_temperature_f: 59.9,
  average_precipitation_in: 22.2,
};

describe("parseRecord", () => {
  it("returns a normalised record for valid input", () => {
    expect(parseRecord(validRecord, "NOAA")).toEqual({ ...validRecord, source: "NOAA" });
  });

  it.each([
    ["non-object input", "California"],
    ["missing abbreviation", { ...validRecord, abbreviation: undefined }],
    ["lowercase abbreviation", { ...validRecord, abbreviation: "ca" }],
    ["three letter abbreviation", { ...validRecord, abbreviation: "CAL" }],
    ["script injection in state name", { ...validRecord, state: "<script>alert(1)</script>" }],
    ["non numeric temperature", { ...validRecord, average_temperature_f: "hot" }],
    ["out of range temperature", { ...validRecord, average_temperature_f: 5000 }],
    ["negative precipitation", { ...validRecord, average_precipitation_in: -1 }],
    ["NaN precipitation", { ...validRecord, average_precipitation_in: Number.NaN }],
  ])("rejects %s", (_label, record) => {
    expect(parseRecord(record, "NOAA")).toBeNull();
  });

  it("ignores unexpected extra properties", () => {
    const parsed = parseRecord({ ...validRecord, malicious: "<img onerror=x>" }, "NOAA");
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("malicious");
  });
});

describe("WeatherRepository", () => {
  const dataset = {
    source: "NOAA test",
    sourceUrl: "https://example.org",
    retrievedOn: "2024-01-01",
    states: [
      { ...validRecord, state: "Texas", abbreviation: "TX" },
      validRecord,
      { state: "Broken", abbreviation: "??", average_temperature_f: 1, average_precipitation_in: 1 },
    ],
  };

  it("keeps only valid records, sorted by state name", () => {
    const repository = new WeatherRepository(dataset);
    expect(repository.size).toBe(2);
    expect(repository.listStates()).toEqual([
      { state: "California", abbreviation: "CA" },
      { state: "Texas", abbreviation: "TX" },
    ]);
  });

  it("looks up states case-insensitively", () => {
    const repository = new WeatherRepository(dataset);
    expect(repository.findByAbbreviation("ca")?.state).toBe("California");
    expect(repository.findByAbbreviation("ZZ")).toBeUndefined();
  });

  it("throws when no valid records remain", () => {
    expect(
      () =>
        new WeatherRepository({ source: "NOAA test", sourceUrl: "", retrievedOn: "", states: [{ bad: true }] }),
    ).toThrow(DatasetUnavailableError);
  });
});
