import { useState } from "react";
import type { CandidateDisplay } from "../types/tse";

interface CandidateCardProps {
  candidate: CandidateDisplay;
  isLeading: boolean;
}

export function CandidateCard({ candidate, isLeading }: CandidateCardProps) {
  const [imgError, setImgError] = useState(false);
  const pct = parseFloat(candidate.percentage.replace(",", "."));

  return (
    <div
      className={`candidate-card ${isLeading ? "leading" : ""} ${candidate.elected ? "elected" : ""}`}
    >
      <div className="candidate-photo">
        {!imgError ? (
          <img
            src={candidate.photoUrl}
            alt={candidate.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="photo-placeholder">{candidate.number}</div>
        )}
      </div>

      <div className="candidate-info">
        <div className="candidate-header">
          <span className="candidate-number">{candidate.number}</span>
          <h3 className="candidate-name">{candidate.name}</h3>
          {candidate.elected && <span className="elected-badge">Eleito</span>}
          {candidate.status === "2º turno" && (
            <span className="turno2-badge">2º Turno</span>
          )}
        </div>

        <div className="candidate-party">
          {candidate.party}
          {candidate.vice && <span> · Vice: {candidate.vice}</span>}
        </div>

        <div className="candidate-votes">
          <div className="vote-bar-container">
            <div
              className="vote-bar"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="vote-numbers">
            <span className="vote-pct">{candidate.percentage}%</span>
            <span className="vote-count">
              {candidate.votes.toLocaleString("pt-BR")} votos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
