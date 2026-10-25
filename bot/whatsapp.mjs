import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

const BASE_URL = "https://resultados.tse.jus.br/oficial";
const CYCLE = "ele2026";

const ELECTION_CD = process.env.ELECTION_CD || "6258";
const CARGO_CD = process.env.CARGO_CD || "1";
const UF = process.env.UF || "br";
const GROUP_ID = process.env.GROUP_ID || "";
const GROUP_NAME = process.env.GROUP_NAME || "";
const POLL_SECONDS = parseInt(process.env.POLL_SECONDS || "600", 10);

let lastHash = "";

function padElection(cd) {
  return cd.padStart(6, "0");
}

function padCargo(cd) {
  return cd.padStart(4, "0");
}

async function fetchResults() {
  const pe = padElection(ELECTION_CD);
  const pc = padCargo(CARGO_CD);
  const url = `${BASE_URL}/${CYCLE}/${ELECTION_CD}/dados/${UF}/${UF}-c${pc}-e${pe}-u.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TSE retornou ${res.status}`);
  return res.json();
}

function formatMessage(data) {
  const cargo = data.carg[0];
  const cargoName = cargo?.nmn || "Cargo";
  const turno = data.t === "1" ? "1º Turno" : "2º Turno";
  const apuracao = data.tf === "s" ? "FINALIZADA" : "EM ANDAMENTO";
  const sections = data.s;
  const elec = data.e;
  const votes = data.v;

  const candidates = [];
  for (const agr of cargo.agr) {
    for (const par of agr.par) {
      for (const cand of par.cand) {
        candidates.push({
          name: cand.nmu,
          number: cand.n,
          party: par.sg,
          votes: parseInt(cand.vap, 10),
          pct: cand.pvap,
          elected: cand.e === "s",
          status: cand.st,
        });
      }
    }
  }

  candidates.sort((a, b) => b.votes - a.votes);

  let msg = `🗳️ *APURAÇÃO ${cargoName.toUpperCase()} - ${turno}*\n`;
  msg += `📊 Status: *${apuracao}*\n`;
  msg += `📋 Seções apuradas: *${sections.pst}%* (${parseInt(sections.st).toLocaleString("pt-BR")} de ${parseInt(sections.ts).toLocaleString("pt-BR")})\n`;
  msg += `👥 Comparecimento: *${elec.pc}%* | Abstenção: *${elec.pa}%*\n`;
  msg += `✅ Votos válidos: ${parseInt(votes.vvc).toLocaleString("pt-BR")} | Brancos: ${parseInt(votes.vb).toLocaleString("pt-BR")} | Nulos: ${parseInt(votes.vn).toLocaleString("pt-BR")}\n`;
  msg += `\n`;

  for (const c of candidates) {
    const medal = c.elected ? " ✅ ELEITO" : "";
    const t2 = c.status === "2º turno" ? " ➡️ 2ºT" : "";
    msg += `*${c.number} - ${c.name}* (${c.party})\n`;
    msg += `   📊 ${c.pct}% — ${c.votes.toLocaleString("pt-BR")} votos${medal}${t2}\n`;
  }

  msg += `\n⏰ Atualizado: ${data.dt} ${data.ht}`;
  msg += `\n🔗 https://vandercijr.github.io/urna/`;

  return msg;
}

function hashData(data) {
  const cargo = data.carg[0];
  const parts = [];
  for (const agr of cargo.agr) {
    for (const par of agr.par) {
      for (const cand of par.cand) {
        parts.push(`${cand.n}:${cand.vap}`);
      }
    }
  }
  return `${data.s.st}-${parts.join(",")}`;
}

async function startBot() {
  const listOnly = process.argv.includes("--list-groups");

  if (!GROUP_ID && !GROUP_NAME && !listOnly) {
    console.error(
      "❌ Set GROUP_ID (e.g. 120363XXXXX@g.us) or GROUP_NAME env var"
    );
    console.error(
      "   Run with --list-groups to see all groups and their IDs"
    );
    process.exit(1);
  }

  console.log("🗳️  Urna WhatsApp Bot (Baileys)");
  if (!listOnly) {
    console.log(`   Eleição: ${ELECTION_CD} | Cargo: ${CARGO_CD} | UF: ${UF}`);
    console.log(`   Grupo: ${GROUP_ID || GROUP_NAME}`);
    console.log(`   Intervalo: ${POLL_SECONDS}s\n`);
  }

  const { state, saveCreds } = await useMultiFileAuthState(".wwebjs_auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 Escaneie o QR Code no WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado!\n");

      if (listOnly) {
        const groups = await sock.groupFetchAllParticipating();
        console.log("📋 Seus grupos:\n");
        for (const [id, meta] of Object.entries(groups)) {
          console.log(`   ${id}  —  ${meta.subject}`);
        }
        console.log("\nUse o ID acima como GROUP_ID.");
        process.exit(0);
      }

      let groupJid;

      if (GROUP_ID) {
        groupJid = GROUP_ID;
      } else {
        const groups = await sock.groupFetchAllParticipating();
        const match = Object.entries(groups).find(([, meta]) =>
          meta.subject.toLowerCase().includes(GROUP_NAME.toLowerCase())
        );
        if (!match) {
          console.error(`❌ Grupo "${GROUP_NAME}" não encontrado. Disponíveis:`);
          for (const [id, meta] of Object.entries(groups)) {
            console.log(`   ${id}  —  ${meta.subject}`);
          }
          process.exit(1);
        }
        groupJid = match[0];
        console.log(`📢 Grupo: ${match[1].subject} (${groupJid})\n`);
      }

      async function poll() {
        try {
          const data = await fetchResults();
          const hash = hashData(data);

          if (hash === lastHash) {
            console.log(
              `⏳ ${new Date().toLocaleTimeString("pt-BR")} — Sem alteração`
            );
            return;
          }

          lastHash = hash;
          const msg = formatMessage(data);
          await sock.sendMessage(groupJid, { text: msg });
          console.log(
            `✅ ${new Date().toLocaleTimeString("pt-BR")} — Mensagem enviada!`
          );
        } catch (err) {
          console.error(
            `❌ ${new Date().toLocaleTimeString("pt-BR")} — Erro: ${err.message}`
          );
        }
      }

      await poll();
      setInterval(poll, POLL_SECONDS * 1000);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("❌ Logout detectado. Limpe a auth e escaneie novamente:");
        console.error("   rm -rf .wwebjs_auth && npm run bot");
        process.exit(1);
      }
      const delay = code === DisconnectReason.restartRequired ? 1 : 5;
      console.log(`🔄 Reconectando em ${delay}s... (código: ${code})`);
      setTimeout(startBot, delay * 1000);
    }
  });
}

startBot();
