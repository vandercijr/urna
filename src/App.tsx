import { useState, useEffect, useMemo } from "react";
import { fetchElectionConfig, parseElectionOptions } from "./api/tse";
import type { ElectionOption } from "./api/tse";
import { useElectionResults } from "./hooks/useElectionResults";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ResultsPanel } from "./components/ResultsPanel";
import { PollingIndicator } from "./components/PollingIndicator";
import "./App.css";

function App() {
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [selectedCargo, setSelectedCargo] = useState("");
  const [selectedUf, setSelectedUf] = useState("sp");

  useEffect(() => {
    fetchElectionConfig().then((config) => {
      const options = parseElectionOptions(config);
      setElections(options);
      const secondRoundFederal = options.find(
        (e) => e.turno === "2" && e.name.includes("Federal")
      );
      if (secondRoundFederal) {
        setSelectedElection(secondRoundFederal.cd);
        setSelectedCargo("1");
      } else if (options.length > 0) {
        setSelectedElection(options[0].cd);
        if (options[0].cargos.length > 0) {
          setSelectedCargo(options[0].cargos[0].cd);
        }
      }
    });
  }, []);

  const currentElection = elections.find((e) => e.cd === selectedElection);
  const availableCargos = currentElection?.cargos ?? [];

  const uf = useMemo(() => {
    if (selectedCargo === "1") return "br";
    return selectedUf;
  }, [selectedCargo, selectedUf]);

  const {
    result,
    candidates,
    loading,
    error,
    lastUpdate,
    refresh,
    autoRefresh,
    setAutoRefresh,
    countdown,
  } = useElectionResults(selectedElection || null, selectedCargo || null, uf);

  function handleElectionChange(cd: string) {
    setSelectedElection(cd);
    setSelectedCargo("");
  }

  function handleCargoChange(cd: string) {
    setSelectedCargo(cd);
  }

  return (
    <div className="app">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />

      <main className="main-content">
        <Filters
          elections={elections}
          selectedElection={selectedElection}
          selectedCargo={selectedCargo}
          selectedUf={selectedUf}
          onElectionChange={handleElectionChange}
          onCargoChange={handleCargoChange}
          onUfChange={setSelectedUf}
          availableCargos={availableCargos}
        />

        <PollingIndicator
          autoRefresh={autoRefresh}
          countdown={countdown}
          loading={loading}
          onToggle={setAutoRefresh}
        />

        <ResultsPanel
          result={result!}
          candidates={candidates}
          loading={loading}
          error={error}
        />
      </main>

      <footer className="footer">
        <p>
          Dados oficiais do{" "}
          <a
            href="https://resultados.tse.jus.br"
            target="_blank"
            rel="noopener noreferrer"
          >
            TSE - Tribunal Superior Eleitoral
          </a>
          . Atualização automática a cada 30 segundos.
        </p>
      </footer>
    </div>
  );
}

export default App;
