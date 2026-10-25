import type { ElectionResult, CandidateDisplay } from "../types/tse";
import { Summary } from "./Summary";
import { CandidateCard } from "./CandidateCard";

interface ResultsPanelProps {
  result: ElectionResult;
  candidates: CandidateDisplay[];
  loading: boolean;
  error: string | null;
}

export function ResultsPanel({
  result,
  candidates,
  loading,
  error,
}: ResultsPanelProps) {
  if (error) {
    return (
      <div className="error-container">
        <p>⚠️ {error}</p>
        <p className="error-hint">
          Os dados podem não estar disponíveis ainda. A apuração começa após o
          fechamento das urnas (17h).
        </p>
      </div>
    );
  }

  if (loading && !result) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="empty-state">
        <p>Selecione uma eleição e cargo para ver os resultados.</p>
      </div>
    );
  }

  const cargoName = result.carg[0]?.nmn || "";

  return (
    <div className="results-panel">
      <h2 className="results-title">
        {cargoName}
        {loading && <span className="inline-spinner" />}
      </h2>

      <Summary result={result} />

      <div className="candidates-grid">
        {candidates.map((c, i) => (
          <CandidateCard key={c.number} candidate={c} isLeading={i === 0} />
        ))}
      </div>
    </div>
  );
}
