/**
 * Domain types for the weather-by-state API.
 * Field names follow the approved data contract in docs/architecture-design.md.
 */

export interface StateSummary {
  state: string;
  abbreviation: string;
}

export interface StateWeatherAverage extends StateSummary {
  average_temperature_f: number;
  average_precipitation_in: number;
  source: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
