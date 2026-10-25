import { useState, useEffect, useCallback, useRef } from "react";
import { fetchResults, getCandidatePhotoUrl } from "../api/tse";
import type { ElectionResult, CandidateDisplay } from "../types/tse";

const POLL_INTERVAL = 30;

export function useElectionResults(
  electionCd: string | null,
  cargoCd: string | null,
  uf: string
) {
  const [result, setResult] = useState<ElectionResult | null>(null);
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    if (!electionCd || !cargoCd) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchResults(electionCd, cargoCd, uf);
      setResult(data);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setLastUpdate(
        `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      );

      const parsed: CandidateDisplay[] = [];
      const cargo = data.carg.find((c) => c.cd === cargoCd);
      if (!cargo) return;

      for (const agr of cargo.agr) {
        for (const par of agr.par) {
          for (const cand of par.cand) {
            parsed.push({
              number: cand.n,
              name: cand.nmu,
              party: par.sg,
              coalition: agr.com,
              votes: parseInt(cand.vap, 10),
              percentage: cand.pvap,
              elected: cand.e === "s",
              status: cand.st,
              photoUrl: getCandidatePhotoUrl(electionCd, uf, cand.sqcand),
              vice: cand.vs?.[0]?.nmu,
              seq: parseInt(cand.seq, 10),
            });
          }
        }
      }

      parsed.sort((a, b) => a.seq - b.seq);
      setCandidates(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
      setCountdown(POLL_INTERVAL);
    }
  }, [electionCd, cargoCd, uf]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);

    if (!autoRefresh) return;

    setCountdown(POLL_INTERVAL);
    intervalRef.current = setInterval(load, POLL_INTERVAL * 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? POLL_INTERVAL : prev - 1));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [autoRefresh, load]);

  return {
    result,
    candidates,
    loading,
    error,
    lastUpdate,
    refresh: load,
    autoRefresh,
    setAutoRefresh,
    countdown,
  };
}
