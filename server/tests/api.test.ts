import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DatasetUnavailableError, WeatherRepository, getWeatherRepository } from "../src/weatherRepository.js";

const app = createApp({ clientDir: "/nonexistent-client-dir" });

describe("GET /api/health", () => {
  it("reports the number of loaded states", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.states).toBe(getWeatherRepository().size);
  });
});

describe("GET /api/states", () => {
  it("returns every US state and DC", async () => {
    const response = await request(app).get("/api/states").expect(200);
    expect(response.body).toHaveLength(51);
    expect(response.body[0]).toEqual({ state: "Alabama", abbreviation: "AL" });
    for (const entry of response.body) {
      expect(Object.keys(entry).sort()).toEqual(["abbreviation", "state"]);
    }
  });
});

describe("GET /api/weather/:stateAbbr", () => {
  it("returns weather averages matching the approved data contract", async () => {
    const response = await request(app).get("/api/weather/CA").expect(200);
    expect(response.body).toMatchObject({
      state: "California",
      abbreviation: "CA",
    });
    expect(typeof response.body.average_temperature_f).toBe("number");
    expect(typeof response.body.average_precipitation_in).toBe("number");
    expect(typeof response.body.source).toBe("string");
  });

  it("accepts lowercase abbreviations", async () => {
    await request(app).get("/api/weather/ny").expect(200);
  });

  it("returns 400 for malformed abbreviations", async () => {
    const response = await request(app).get("/api/weather/CAL").expect(400);
    expect(response.body.error.code).toBe("INVALID_STATE_ABBREVIATION");
  });

  it("returns 404 for unknown states", async () => {
    const response = await request(app).get("/api/weather/ZZ").expect(404);
    expect(response.body.error.code).toBe("STATE_NOT_FOUND");
  });

  it("returns 503 when the dataset is unavailable", async () => {
    const degradedApp = createApp({
      clientDir: "/nonexistent-client-dir",
      repositoryProvider: () => {
        throw new DatasetUnavailableError("dataset missing");
      },
    });
    const response = await request(degradedApp).get("/api/weather/CA").expect(503);
    expect(response.body.error.code).toBe("DATA_UNAVAILABLE");
  });
});

describe("API hardening", () => {
  it("returns 404 JSON for unknown API routes", async () => {
    const response = await request(app).get("/api/does-not-exist").expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("sets security headers and hides the framework", async () => {
    const response = await request(app).get("/api/states").expect(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("rate limits excessive requests", async () => {
    const limitedApp = createApp({
      clientDir: "/nonexistent-client-dir",
      rateLimitMax: 2,
      repositoryProvider: () => new WeatherRepository(),
    });
    await request(limitedApp).get("/api/states").expect(200);
    await request(limitedApp).get("/api/states").expect(200);
    const response = await request(limitedApp).get("/api/states").expect(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
});
