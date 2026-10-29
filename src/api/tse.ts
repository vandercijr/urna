import type { ElectionConfig, ElectionResult } from "../types/tse";

const BASE_URL = "https://resultados.tse.jus.br/oficial";
const CYCLE = "ele2026";

export async function fetchElectionConfig(): Promise<ElectionConfig> {
  const res = await fetch(`${BASE_URL}/comum/config/ele-c.json`);
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
  return res.json();
}

function padElection(cd: string): string {
  return cd.padStart(6, "0");
}

function padCargo(cd: string): string {
  return cd.padStart(4, "0");
}

export async function fetchResults(
  electionCd: string,
  cargoCd: string,
  uf: string = "br"
): Promise<ElectionResult> {
  const paddedElection = padElection(electionCd);
  const paddedCargo = padCargo(cargoCd);
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/dados/${uf}/${uf}-c${paddedCargo}-e${paddedElection}-u.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dados indisponíveis (${res.status})`);
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
): Promise<import("../types/tse").MunicipalityConfig> {
  const paddedElection = padElection(electionCd);
  const url = `${BASE_URL}/${CYCLE}/${electionCd}/config/mun-e${paddedElection}-cm.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar municípios: ${res.status}`);
  return res.json();
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dados indisponíveis (${res.status})`);
  return res.json();
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dados indisponíveis (${res.status})`);
  return res.json();
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
