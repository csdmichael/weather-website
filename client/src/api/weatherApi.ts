export interface StateSummary {
  state: string;
  abbreviation: string;
}

export interface StateWeatherAverage extends StateSummary {
  average_temperature_f: number;
  average_precipitation_in: number;
  source: string;
}

/** Base URL of the weather API. Empty by default so the SPA calls its own origin. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiRequestError("Unable to reach the weather service. Check your connection and retry.", 0);
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? "No weather averages are available for that state."
        : "The weather service is temporarily unavailable. Please try again.";
    throw new ApiRequestError(message, response.status);
  }

  return (await response.json()) as T;
}

export function fetchStates(signal?: AbortSignal): Promise<StateSummary[]> {
  return requestJson<StateSummary[]>("/api/states", signal);
}

export function fetchStateWeather(
  abbreviation: string,
  signal?: AbortSignal,
): Promise<StateWeatherAverage> {
  return requestJson<StateWeatherAverage>(`/api/weather/${encodeURIComponent(abbreviation)}`, signal);
}
