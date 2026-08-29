import { createApp } from "./app.js";
import { getWeatherRepository } from "./weatherRepository.js";

const port = Number(process.env.PORT ?? 3001);

try {
  // Fail fast (and loudly) when the bundled dataset cannot be validated.
  getWeatherRepository();
} catch (error) {
  console.error("Weather dataset validation failed:", error);
}

createApp().listen(port, () => {
  console.log(`Weather API listening on port ${port}`);
});
