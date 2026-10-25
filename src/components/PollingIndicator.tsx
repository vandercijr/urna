interface PollingIndicatorProps {
  autoRefresh: boolean;
  countdown: number;
  loading: boolean;
  onToggle: (enabled: boolean) => void;
}

const POLL_INTERVAL = 30;

export function PollingIndicator({
  autoRefresh,
  countdown,
  loading,
  onToggle,
}: PollingIndicatorProps) {
  const progress = ((POLL_INTERVAL - countdown) / POLL_INTERVAL) * 100;

  return (
    <div className="polling-indicator">
      <div className="polling-status">
        <span className={`polling-dot ${autoRefresh ? "active" : "paused"}`} />
        <span className="polling-label">
          {loading
            ? "Atualizando..."
            : autoRefresh
              ? `Próxima atualização em ${countdown}s`
              : "Atualização automática pausada"}
        </span>
      </div>

      {autoRefresh && (
        <div className="polling-progress">
          <div
            className="polling-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <button
        className={`polling-toggle ${autoRefresh ? "on" : "off"}`}
        onClick={() => onToggle(!autoRefresh)}
      >
        {autoRefresh ? "⏸ Pausar" : "▶ Ativar"}
      </button>
    </div>
  );
}
