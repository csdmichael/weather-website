import type { StateWeatherAverage } from "../api/weatherApi";

interface WeatherCardProps {
  weather: StateWeatherAverage;
}

const temperatureFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function WeatherCard({ weather }: WeatherCardProps) {
  return (
    <article className="weather-card" aria-labelledby="weather-card-title">
      <h2 className="weather-card__title" id="weather-card-title">
        {weather.state} <span className="weather-card__abbr">({weather.abbreviation})</span>
      </h2>

      <dl className="weather-card__metrics">
        <div className="weather-card__metric">
          <dt>Average temperature</dt>
          <dd>
            {temperatureFormatter.format(weather.average_temperature_f)}&nbsp;°F
            <span className="weather-card__secondary">
              {temperatureFormatter.format(toCelsius(weather.average_temperature_f))}&nbsp;°C
            </span>
          </dd>
        </div>
        <div className="weather-card__metric">
          <dt>Average annual precipitation</dt>
          <dd>
            {temperatureFormatter.format(weather.average_precipitation_in)}&nbsp;in
            <span className="weather-card__secondary">
              {temperatureFormatter.format(weather.average_precipitation_in * 25.4)}&nbsp;mm
            </span>
          </dd>
        </div>
      </dl>

      <p className="weather-card__source">Source: {weather.source}</p>
    </article>
  );
}
