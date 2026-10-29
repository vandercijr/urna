import type { ElectionConfig, ElectionResult, MunicipalityConfig } from "../types/tse";

const BASE_URL = "https://resultados.tse.jus.br/oficial";
const CYCLE = "ele2026";

const cache = new Map<string, unknown>();

async function fetchWithRetry(url: string, retries = 4): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 429 && attempt < retries) {
      const delay = 2000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`${res.status}`);
  }
  throw new Error("Max retries");
}

async function cachedFetch<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetchWithRetry(url);
  const data: T = await res.json();
  cache.set(url, data);
  return data;
}

function padElection(cd: string): string {
  return cd.padStart(6, "0");
}

function padCargo(cd: string): string {
  return cd.padStart(4, "0");
}

export async function fetchElectionConfig(): Promise<ElectionConfig> {
  return cachedFetch(`${BASE_URL}/comum/config/ele-c.json`);
}

export async function fetchResults(
  electionCd: string,
  cargoCd: string,
  uf: string = "br"
): Promise<ElectionResult> {
  const paddedElection = padElection(electionCd);
  const paddedCargo = padCargo(cargoCd);
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/dados/${uf}/${uf}-c${paddedCargo}-e${paddedElection}-u.json`;
  const res = await fetchWithRetry(url);
  return res.json();
}

export function getCandidatePhotoUrl(
  electionCd: string,
  uf: string,
  sqcand: string
): string {
  return `${BASE_URL}/${CYCLE}/${electionCd}/fotos/${uf}/${sqcand}.jpeg`;
}

export interface ElectionOption {
  cd: string;
  name: string;
  turno: string;
  cargos: { cd: string; ds: string }[];
  scope: string;
}

export async function fetchMunicipalities(
  electionCd: string
): Promise<MunicipalityConfig> {
  const paddedElection = padElection(electionCd);
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/config/mun-e${paddedElection}-cm.json`;
  return cachedFetch(url);
}

export async function fetchMunicipalityResults(
  electionCd: string,
  cargoCd: string,
  uf: string,
  municipioCd: string
): Promise<ElectionResult> {
  const paddedElection = padElection(electionCd);
  const paddedCargo = padCargo(cargoCd);
  const munCd = municipioCd.padStart(5, "0");
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/dados/${uf}/${uf}${munCd}-c${paddedCargo}-e${paddedElection}-u.json`;
  return cachedFetch(url);
}

export async function fetchZoneResults(
  electionCd: string,
  cargoCd: string,
  uf: string,
  municipioCd: string,
  zoneCd: string
): Promise<ElectionResult> {
  const paddedElection = padElection(electionCd);
  const paddedCargo = padCargo(cargoCd);
  const munCd = municipioCd.padStart(5, "0");
  const zone = zoneCd.padStart(4, "0");
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/dados/${uf}/${uf}${munCd}-z${zone}-c${paddedCargo}-e${paddedElection}-u.json`;
  return cachedFetch(url);
}

export function parseElectionOptions(config: ElectionConfig): ElectionOption[] {
  const options: ElectionOption[] = [];
  for (const pl of config.pl) {
    if (pl.c !== CYCLE) continue;
    for (const e of pl.e) {
      if (e.nm.includes("Suplementar") || e.nm.includes("Consulta")) continue;
      const cargos: { cd: string; ds: string }[] = [];
      let scope = "br";
      for (const abr of e.abr) {
        scope = abr.cd;
        for (const cp of abr.cp) {
          cargos.push({ cd: cp.cd, ds: cp.ds });
        }
      }
      options.push({
        cd: e.cd,
        name: e.nm,
        turno: e.t,
        cargos,
        scope,
      });
    }
  }
  return options;
}
