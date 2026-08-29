import { createApp } from "./app.js";
import { getWeatherRepository } from "./weatherRepository.js";

const port = Number(process.env.PORT ?? 3001);

try {
  // Validate the dataset eagerly so problems surface in the startup logs. The server still starts:
  // health reports "degraded" and the data endpoints answer 503 as required by the API contract.
  getWeatherRepository();
} catch (error) {
  console.error("Weather dataset validation failed:", error);
}

createApp().listen(port, () => {
  console.log(`Weather API listening on port ${port}`);
});
