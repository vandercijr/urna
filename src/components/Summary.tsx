import type { ElectionResult } from "../types/tse";

interface SummaryProps {
  result: ElectionResult;
}

function formatNumber(n: string): string {
  return parseInt(n, 10).toLocaleString("pt-BR");
}

export function Summary({ result }: SummaryProps) {
  const { s, e, v } = result;
  const apuracao = result.tf === "s" ? "Finalizada" : "Em andamento";
  const sectionsPct = parseFloat(s.pst.replace(",", "."));

  return (
    <div className="summary">
      <div className="summary-card highlight">
        <span className="summary-label">Seções apuradas</span>
        <span className="summary-value">{s.pst}%</span>
        <span className="summary-detail">
          {formatNumber(s.st)} de {formatNumber(s.ts)}
        </span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(sectionsPct, 100)}%` }}
          />
        </div>
      </div>

      <div className="summary-card">
        <span className="summary-label">Comparecimento</span>
        <span className="summary-value">{e.pc}%</span>
        <span className="summary-detail">{formatNumber(e.c)} eleitores</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Abstenção</span>
        <span className="summary-value">{e.pa}%</span>
        <span className="summary-detail">{formatNumber(e.a)} eleitores</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Votos válidos</span>
        <span className="summary-value">{formatNumber(v.vvc)}</span>
        <span className="summary-detail">{v.pvvc}% do total</span>
      </div>

      <div className="summary-card">
        <span className="summary-label">Brancos / Nulos</span>
        <span className="summary-value">
          {formatNumber(v.vb)} / {formatNumber(v.vn)}
        </span>
        <span className="summary-detail">
          {v.pvb}% / {v.pvn}%
        </span>
      </div>

      <div className={`summary-card ${result.tf === "s" ? "done" : "live"}`}>
        <span className="summary-label">Apuração</span>
        <span className="summary-value">{apuracao}</span>
        {result.tf !== "s" && <span className="pulse" />}
      </div>
    </div>
  );
}
