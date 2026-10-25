export interface ElectionConfig {
  dg: string;
  hg: string;
  f: string;
  arq: ConfigTemplate[];
  pl: Pleito[];
}

export interface ConfigTemplate {
  tp: string;
  dir: string;
}

export interface Pleito {
  cd: string;
  c: string;
  dt: string;
  e: ElectionEntry[];
}

export interface ElectionEntry {
  cd: string;
  cdt2?: string;
  nm: string;
  t: string;
  tp: string;
  abr: Abrangencia[];
}

export interface Abrangencia {
  cd: string;
  cp: CargoEntry[];
}

export interface CargoEntry {
  cd: string;
  ds: string;
  tp: string;
}

export interface ElectionResult {
  ele: string;
  t: string;
  f: string;
  tpabr: string;
  cdabr: string;
  dg: string;
  hg: string;
  dt: string;
  ht: string;
  tf: string;
  and: string;
  s: SectionData;
  e: ElectorateData;
  v: VoteData;
  carg: Cargo[];
}

export interface SectionData {
  ts: string;
  st: string;
  pst: string;
}

export interface ElectorateData {
  te: string;
  c: string;
  pc: string;
  a: string;
  pa: string;
}

export interface VoteData {
  tv: string;
  vvc: string;
  pvvc: string;
  vb: string;
  pvb: string;
  vn: string;
  pvn: string;
}

export interface Cargo {
  cd: string;
  nmn: string;
  agr: Agrupamento[];
}

export interface Agrupamento {
  n: string;
  nm: string;
  tp: string;
  com: string;
  par: Partido[];
}

export interface Partido {
  n: string;
  sg: string;
  nm: string;
  tvtn: string;
  tvan: string;
  cand: Candidato[];
}

export interface Candidato {
  n: string;
  sqcand: string;
  nm: string;
  nmu: string;
  dvt: string;
  seq: string;
  e: string;
  st: string;
  vap: string;
  pvap: string;
  vs?: ViceInfo[];
}

export interface ViceInfo {
  tp: string;
  sqcand: string;
  nm: string;
  nmu: string;
  sgp: string;
}

export interface MunicipalityConfig {
  abr: StateConfig[];
}

export interface StateConfig {
  cd: string;
  ds: string;
  mu: Municipality[];
}

export interface Municipality {
  cd: string;
  cdi: string;
  nm: string;
  c: string;
}

export interface CandidateDisplay {
  number: string;
  name: string;
  party: string;
  coalition: string;
  votes: number;
  percentage: string;
  elected: boolean;
  status: string;
  photoUrl: string;
  vice?: string;
  seq: number;
}

export const CARGO_MAP: Record<string, string> = {
  "1": "Presidente",
  "3": "Governador",
  "5": "Senador",
  "6": "Deputado Federal",
  "7": "Deputado Estadual",
  "8": "Deputado Distrital",
};

export const UF_LIST = [
  { cd: "ac", ds: "Acre" },
  { cd: "al", ds: "Alagoas" },
  { cd: "am", ds: "Amazonas" },
  { cd: "ap", ds: "Amapá" },
  { cd: "ba", ds: "Bahia" },
  { cd: "ce", ds: "Ceará" },
  { cd: "df", ds: "Distrito Federal" },
  { cd: "es", ds: "Espírito Santo" },
  { cd: "go", ds: "Goiás" },
  { cd: "ma", ds: "Maranhão" },
  { cd: "mg", ds: "Minas Gerais" },
  { cd: "ms", ds: "Mato Grosso do Sul" },
  { cd: "mt", ds: "Mato Grosso" },
  { cd: "pa", ds: "Pará" },
  { cd: "pb", ds: "Paraíba" },
  { cd: "pe", ds: "Pernambuco" },
  { cd: "pi", ds: "Piauí" },
  { cd: "pr", ds: "Paraná" },
  { cd: "rj", ds: "Rio de Janeiro" },
  { cd: "rn", ds: "Rio Grande do Norte" },
  { cd: "ro", ds: "Rondônia" },
  { cd: "rr", ds: "Roraima" },
  { cd: "rs", ds: "Rio Grande do Sul" },
  { cd: "sc", ds: "Santa Catarina" },
  { cd: "se", ds: "Sergipe" },
  { cd: "sp", ds: "São Paulo" },
  { cd: "to", ds: "Tocantins" },
];
