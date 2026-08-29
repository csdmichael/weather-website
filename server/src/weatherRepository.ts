import rawDataset from "./data/state-weather-averages.json" with { type: "json" };
import type { StateSummary, StateWeatherAverage } from "./types.js";

/** Raised when the bundled dataset cannot be validated. */
export class DatasetUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetUnavailableError";
  }
}

interface RawDataset {
  source: string;
  sourceUrl: string;
  retrievedOn: string;
  states: unknown[];
}

const ABBREVIATION_PATTERN = /^[A-Z]{2}$/;
const MIN_TEMPERATURE_F = -100;
const MAX_TEMPERATURE_F = 150;
const MIN_PRECIPITATION_IN = 0;
const MAX_PRECIPITATION_IN = 500;
const STATE_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,49}$/;

function isFiniteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Validates and sanitises a single dataset record.
 * Untrusted dataset input is never trusted verbatim (see threat model: data poisoning).
 */
export function parseRecord(record: unknown, source: string): StateWeatherAverage | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }

  const candidate = record as Record<string, unknown>;
  const { state, abbreviation } = candidate;

  if (typeof state !== "string" || !STATE_NAME_PATTERN.test(state)) {
    return null;
  }
  if (typeof abbreviation !== "string" || !ABBREVIATION_PATTERN.test(abbreviation)) {
    return null;
  }
  if (!isFiniteNumberInRange(candidate.average_temperature_f, MIN_TEMPERATURE_F, MAX_TEMPERATURE_F)) {
    return null;
  }
  if (
    !isFiniteNumberInRange(candidate.average_precipitation_in, MIN_PRECIPITATION_IN, MAX_PRECIPITATION_IN)
  ) {
    return null;
  }

  return {
    state,
    abbreviation,
    average_temperature_f: candidate.average_temperature_f,
    average_precipitation_in: candidate.average_precipitation_in,
    source,
  };
}

/**
 * In-memory, read-only data access layer over the static dataset.
 * The dataset is validated once at construction time and cached for the process lifetime.
 */
export class WeatherRepository {
  private readonly byAbbreviation: Map<string, StateWeatherAverage>;

  constructor(dataset: RawDataset = rawDataset as RawDataset) {
    const source = typeof dataset?.source === "string" ? dataset.source : "unknown";
    const records = Array.isArray(dataset?.states) ? dataset.states : [];

    const entries = records
      .map((record) => parseRecord(record, source))
      .filter((record): record is StateWeatherAverage => record !== null)
      .sort((a, b) => a.state.localeCompare(b.state));

    if (entries.length === 0) {
      throw new DatasetUnavailableError("No valid state weather records available");
    }

    this.byAbbreviation = new Map(entries.map((entry) => [entry.abbreviation, entry]));
  }

  /** All states, sorted alphabetically by name. */
  listStates(): StateSummary[] {
    return [...this.byAbbreviation.values()].map(({ state, abbreviation }) => ({ state, abbreviation }));
  }

  /** Weather averages for a state abbreviation, or `undefined` when unknown. */
  findByAbbreviation(abbreviation: string): StateWeatherAverage | undefined {
    return this.byAbbreviation.get(abbreviation.toUpperCase());
  }

  get size(): number {
    return this.byAbbreviation.size;
  }
}

let cachedRepository: WeatherRepository | undefined;

/** Lazily builds and caches the singleton repository backed by the bundled dataset. */
export function getWeatherRepository(): WeatherRepository {
  if (!cachedRepository) {
    cachedRepository = new WeatherRepository();
  }
  return cachedRepository;
}

export type RepositoryProvider = () => WeatherRepository;
