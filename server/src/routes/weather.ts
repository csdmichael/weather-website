import { Router } from "express";
import type { Request, Response } from "express";
import {
  DatasetUnavailableError,
  getWeatherRepository,
  type RepositoryProvider,
  type WeatherRepository,
} from "../weatherRepository.js";
import type { ApiError } from "../types.js";

const ABBREVIATION_PATTERN = /^[A-Za-z]{2}$/;

function errorBody(code: string, message: string): ApiError {
  return { error: { code, message } };
}

function withRepository(
  provider: RepositoryProvider,
  res: Response,
  handler: (repository: WeatherRepository) => void,
): void {
  let repository: WeatherRepository;
  try {
    repository = provider();
  } catch (error) {
    if (error instanceof DatasetUnavailableError) {
      res
        .status(503)
        .json(errorBody("DATA_UNAVAILABLE", "Weather data is temporarily unavailable. Please retry later."));
      return;
    }
    throw error;
  }
  handler(repository);
}

/** Creates the weather API router. The repository provider is injectable to simplify testing. */
export function createWeatherRouter(provider: RepositoryProvider = getWeatherRepository): Router {
  const router = Router();

  router.get("/states", (_req: Request, res: Response) => {
    withRepository(provider, res, (repository) => {
      res.json(repository.listStates());
    });
  });

  router.get("/weather/:stateAbbr", (req: Request, res: Response) => {
    const stateAbbr = req.params.stateAbbr;

    if (typeof stateAbbr !== "string" || !ABBREVIATION_PATTERN.test(stateAbbr)) {
      res
        .status(400)
        .json(errorBody("INVALID_STATE_ABBREVIATION", "State abbreviation must be two letters, e.g. CA."));
      return;
    }

    withRepository(provider, res, (repository) => {
      const record = repository.findByAbbreviation(stateAbbr);
      if (!record) {
        res
          .status(404)
          .json(errorBody("STATE_NOT_FOUND", "No weather averages found for the requested state."));
        return;
      }
      res.json(record);
    });
  });

  return router;
}
