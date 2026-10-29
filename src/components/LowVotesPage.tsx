import { useState, useRef, useCallback } from "react";
import { fetchMunicipalities, fetchMunicipalityResults } from "../api/tse";
import type { Municipality } from "../types/tse";

const LULA = "13";
const FLAVIO = "22";
const THRESHOLD = 1000;
const CONCURRENCY = 40;

interface MunRow {
  mun: string;
  uf: string;
  flavio: number;
  lula: number;
}

type SortKey = "mun" | "uf" | "flavio" | "lula";

async function pooled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: () => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = await tasks[i]();
      } catch {
        results[i] = undefined as T;
      }
      onProgress();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export function LowVotesPage({ electionCd, cargoCd }: { electionCd: string; cargoCd: string }) {
  const [rows, setRows] = useState<MunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("mun");
  const [sortAsc, setSortAsc] = useState(true);
  const abortRef = useRef(false);

  const load = useCallback(async () => {
    if (!electionCd || !cargoCd) return;
    abortRef.current = false;
    setLoading(true);
    setDone(false);
    setError(null);
    setRows([]);

    try {
      const config = await fetchMunicipalities(electionCd);
      const allMuns: { mun: Municipality; uf: string }[] = [];
      for (const state of config.abr) {
        if (state.cd.toLowerCase() === "zz") continue;
        for (const mun of state.mu) {
          allMuns.push({ mun, uf: state.cd.toUpperCase() });
        }
      }

      setProgress({ done: 0, total: allMuns.length });
      const found: MunRow[] = [];
      let completed = 0;

      const tasks = allMuns.map(({ mun, uf }) => async () => {
        if (abortRef.current) return null;
        try {
          const data = await fetchMunicipalityResults(
            electionCd, cargoCd, uf.toLowerCase(), mun.cd
          );
          const cargo = data.carg.find((c) => c.cd === cargoCd);
          if (!cargo) return null;

          let flavio = 0;
          let lula = 0;
          for (const agr of cargo.agr) {
            for (const par of agr.par) {
              for (const cand of par.cand) {
                if (cand.n === FLAVIO) flavio = parseInt(cand.vap, 10);
                if (cand.n === LULA) lula = parseInt(cand.vap, 10);
              }
            }
          }

          if (flavio < THRESHOLD || lula < THRESHOLD) {
            const row: MunRow = { mun: mun.nm, uf, flavio, lula };
            found.push(row);
            setRows([...found]);
          }
          return null;
        } catch {
          return null;
        }
      });

      await pooled(tasks, CONCURRENCY, () => {
        completed++;
        if (completed % 50 === 0 || completed === allMuns.length) {
          setProgress({ done: completed, total: allMuns.length });
        }
      });

      setRows([...found]);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [electionCd, cargoCd]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "mun" || key === "uf");
    }
  }

  function abort() {
    abortRef.current = true;
  }

  const sorted = [...rows].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "mun") return dir * a.mun.localeCompare(b.mun);
    if (sortKey === "uf") return dir * a.uf.localeCompare(b.uf);
    return dir * (a[sortKey] - b[sortKey]);
  });

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  if (!electionCd || !cargoCd) {
    return (
      <div className="empty-state">
        <p>Selecione uma eleicao e cargo.</p>
      </div>
    );
  }

  return (
    <div className="section-page">
      {!loading && !done && (
        <div className="low-votes-start">
          <p>
            Busca municipios onde <strong>Flavio Bolsonaro (22)</strong> ou{" "}
            <strong>Lula (13)</strong> tiveram menos de {THRESHOLD.toLocaleString("pt-BR")} votos.
          </p>
          <p className="low-votes-warn">
            Serao consultados ~5.500 municipios. Isso pode levar alguns minutos.
          </p>
          <button className="refresh-btn" onClick={load}>
            Iniciar busca
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p>
            Consultando municipios... {progress.done.toLocaleString("pt-BR")}/{progress.total.toLocaleString("pt-BR")} ({pct}%)
          </p>
          <div className="progress-bar" style={{ maxWidth: 400, margin: "12px auto 0" }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
            {rows.length} municipios encontrados ate agora
          </p>
          <button
            className="polling-toggle on"
            style={{ marginTop: 12 }}
            onClick={abort}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p>{error}</p>
        </div>
      )}

      {(done || rows.length > 0) && (
        <>
          <div className="section-header">
            <h2 className="results-title">
              Municipios com menos de {THRESHOLD.toLocaleString("pt-BR")} votos
            </h2>
            <span className="section-total">
              {rows.length} municipios encontrados
            </span>
          </div>
          {done && (
            <button
              className="polling-toggle"
              style={{ marginBottom: 16 }}
              onClick={load}
            >
              Buscar novamente
            </button>
          )}
          <div className="section-table-wrapper">
            <table className="section-table">
              <thead>
                <tr>
                  <th
                    className="th-sortable"
                    onClick={() => handleSort("mun")}
                  >
                    Municipio {sortKey === "mun" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="th-sortable"
                    onClick={() => handleSort("uf")}
                  >
                    UF {sortKey === "uf" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="th-sortable th-right"
                    onClick={() => handleSort("flavio")}
                  >
                    Flavio (22) {sortKey === "flavio" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="th-sortable th-right"
                    onClick={() => handleSort("lula")}
                  >
                    Lula (13) {sortKey === "lula" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={`${r.uf}-${r.mun}`}>
                    <td>{r.mun}</td>
                    <td>{r.uf}</td>
                    <td className={`td-votes ${r.flavio < THRESHOLD ? "td-low" : ""}`}>
                      {r.flavio.toLocaleString("pt-BR")}
                    </td>
                    <td className={`td-votes ${r.lula < THRESHOLD ? "td-low" : ""}`}>
                      {r.lula.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
