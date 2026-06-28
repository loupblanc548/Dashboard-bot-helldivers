import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const EQGRP_DIR = path.join(__dirname, "eqgrp-data");

app.use(express.static(path.join(__dirname, "public")));

// ─── Données des exploits ─────────────────────────────────────────────────────

const exploits = [
  { name: "ETERNALBLUE", category: "SMB", cve: "MS17-010", target: "Windows 7 SP1", type: "RCE", description: "Exploit SMBv2 pour Windows 7 SP1. Un des exploits les plus célèbres, utilisé par WannaCry.", files: ["Eternalblue-2.0.0.fb", "Eternalblue-2.0.0.xml"] },
  { name: "ETERNALROMANCE", category: "SMB", cve: "MS17-010", target: "XP/2003/Vista/7/8/2008", type: "RCE", description: "Exploit SMB1 sur TCP 445. Donne les privilèges SYSTEM.", files: ["Eternalromance-1.3.0.0.fb", "Eternalromance-1.4.0.0.fb"] },
  { name: "ETERNALSYNERGY", category: "SMB", cve: "MS17-010", target: "Windows 8 / Server 2012 SP0", type: "RCE", description: "Exploit SMBv3 remote code execution pour Windows 8 et Server 2012.", files: ["Eternalsynergy-1.0.1.0.fb"] },
  { name: "ETERNALCHAMPION", category: "SMB", cve: "—", target: "Windows", type: "RCE", description: "Exploit SMBv1. Utilisé en combinaison avec DOPU pour se connecter aux machines compromises.", files: ["Eternalchampion-1.0.0.0.fb"] },
  { name: "EXPLODINGCAN", category: "IIS", cve: "—", target: "IIS 6.0", type: "Backdoor", description: "Exploit IIS 6.0 qui crée un backdoor à distance.", files: ["Explodingcan-2.0.2.0.fb"] },
  { name: "ERRATICGOPHER", category: "SMB", cve: "—", target: "Windows XP / Server 2003", type: "RCE", description: "Exploit SMBv1 ciblant Windows XP et Server 2003.", files: ["Erraticgopher-1.0.1.0.fb"] },
  { name: "EMERALDTHREAD", category: "SMB", cve: "MS10-061", target: "Windows XP / Server 2003", type: "RCE", description: "Exploit SMB pour Windows XP et Server 2003.", files: ["Emeraldthread-3.0.0.0.fb"] },
  { name: "EDUCATEDSCHOLAR", category: "SMB", cve: "MS09-050", target: "Windows", type: "RCE", description: "Exploit SMB (MS09-050).", files: ["Educatedscholar-1.0.0.0.fb"] },
  { name: "ECLIPSEDWING", category: "Server", cve: "MS08-067", target: "Windows Server 2008+", type: "RCE", description: "Exploit RCE pour le service Server dans Windows Server 2008 et ultérieur.", files: ["Eclipsedwing-1.5.2.0.fb"] },
  { name: "ESTEEMAUDIT", category: "RDP", cve: "—", target: "Windows Server 2003", type: "Backdoor", description: "Exploit RDP et backdoor pour Windows Server 2003.", files: ["Esteemaudit-2.1.0.0.fb"] },
  { name: "EASYBEE", category: "Mail", cve: "—", target: "MDaemon", type: "Vuln", description: "Vulnérabilité MDaemon email server.", files: ["Easybee-1.0.1.0.fb"] },
  { name: "EASYPI", category: "Lotus", cve: "—", target: "IBM Lotus Notes", type: "RCE", description: "Exploit IBM Lotus Notes détecté comme Stuxnet.", files: ["Easypi-3.1.0.0.fb"] },
  { name: "EWOKFRENZY", category: "Lotus", cve: "—", target: "IBM Lotus Domino 6.5.4 / 7.0.2", type: "RCE", description: "Exploit IBM Lotus Domino 6.5.4 et 7.0.2.", files: ["Ewokfrenzy-2.0.0.0.fb"] },
  { name: "EMPHASISMINE", category: "IMAP", cve: "—", target: "IBM Lotus Domino 6.6.4-8.5.2", type: "RCE", description: "Exploit IMAP à distance pour IBM Lotus Domino.", files: ["Emphasismine-3.4.0.0.fb"] },
  { name: "ENGLISHMANSDENTIST", category: "Exchange", cve: "—", target: "Outlook Exchange WebAccess", type: "Backdoor", description: "Définit des règles Outlook Exchange WebAccess pour exécuter du code côté client.", files: ["Englishmansdentist-1.2.0.0.fb"] },
  { name: "ESKIMOROLL", category: "Mail", cve: "—", target: "MDaemon", type: "RCE", description: "Exploit pour MDaemon email server.", files: ["Eskimoroll-1.1.1.0.fb"] },
  { name: "ZIPPYBEER", category: "SMB", cve: "—", target: "Windows", type: "RCE", description: "Exploit SMB.", files: ["Zippybeer-1.0.2.0.fb"] },
  { name: "DARKPULSAR", category: "Implant", cve: "—", target: "Windows", type: "Backdoor", description: "Implant backdoor persistant.", files: ["Darkpulsar-1.1.0.9.xml"] },
];

const utilities = [
  { name: "FUZZBUNCH", description: "Framework d'exploitation, similaire à MetaSploit. Interface en Python pour lancer les exploits.", path: "windows/fuzzbunch" },
  { name: "SMBTOUCH", description: "Vérifie si la cible est vulnérable aux exploits samba (ETERNALSYNERGY, ETERNALBLUE, ETERNALROMANCE).", path: "windows/touches" },
  { name: "RPCTOUCH", description: "Récupère des infos Windows via RPC.", path: "windows/touches" },
  { name: "IISTOUCH", description: "Vérifie si la version d'IIS est vulnérable.", path: "windows/touches" },
  { name: "ARCHITOUCH", description: "Vérifie l'architecture de la cible.", path: "windows/touches" },
  { name: "DOMAINTOUCH", description: "Récupère des infos sur le domaine.", path: "windows/touches" },
  { name: "PRINTJOBLIST", description: "Liste les jobs d'impression sur la cible.", path: "windows/touches" },
  { name: "MOFCONFIG", description: "Configuration MOF (Managed Object Format).", path: "windows/implants" },
];

// ─── API ──────────────────────────────────────────────────────────────────────

app.get("/api/exploits", (_req, res) => {
  res.json({ exploits });
});

app.get("/api/exploits/:name", (req, res) => {
  const exploit = exploits.find((e) => e.name.toLowerCase() === req.params.name.toLowerCase());
  if (!exploit) {
    res.status(404).json({ error: "Exploit non trouvé" });
    return;
  }
  res.json(exploit);
});

app.get("/api/utilities", (_req, res) => {
  res.json({ utilities });
});

app.get("/api/categories", (_req, res) => {
  const categories = [...new Set(exploits.map((e) => e.category))];
  res.json({ categories });
});

// ─── File browser API ─────────────────────────────────────────────────────────

app.get("/api/browse", (req, res) => {
  const subPath = (req.query.path) || "";
  const fullPath = path.join(EQGRP_DIR, subPath);

  if (!fullPath.startsWith(EQGRP_DIR)) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  try {
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "Chemin introuvable" });
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const content = fs.readFileSync(fullPath, "utf-8");
      res.json({ type: "file", name: path.basename(fullPath), content: content.substring(0, 50000) });
      return;
    }

    const items = fs.readdirSync(fullPath).map((name) => {
      const itemPath = path.join(fullPath, name);
      const itemStat = fs.statSync(itemPath);
      return {
        name,
        type: itemStat.isDirectory() ? "dir" : "file",
        size: itemStat.size,
        path: path.join(subPath, name).replace(/\\/g, "/"),
      };
    });

    res.json({ type: "dir", path: subPath, items });
  } catch {
    res.status(500).json({ error: "Erreur lecture" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

// Fallback
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  🕵️  EQGRP DASHBOARD                       ║`);
  console.log(`  ║  → http://localhost:${PORT}                 ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
