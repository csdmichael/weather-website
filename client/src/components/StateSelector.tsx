import type { StateSummary } from "../api/weatherApi";

interface StateSelectorProps {
  states: StateSummary[];
  selected: string;
  disabled?: boolean;
  onChange: (abbreviation: string) => void;
}

export function StateSelector({ states, selected, disabled = false, onChange }: StateSelectorProps) {
  return (
    <div className="state-selector">
      <label className="state-selector__label" htmlFor="state-select">
        Choose a US state
      </label>
      <select
        id="state-select"
        className="state-selector__input"
        value={selected}
        disabled={disabled || states.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a state…</option>
        {states.map(({ state, abbreviation }) => (
          <option key={abbreviation} value={abbreviation}>
            {state}
          </option>
        ))}
      </select>
    </div>
  );
}
