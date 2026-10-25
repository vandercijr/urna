import type { ElectionOption } from "../api/tse";
import { UF_LIST } from "../types/tse";

interface FiltersProps {
  elections: ElectionOption[];
  selectedElection: string;
  selectedCargo: string;
  selectedUf: string;
  onElectionChange: (cd: string) => void;
  onCargoChange: (cd: string) => void;
  onUfChange: (uf: string) => void;
  availableCargos: { cd: string; ds: string }[];
}

export function Filters({
  elections,
  selectedElection,
  selectedCargo,
  selectedUf,
  onElectionChange,
  onCargoChange,
  onUfChange,
  availableCargos,
}: FiltersProps) {
  const needsState = selectedCargo !== "1";

  return (
    <div className="filters">
      <div className="filter-group">
        <label>Eleição</label>
        <select
          value={selectedElection}
          onChange={(e) => onElectionChange(e.target.value)}
        >
          <option value="">Selecione...</option>
          {elections.map((el) => (
            <option key={el.cd} value={el.cd}>
              {el.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Cargo</label>
        <select
          value={selectedCargo}
          onChange={(e) => onCargoChange(e.target.value)}
          disabled={!selectedElection}
        >
          <option value="">Selecione...</option>
          {availableCargos.map((c) => (
            <option key={c.cd} value={c.cd}>
              {c.ds}
            </option>
          ))}
        </select>
      </div>

      {needsState && (
        <div className="filter-group">
          <label>Estado</label>
          <select
            value={selectedUf}
            onChange={(e) => onUfChange(e.target.value)}
          >
            {UF_LIST.map((uf) => (
              <option key={uf.cd} value={uf.cd}>
                {uf.ds}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
