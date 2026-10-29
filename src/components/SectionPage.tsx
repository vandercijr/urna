import { useState, useEffect, useCallback } from "react";
import {
  fetchMunicipalities,
  fetchZoneResults,
  getCandidatePhotoUrl,
} from "../api/tse";
import type { Municipality, CandidateDisplay } from "../types/tse";
import { UF_LIST } from "../types/tse";

interface SectionPageProps {
  electionCd: string;
  cargoCd: string;
  uf: string;
}

interface ZoneRow {
  zone: string;
  candidates: Map<string, number>;
}

export function SectionPage({ electionCd, cargoCd, uf: ufProp }: SectionPageProps) {
  const [localUf, setLocalUf] = useState("sp");
  const effectiveUf = ufProp === "br" ? localUf : ufProp;

  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMun, setSelectedMun] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMun, setLoadingMun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [munName, setMunName] = useState("");

  const [columns, setColumns] = useState<CandidateDisplay[]>([]);
  const [zoneRows, setZoneRows] = useState<ZoneRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!electionCd || !effectiveUf) {
      setMunicipalities([]);
      return;
    }
    setLoadingMun(true);
    fetchMunicipalities(electionCd)
      .then((config) => {
        const state = config.abr.find(
          (s) => s.cd.toLowerCase() === effectiveUf.toLowerCase()
        );
        setMunicipalities(state?.mu ?? []);
      })
      .catch(() => setMunicipalities([]))
      .finally(() => setLoadingMun(false));
  }, [electionCd, effectiveUf]);

  useEffect(() => {
    setSelectedMun("");
    setColumns([]);
    setZoneRows([]);
    setError(null);
  }, [municipalities]);

  const loadAllZones = useCallback(async () => {
    if (!electionCd || !cargoCd || !effectiveUf || !selectedMun) return;

    const mun = municipalities.find((m) => m.cd === selectedMun);
    if (!mun) return;
    setMunName(mun.nm);

    const zones = mun.z;
    if (zones.length === 0) {
      setError("Nenhuma zona encontrada para este municipio.");
      return;
    }

    setLoading(true);
    setError(null);
    setColumns([]);
    setZoneRows([]);
    setProgress({ done: 0, total: zones.length });

    const rows: ZoneRow[] = [];
    const candidateOrder: string[] = [];
    const candidateInfo = new Map<string, CandidateDisplay>();
    let completed = 0;

    const CONCURRENCY = 10;
    const tasks = zones.map((zone) => async () => {
      const data = await fetchZoneResults(
        electionCd, cargoCd, effectiveUf, selectedMun, zone
      );
      completed++;
      setProgress({ done: completed, total: zones.length });
      return { zone, data };
    });

    let idx = 0;
    const results: { zone: string; data: import("../types/tse").ElectionResult }[] = [];
    async function worker() {
      while (idx < tasks.length) {
        const i = idx++;
        try { results[i] = await tasks[i](); } catch { /* skip */ }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    for (const r of results) {
      if (!r) continue;
      const { zone, data } = r;
      const cargo = data.carg.find((c) => c.cd === cargoCd);
      if (!cargo) continue;

      const row: ZoneRow = { zone, candidates: new Map() };

      for (const agr of cargo.agr) {
        for (const par of agr.par) {
          for (const cand of par.cand) {
            const votes = parseInt(cand.vap, 10);
            row.candidates.set(cand.n, votes);

            if (!candidateInfo.has(cand.n)) {
              candidateInfo.set(cand.n, {
                number: cand.n,
                name: cand.nmu,
                party: par.sg,
                coalition: agr.com,
                votes: 0,
                percentage: "",
                elected: cand.e === "s",
                status: cand.st,
                photoUrl: getCandidatePhotoUrl(electionCd, effectiveUf, cand.sqcand),
                vice: cand.vs?.[0]?.nmu,
                seq: parseInt(cand.seq, 10),
              });
              candidateOrder.push(cand.n);
            }
          }
        }
      }

      rows.push(row);
    }

    rows.sort((a, b) => parseInt(a.zone) - parseInt(b.zone));

    const totals = new Map<string, number>();
    for (const row of rows) {
      for (const [num, votes] of row.candidates) {
        totals.set(num, (totals.get(num) ?? 0) + votes);
      }
    }

    const sorted = candidateOrder
      .map((n) => candidateInfo.get(n)!)
      .sort((a, b) => (totals.get(b.number) ?? 0) - (totals.get(a.number) ?? 0));

    setColumns(sorted);
    setZoneRows(rows);
    setLoading(false);

    if (rows.length === 0) {
      setError("Nenhum dado retornado para as zonas deste municipio.");
    }
  }, [electionCd, cargoCd, effectiveUf, selectedMun, municipalities]);

  useEffect(() => {
    if (selectedMun) {
      loadAllZones();
    } else {
      setColumns([]);
      setZoneRows([]);
    }
  }, [selectedMun, loadAllZones]);

  const totals = new Map<string, number>();
  for (const row of zoneRows) {
    for (const [num, votes] of row.candidates) {
      totals.set(num, (totals.get(num) ?? 0) + votes);
    }
  }
  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);

  if (!electionCd || !cargoCd) {
    return (
      <div className="empty-state">
        <p>Selecione uma eleicao e cargo para ver os votos por zona.</p>
      </div>
    );
  }

  return (
    <div className="section-page">
      <div className="section-filters">
        {ufProp === "br" && (
          <div className="filter-group">
            <label>Estado</label>
            <select
              value={localUf}
              onChange={(e) => setLocalUf(e.target.value)}
            >
              {UF_LIST.map((u) => (
                <option key={u.cd} value={u.cd}>
                  {u.ds}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="filter-group">
          <label>Municipio</label>
          <select
            value={selectedMun}
            onChange={(e) => setSelectedMun(e.target.value)}
            disabled={loadingMun || municipalities.length === 0}
          >
            <option value="">
              {loadingMun
                ? "Carregando municipios..."
                : `Selecione (${municipalities.length} municipios)`}
            </option>
            {municipalities.map((m) => (
              <option key={m.cd} value={m.cd}>
                {m.nm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-container">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p>
            Carregando zonas de {munName}... ({progress.done}/{progress.total})
          </p>
          <div className="progress-bar" style={{ maxWidth: 300, margin: "12px auto 0" }}>
            <div
              className="progress-fill"
              style={{
                width: progress.total
                  ? `${(progress.done / progress.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      )}

      {!loading && zoneRows.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="results-title">{munName}</h2>
            <span className="section-total">
              {zoneRows.length} zonas &middot; {grandTotal.toLocaleString("pt-BR")} votos
            </span>
          </div>
          <div className="section-table-wrapper">
            <table className="section-table zone-table">
              <thead>
                <tr>
                  <th className="th-zone">Zona</th>
                  {columns.map((c) => (
                    <th key={c.number} className="th-candidate">
                      <span className="col-number">{c.number}</span>
                      <span className="col-name">{c.name}</span>
                      <span className="col-party">{c.party}</span>
                    </th>
                  ))}
                  <th className="th-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {zoneRows.map((row) => {
                  const rowTotal = Array.from(row.candidates.values()).reduce(
                    (a, b) => a + b, 0
                  );
                  const maxVotes = Math.max(...row.candidates.values());
                  return (
                    <tr key={row.zone}>
                      <td className="td-zone">{row.zone}</td>
                      {columns.map((c) => {
                        const v = row.candidates.get(c.number) ?? 0;
                        return (
                          <td
                            key={c.number}
                            className={`td-votes ${v === maxVotes && v > 0 ? "td-highlight" : ""}`}
                          >
                            {v.toLocaleString("pt-BR")}
                          </td>
                        );
                      })}
                      <td className="td-votes td-row-total">
                        {rowTotal.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="row-total">
                  <td className="td-zone">Total</td>
                  {columns.map((c) => {
                    const v = totals.get(c.number) ?? 0;
                    return (
                      <td key={c.number} className="td-votes">
                        {v.toLocaleString("pt-BR")}
                      </td>
                    );
                  })}
                  <td className="td-votes td-row-total">
                    {grandTotal.toLocaleString("pt-BR")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {!loading && !error && selectedMun && zoneRows.length === 0 && (
        <div className="empty-state">
          <p>Nenhum dado disponivel para este municipio.</p>
        </div>
      )}
    </div>
  );
}
