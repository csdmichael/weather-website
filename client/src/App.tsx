import { useCallback, useEffect, useState } from "react";
import { StateSelector } from "./components/StateSelector";
import { WeatherCard } from "./components/WeatherCard";
import {
  ApiRequestError,
  fetchStateWeather,
  fetchStates,
  type StateSummary,
  type StateWeatherAverage,
} from "./api/weatherApi";
import "./App.css";

function toMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong while loading weather data.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function App() {
  const [states, setStates] = useState<StateSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [weather, setWeather] = useState<StateWeatherAverage | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const loadStates = useCallback((signal?: AbortSignal) => {
    setLoadingStates(true);
    setError(null);
    return fetchStates(signal)
      .then((result) => setStates(result))
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) {
          setError(toMessage(cause));
        }
      })
      .finally(() => {
        if (!signal?.aborted) {
          setLoadingStates(false);
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadStates(controller.signal);
    return () => controller.abort();
  }, [loadStates]);

  useEffect(() => {
    if (!selected) {
      setWeather(null);
      return;
    }

    const controller = new AbortController();
    setLoadingWeather(true);
    setError(null);

    fetchStateWeather(selected, controller.signal)
      .then((result) => setWeather(result))
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) {
          setWeather(null);
          setError(toMessage(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingWeather(false);
        }
      });

    return () => controller.abort();
  }, [selected, retryToken]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>US State Weather Averages</h1>
        <p className="app__subtitle">
          Compare long-term average temperature and precipitation across the United States.
        </p>
      </header>

      <main className="app__main">
        <StateSelector
          states={states}
          selected={selected}
          disabled={loadingStates}
          onChange={setSelected}
        />

        <div className="app__results" aria-live="polite" aria-busy={loadingStates || loadingWeather}>
          {loadingStates && <p className="app__status">Loading states…</p>}

          {error && (
            <div className="app__error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (states.length === 0) {
                    void loadStates();
                  }
                  setRetryToken((token) => token + 1);
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!error && loadingWeather && <p className="app__status">Loading weather averages…</p>}

          {!error && !loadingWeather && weather && <WeatherCard weather={weather} />}

          {!error && !loadingWeather && !weather && !loadingStates && (
            <p className="app__status">Select a state to see its weather averages.</p>
          )}
        </div>
      </main>

      <footer className="app__footer">
        <p>Averages are provided for informational purposes only.</p>
      </footer>
    </div>
  );
}
