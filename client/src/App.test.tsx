import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const states = [
  { state: "Alabama", abbreviation: "AL" },
  { state: "California", abbreviation: "CA" },
];

const californiaWeather = {
  state: "California",
  abbreviation: "CA",
  average_temperature_f: 59.9,
  average_precipitation_in: 22.2,
  source: "NOAA NCEI",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("lists all states returned by the API", async () => {
    fetchMock.mockResolvedValue(jsonResponse(states));

    render(<App />);

    const select = await screen.findByLabelText(/choose a us state/i);
    await waitFor(() => expect(screen.getByRole("option", { name: "California" })).toBeInTheDocument());
    expect(select).toBeEnabled();
    expect(screen.getByRole("option", { name: "Alabama" })).toBeInTheDocument();
  });

  it("shows weather averages for the selected state", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/api/weather/") ? jsonResponse(californiaWeather) : jsonResponse(states)),
    );

    render(<App />);
    const select = await screen.findByLabelText(/choose a us state/i);
    await waitFor(() => expect(screen.getByRole("option", { name: "California" })).toBeInTheDocument());

    await userEvent.selectOptions(select, "CA");

    expect(await screen.findByRole("heading", { name: /California/ })).toBeInTheDocument();
    expect(screen.getByText(/59\.9/)).toBeInTheDocument();
    expect(screen.getByText(/22\.2/)).toBeInTheDocument();
    expect(screen.getByText(/NOAA NCEI/)).toBeInTheDocument();
  });

  it("shows an actionable error when the weather request fails", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/api/weather/") ? jsonResponse({}, 503) : jsonResponse(states)),
    );

    render(<App />);
    const select = await screen.findByLabelText(/choose a us state/i);
    await waitFor(() => expect(screen.getByRole("option", { name: "California" })).toBeInTheDocument());

    await userEvent.selectOptions(select, "CA");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("recovers when the retry succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(states))
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValue(jsonResponse(californiaWeather));

    render(<App />);
    const select = await screen.findByLabelText(/choose a us state/i);
    await waitFor(() => expect(screen.getByRole("option", { name: "California" })).toBeInTheDocument());

    await userEvent.selectOptions(select, "CA");
    await screen.findByRole("alert");

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByRole("heading", { name: /California/ })).toBeInTheDocument();
  });

  it("surfaces network failures when loading states", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to reach the weather service/i);
  });
});
