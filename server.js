import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// ─── Données des exploits ─────────────────────────────────────────────────────

const exploits = [
  { name: "ETERNALBLUE", category: "SMB", cve: "MS17-010", target: "Windows 7 SP1", type: "RCE", description: "Exploit SMBv2 pour Windows 7 SP1. Un des exploits les plus célèbres, utilisé par WannaCry." },
  { name: "ETERNALROMANCE", category: "SMB", cve: "MS17-010", target: "XP/2003/Vista/7/8/2008", type: "RCE", description: "Exploit SMB1 sur TCP 445. Donne les privilèges SYSTEM." },
  { name: "ETERNALSYNERGY", category: "SMB", cve: "MS17-010", target: "Windows 8 / Server 2012 SP0", type: "RCE", description: "Exploit SMBv3 remote code execution pour Windows 8 et Server 2012." },
  { name: "ETERNALCHAMPION", category: "SMB", cve: "—", target: "Windows", type: "RCE", description: "Exploit SMBv1. Utilisé en combinaison avec DOPU pour se connecter aux machines compromises." },
  { name: "EXPLODINGCAN", category: "IIS", cve: "—", target: "IIS 6.0", type: "Backdoor", description: "Exploit IIS 6.0 qui crée un backdoor à distance." },
  { name: "ERRATICGOPHER", category: "SMB", cve: "—", target: "Windows XP / Server 2003", type: "RCE", description: "Exploit SMBv1 ciblant Windows XP et Server 2003." },
  { name: "EMERALDTHREAD", category: "SMB", cve: "MS10-061", target: "Windows XP / Server 2003", type: "RCE", description: "Exploit SMB pour Windows XP et Server 2003." },
  { name: "EDUCATEDSCHOLAR", category: "SMB", cve: "MS09-050", target: "Windows", type: "RCE", description: "Exploit SMB (MS09-050)." },
  { name: "ECLIPSEDWING", category: "Server", cve: "MS08-067", target: "Windows Server 2008+", type: "RCE", description: "Exploit RCE pour le service Server dans Windows Server 2008 et ultérieur." },
  { name: "ESTEEMAUDIT", category: "RDP", cve: "—", target: "Windows Server 2003", type: "Backdoor", description: "Exploit RDP et backdoor pour Windows Server 2003." },
  { name: "EARLYSHOVEL", category: "Sendmail", cve: "—", target: "RedHat 7.0-7.1", type: "RCE", description: "Exploit Sendmail 8.11.x pour RedHat 7.0 et 7.1." },
  { name: "EBBISLAND", category: "RPC", cve: "—", target: "Solaris 6-10 (SPARC/x86)", type: "RCE", description: "Root RCE via RPC XDR overflow dans Solaris 6, 7, 8, 9 & 10." },
  { name: "ECHOWRECKER", category: "Samba", cve: "—", target: "Linux", type: "RCE", description: "Exploit Samba 3.0.x Linux à distance." },
  { name: "EASYBEE", category: "Mail", cve: "—", target: "MDaemon", type: "Vuln", description: "Vulnérabilité MDaemon email server." },
  { name: "EASYPI", category: "Lotus", cve: "—", target: "IBM Lotus Notes", type: "RCE", description: "Exploit IBM Lotus Notes détecté comme Stuxnet." },
  { name: "EWOKFRENZY", category: "Lotus", cve: "—", target: "IBM Lotus Domino 6.5.4 / 7.0.2", type: "RCE", description: "Exploit IBM Lotus Domino 6.5.4 et 7.0.2." },
  { name: "EMPHASISMINE", category: "IMAP", cve: "—", target: "IBM Lotus Domino 6.6.4-8.5.2", type: "RCE", description: "Exploit IMAP à distance pour IBM Lotus Domino." },
  { name: "ENGLISHMANSDENTIST", category: "Exchange", cve: "—", target: "Outlook Exchange WebAccess", type: "Backdoor", description: "Définit des règles Outlook Exchange WebAccess pour exécuter du code côté client." },
  { name: "EPICHERO", category: "Avaya", cve: "—", target: "Avaya Call Server", type: "RCE", description: "Exploit 0-day RCE pour Avaya Call Server." },
  { name: "ETRE", category: "Mail", cve: "—", target: "IMail 8.10-8.22", type: "RCE", description: "Exploit pour IMail 8.10 à 8.22." },
  { name: "ESMARKCONANT", category: "Web", cve: "CVE-2004-1315", target: "phpBB <2.0.11", type: "RCE", description: "Exploit phpBB remote command execution." },
  { name: "ELIDESKEW", category: "Web", cve: "—", target: "SquirrelMail 1.4.0-1.4.7", type: "Vuln", description: "Vulnérabilité connue dans SquirrelMail 1.4.0 à 1.4.7." },
  { name: "ELITEHAMMER", category: "Web", cve: "—", target: "RedFlag Webmail 4", type: "RCE", description: "RCE sur RedFlag Webmail 4, obtient l'utilisateur nobody." },
  { name: "ENVISIONCOLLISION", category: "Web", cve: "—", target: "phpBB", type: "RCE", description: "RCE pour phpBB (dérivé)." },
  { name: "COTTONAXE", category: "Web", cve: "—", target: "LiteSpeed Web Server", type: "Info", description: "RCE pour récupérer logs et infos sur LiteSpeed Web Server." },
];

const utilities = [
  { name: "FUZZBUNCH", description: "Framework d'exploitation, similaire à MetaSploit. Interface en Python pour lancer les exploits." },
  { name: "ODDJOB", description: "Builder d'implants et serveur C&C. Livre des exploits pour Windows 2000+. Non détecté par les AV." },
  { name: "PASSFREELY", description: "Utilitaire qui contourne l'authentification pour les serveurs Oracle." },
  { name: "SMBTOUCH", description: "Vérifie si la cible est vulnérable aux exploits samba (ETERNALSYNERGY, ETERNALBLUE, ETERNALROMANCE)." },
  { name: "ERRATICGOPHERTOUCH", description: "Vérifie si la cible utilise un RPC vulnérable." },
  { name: "IISTOUCH", description: "Vérifie si la version d'IIS est vulnérable." },
  { name: "RPCTOUCH", description: "Récupère des infos Windows via RPC." },
  { name: "DOPU", description: "Utilisé pour se connecter aux machines exploitées par ETERNALCHAMPION." },
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
