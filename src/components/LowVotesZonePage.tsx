import { useState, useRef, useCallback } from "react";
import { fetchMunicipalities, fetchZoneResults } from "../api/tse";
import type { Municipality } from "../types/tse";

const LULA = "13";
const FLAVIO = "22";
const CONCURRENCY = 40;
const DEFAULT_THRESHOLD = 500;

interface ZoneRow {
  zone: string;
  mun: string;
  uf: string;
  flavio: number;
  lula: number;
}

type SortKey = "zone" | "mun" | "uf" | "flavio" | "lula";

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

export function LowVotesZonePage({
  electionCd,
  cargoCd,
}: {
  electionCd: string;
  cargoCd: string;
}) {
  const [allRows, setAllRows] = useState<ZoneRow[]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [inputValue, setInputValue] = useState(String(DEFAULT_THRESHOLD));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("zone");
  const [sortAsc, setSortAsc] = useState(true);
  const abortRef = useRef(false);

  const load = useCallback(async () => {
    if (!electionCd || !cargoCd) return;
    abortRef.current = false;
    setLoading(true);
    setDone(false);
    setError(null);
    setAllRows([]);

    try {
      const config = await fetchMunicipalities(electionCd);

      const tasks: {
        mun: Municipality;
        uf: string;
        zone: string;
      }[] = [];

      for (const state of config.abr) {
        if (state.cd.toLowerCase() === "zz") continue;
        for (const mun of state.mu) {
          for (const zone of mun.z) {
            tasks.push({ mun, uf: state.cd.toUpperCase(), zone });
          }
        }
      }

      setProgress({ done: 0, total: tasks.length });
      const found: ZoneRow[] = [];
      let completed = 0;

      const fetches = tasks.map(({ mun, uf, zone }) => async () => {
        if (abortRef.current) return null;
        try {
          const data = await fetchZoneResults(
            electionCd,
            cargoCd,
            uf.toLowerCase(),
            mun.cd,
            zone
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

          found.push({ zone, mun: mun.nm, uf, flavio, lula });
          return null;
        } catch {
          return null;
        }
      });

      await pooled(fetches, CONCURRENCY, () => {
        completed++;
        if (completed % 100 === 0 || completed === tasks.length) {
          setProgress({ done: completed, total: tasks.length });
          setAllRows([...found]);
        }
      });

      setAllRows([...found]);
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
      setSortAsc(key === "zone" || key === "mun" || key === "uf");
    }
  }

  function abort() {
    abortRef.current = true;
  }

  function handleThresholdChange(val: string) {
    setInputValue(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) setThreshold(n);
  }

  const filtered = allRows.filter(
    (r) => r.flavio < threshold || r.lula < threshold
  );

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "mun") return dir * a.mun.localeCompare(b.mun);
    if (sortKey === "uf") return dir * a.uf.localeCompare(b.uf);
    if (sortKey === "zone") return dir * a.zone.localeCompare(b.zone);
    return dir * (a[sortKey] - b[sortKey]);
  });

  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

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
            Busca <strong>zonas</strong> onde{" "}
            <strong>Flavio Bolsonaro (22)</strong> ou{" "}
            <strong>Lula (13)</strong> tiveram poucos votos.
          </p>
          <div className="threshold-input">
            <label>Menos de</label>
            <input
              type="number"
              min={0}
              value={inputValue}
              onChange={(e) => handleThresholdChange(e.target.value)}
            />
            <span>votos</span>
          </div>
          <p className="low-votes-warn">
            Serao consultadas todas as zonas de todos os municipios. Isso pode
            levar vários minutos.
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
            Consultando zonas... {progress.done.toLocaleString("pt-BR")}/
            {progress.total.toLocaleString("pt-BR")} ({pct}%)
          </p>
          <div
            className="progress-bar"
            style={{ maxWidth: 400, margin: "12px auto 0" }}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p
            style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}
          >
            {allRows.length.toLocaleString("pt-BR")} zonas carregadas
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

      {(done || allRows.length > 0) && (
        <>
          <div className="section-header">
            <h2 className="results-title">Zonas com poucos votos</h2>
            <span className="section-total">
              {filtered.length.toLocaleString("pt-BR")} zonas de{" "}
              {allRows.length.toLocaleString("pt-BR")} carregadas
            </span>
          </div>

          <div className="threshold-bar">
            <label>Menos de</label>
            <input
              type="number"
              min={0}
              value={inputValue}
              onChange={(e) => handleThresholdChange(e.target.value)}
            />
            <span>votos</span>
            {done && (
              <button className="polling-toggle" onClick={load}>
                Buscar novamente
              </button>
            )}
          </div>

          <div className="section-table-wrapper">
            <table className="section-table">
              <thead>
                <tr>
                  <th
                    className="th-sortable"
                    onClick={() => handleSort("zone")}
                  >
                    Zona {sortKey === "zone" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="th-sortable"
                    onClick={() => handleSort("mun")}
                  >
                    Municipio{" "}
                    {sortKey === "mun" ? (sortAsc ? "▲" : "▼") : ""}
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
                    Flavio (22){" "}
                    {sortKey === "flavio" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="th-sortable th-right"
                    onClick={() => handleSort("lula")}
                  >
                    Lula (13){" "}
                    {sortKey === "lula" ? (sortAsc ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={`${r.uf}-${r.mun}-${r.zone}-${i}`}>
                    <td className="td-zone">{r.zone}</td>
                    <td>{r.mun}</td>
                    <td>{r.uf}</td>
                    <td
                      className={`td-votes ${r.flavio < threshold ? "td-low" : ""}`}
                    >
                      {r.flavio.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className={`td-votes ${r.lula < threshold ? "td-low" : ""}`}
                    >
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
