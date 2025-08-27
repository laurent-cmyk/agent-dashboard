import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users, Building2, CalendarCheck, Plus, Pencil, Trash2, Search,
  Download, Save, LogIn, LogOut, Settings as SettingsIcon, Shield,
  Upload, FileSpreadsheet, Handshake, Percent, Euro
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

/* ===================== Utils ===================== */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (n, min, max) => Math.min(Math.max(Number(n) || 0, min), max);

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const csv = [headers.join(",")]
    .concat(rows.map(r => headers.map(h => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(",")))
    .join("\n");
  downloadFile(filename, csv, "text/csv;charset=utf-8;");
}

function downloadJSON(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
}

function parseCSV(text) {
  // Parse simple CSV (sans guillemets multi-lignes)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.replace(/^\"|\"$/g, ""));
  return lines.map(line => {
    const cells = line.split(",").map(c => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i]);
    return obj;
  });
}

/* ===================== Données d’exemple ===================== */
const SAMPLE_PLAYERS = [
  { id: uid(), name: "Babacar Ndiaye Mendy", sport: "Football", position: "GK", birthYear: 2006, heightCm: 194, weightKg: 86, club: "Rayo Vallecano B", nationality: "SEN", status: "Prospect" },
  { id: uid(), name: "Lucas Dycke", sport: "Rugby", position: "Centre", birthYear: 2001, heightCm: 183, weightKg: 92, club: "CSBJ Rugby", nationality: "FRA", status: "Pro" },
  { id: uid(), name: "Arthur Fillaudeau", sport: "Football", position: "Coach", birthYear: 1991, heightCm: 178, weightKg: 74, club: "Rayo Vallecano (Academy)", nationality: "FRA", status: "Staff" },
];

const SAMPLE_CLUBS = [
  { id: uid(), name: "Rayo Vallecano", country: "ESP", division: "LaLiga", city: "Madrid", notes: "Academy contacts established" },
  { id: uid(), name: "US Carcassonne", country: "FRA", division: "Pro D2 (Rugby)", city: "Carcassonne", notes: "Extension 2 saisons – Lorenzon" },
  { id: uid(), name: "VAFC (Réserve)", country: "FRA", division: "N3", city: "Valenciennes", notes: "Suivi perf – prépa physique" },
];

const SAMPLE_FRIENDLIES = [
  { id: uid(), requesterClub: "Club Anonyme L1", category: "Pro", dateWanted: "2025-08-31", location: "Occitanie / Toulouse", budget: 1500, notes: "Match aller-retour possible" },
  { id: uid(), requesterClub: "Equipe Réserve N3", category: "Reserve", dateWanted: "2025-09-07", location: "Nord", budget: 700, notes: "Cherche arbitres via orga" },
];

const SAMPLE_CONTRACTS = [
  { id: uid(), person: "Babacar Ndiaye Mendy", club: "Rayo Vallecano B", type: "Joueur", start: "2025-07-01", end: "2026-06-30", commissionPct: 10, fixedFee: 0, status: "Actif" },
];

const DEFAULT_BRANDING = { mode: "neutral", name: "Agent Dashboard", accent: "#0ea5e9", logoText: "A" };

/* ===================== Petits composants ===================== */
function LabeledInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function EntityToolbar({ icon: Icon, title, count, search, setSearch, onAdd, onExport, extra }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-muted"><Icon className="h-5 w-5"/></div>
        <div>
          <div className="text-xl font-semibold leading-tight">{title}</div>
          <div className="text-sm text-muted-foreground">{count} élément{count>1?"s":""}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input className="pl-8 w-64" placeholder="Rechercher…" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        {onExport && <Button variant="secondary" onClick={onExport}><Download className="mr-2 h-4 w-4"/>Exporter CSV</Button>}
        {onAdd && <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4"/>Ajouter</Button>}
      </div>
    </div>
  );
}

function EmptyState({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <div className="text-lg font-medium mb-2">{title}</div>
      <div className="text-sm text-muted-foreground mb-4">Ajoute ton premier élément pour commencer.</div>
      {children}
    </div>
  );
}

function QuickAddFriendly({ onAdd }) {
  const [form, setForm] = useState({ requesterClub: "", category: "Pro", dateWanted: "", location: "", budget: 0, notes: "" });
  return (
    <div className="grid md:grid-cols-5 gap-2">
      <Input placeholder="Club demandeur" value={form.requesterClub} onChange={e=>setForm(f=>({...f, requesterClub: e.target.value}))}/>
      <Input placeholder="Catégorie (Pro/Reserve/U19/U17)" value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))}/>
      <Input type="date" value={form.dateWanted} onChange={e=>setForm(f=>({...f, dateWanted: e.target.value}))}/>
      <Input placeholder="Zone" value={form.location} onChange={e=>setForm(f=>({...f, location: e.target.value}))}/>
      <div className="flex gap-2">
        <Input type="number" placeholder="Budget" value={form.budget} onChange={e=>setForm(f=>({...f, budget: Number(e.target.value||0)}))}/>
        <Button onClick={()=>{ onAdd(form); setForm({ requesterClub: "", category: "Pro", dateWanted: "", location: "", budget: 0, notes: "" }); }}>Ajouter</Button>
      </div>
      <div className="md:col-span-5">
        <Input placeholder="Notes (optionnel)" value={form.notes} onChange={e=>setForm(f=>({...f, notes: e.target.value}))}/>
      </div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-4xl font-semibold">{value}</div>
        <Badge variant="secondary" className="text-xs">Total</Badge>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm mt-1">
      <Badge>{label}</Badge><span className="font-medium">{value}</span>
    </div>
  );
}

/* ===================== Dialogs ===================== */
function PlayerDialog({ open, onOpenChange, onSave, initial }) {
  const [form, setForm] = useState(initial || { name: "", sport: "Football", position: "", birthYear: 2004, heightCm: 180, weightKg: 75, club: "", nationality: "", status: "Prospect" });
  useEffect(() => { setForm(initial || { name: "", sport: "Football", position: "", birthYear: 2004, heightCm: 180, weightKg: 75, club: "", nationality: "", status: "Prospect" }); }, [initial, open]);
  const handle = () => { onSave({ ...(initial || { id: uid() }), ...form }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>{initial ? "Modifier joueur/staff" : "Ajouter joueur/staff"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Nom" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Nom complet"/>
          <LabeledInput label="Sport" value={form.sport} onChange={v=>setForm(f=>({...f,sport:v}))} placeholder="Football / Rugby / Basket"/>
          <LabeledInput label="Poste / Rôle" value={form.position} onChange={v=>setForm(f=>({...f,position:v}))} placeholder="Ex: GK, 10, Coach"/>
          <LabeledInput type="number" label="Année de naissance" value={form.birthYear} onChange={v=>setForm(f=>({...f,birthYear: clamp(v,1960,2015)}))}/>
          <LabeledInput type="number" label="Taille (cm)" value={form.heightCm} onChange={v=>setForm(f=>({...f,heightCm:Number(v||0)}))}/>
          <LabeledInput type="number" label="Poids (kg)" value={form.weightKg} onChange={v=>setForm(f=>({...f,weightKg:Number(v||0)}))}/>
          <div className="col-span-2"><LabeledInput label="Club actuel" value={form.club} onChange={v=>setForm(f=>({...f,club:v}))}/></div>
          <LabeledInput label="Nationalité" value={form.nationality} onChange={v=>setForm(f=>({...f,nationality:v}))} placeholder="FRA, SEN…"/>
          <LabeledInput label="Statut" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} placeholder="Prospect / Pro / Staff"/>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={handle}><Save className="mr-2 h-4 w-4"/>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClubDialog({ open, onOpenChange, onSave, initial }) {
  const [form, setForm] = useState(initial || { name: "", country: "FRA", division: "", city: "", notes: "" });
  useEffect(() => { setForm(initial || { name: "", country: "FRA", division: "", city: "", notes: "" }); }, [initial, open]);
  const handle = () => { onSave({ ...(initial || { id: uid() }), ...form }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>{initial ? "Modifier club" : "Ajouter club"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Nom" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <LabeledInput label="Pays" value={form.country} onChange={v=>setForm(f=>({...f,country:v}))}/>
          <LabeledInput label="Division" value={form.division} onChange={v=>setForm(f=>({...f,division:v}))}/>
          <LabeledInput label="Ville" value={form.city} onChange={v=>setForm(f=>({...f,city:v}))}/>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Contacts, historique, besoins…"/>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={handle}><Save className="mr-2 h-4 w-4"/>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FriendlyDialog({ open, onOpenChange, onSave, initial }) {
  const [form, setForm] = useState(initial || { requesterClub: "", category: "Pro", dateWanted: "", location: "", budget: 0, notes: "" });
  useEffect(() => { setForm(initial || { requesterClub: "", category: "Pro", dateWanted: "", location: "", budget: 0, notes: "" }); }, [initial, open]);
  const handle = () => { onSave({ ...(initial || { id: uid() }), ...form }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>{initial ? "Modifier demande de match amical" : "Ajouter demande de match amical"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><LabeledInput label="Club demandeur" value={form.requesterClub} onChange={v=>setForm(f=>({...f,requesterClub:v}))}/></div>
          <LabeledInput label="Catégorie" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} placeholder="Pro / Reserve / U19 / U17"/>
          <LabeledInput type="date" label="Date souhaitée" value={form.dateWanted} onChange={v=>setForm(f=>({...f,dateWanted:v}))}/>
          <LabeledInput label="Lieu" value={form.location} onChange={v=>setForm(f=>({...f,location:v}))}/>
          <LabeledInput type="number" label="Budget (€)" value={form.budget} onChange={v=>setForm(f=>({...f,budget:Number(v||0)}))}/>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={handle}><Save className="mr-2 h-4 w-4"/>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractDialog({ open, onOpenChange, onSave, initial, peopleOptions = [], clubOptions = [] }) {
  const [form, setForm] = useState(initial || { person: "", club: "", type: "Joueur", start: "", end: "", commissionPct: 10, fixedFee: 0, status: "Brouillon" });
  useEffect(()=>{ setForm(initial || { person: "", club: "", type: "Joueur", start: "", end: "", commissionPct: 10, fixedFee: 0, status: "Brouillon" }); }, [initial, open]);
  const handle = () => { onSave({ ...(initial || { id: uid() }), ...form }); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader><DialogTitle>{initial ? "Modifier contrat" : "Nouveau contrat"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Personne</Label>
            <select className="border rounded-md h-9 px-2 w-full text-sm" value={form.person} onChange={e=>setForm(f=>({...f, person: e.target.value}))}>
              <option value="">Sélectionner…</option>
              {peopleOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>Club</Label>
            <select className="border rounded-md h-9 px-2 w-full text-sm" value={form.club} onChange={e=>setForm(f=>({...f, club: e.target.value}))}>
              <option value="">Sélectionner…</option>
              {clubOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <LabeledInput label="Type" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} placeholder="Joueur / Entraîneur / Staff"/>
          <LabeledInput type="date" label="Début" value={form.start} onChange={v=>setForm(f=>({...f,start:v}))}/>
          <LabeledInput type="date" label="Fin" value={form.end} onChange={v=>setForm(f=>({...f,end:v}))}/>
          <LabeledInput type="number" label="Commission (%)" value={form.commissionPct} onChange={v=>setForm(f=>({...f,commissionPct:Number(v||0)}))}/>
          <LabeledInput type="number" label="Honoraires fixes (€)" value={form.fixedFee} onChange={v=>setForm(f=>({...f,fixedFee:Number(v||0)}))}/>
          <LabeledInput label="Statut" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} placeholder="Brouillon / Actif / Clos"/>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={handle}><Save className="mr-2 h-4 w-4"/>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== App principale ===================== */
export default function AgentApp() {
  // datasets
  const [players, setPlayers] = useLocalStorage("app.players", SAMPLE_PLAYERS);
  const [clubs, setClubs] = useLocalStorage("app.clubs", SAMPLE_CLUBS);
  const [friendlies, setFriendlies] = useLocalStorage("app.friendlies", SAMPLE_FRIENDLIES);
  const [contracts, setContracts] = useLocalStorage("app.contracts", SAMPLE_CONTRACTS);

  // settings & auth
  const [branding, setBranding] = useLocalStorage("app.branding", DEFAULT_BRANDING);
  const [user, setUser] = useLocalStorage("app.user", null);

  // UI states
  const [tab, setTab] = useState("dashboard");
  const [searchPlayers, setSearchPlayers] = useState("");
  const [searchClubs, setSearchClubs] = useState("");
  const [searchFriendlies, setSearchFriendlies] = useState("");
  const [searchContracts, setSearchContracts] = useState("");

  const [editPlayer, setEditPlayer] = useState(null);
  const [editClub, setEditClub] = useState(null);
  const [editFriendly, setEditFriendly] = useState(null);
  const [editContract, setEditContract] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  // Filters
  const [filterSport, setFilterSport] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterContractStatus, setFilterContractStatus] = useState("");

  // Import JSON/CSV
  const fileRefJSON = useRef(null);
  const fileRefCSVPlayers = useRef(null);
  const fileRefCSVClubs = useRef(null);

  const doImportJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.players)) setPlayers(data.players);
        if (Array.isArray(data.clubs)) setClubs(data.clubs);
        if (Array.isArray(data.friendlies)) setFriendlies(data.friendlies);
        if (Array.isArray(data.contracts)) setContracts(data.contracts);
        if (data.branding) setBranding(data.branding);
      } catch (e) { alert("Fichier invalide"); }
    };
    reader.readAsText(file);
  };

  const importPlayersCSV = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result||""));
      const normalized = rows.map(r => ({
        id: uid(),
        name: r.name || r.Nom || r.nom || r.player || "",
        sport: r.sport || r.Sport || "Football",
        position: r.position || r.Poste || r.role || "",
        birthYear: Number(r.birthYear || r.annee || r.naissance || 2004),
        heightCm: Number(r.heightCm || r.taille || r.height || 0),
        weightKg: Number(r.weightKg || r.poids || r.weight || 0),
        club: r.club || r.Club || "",
        nationality: r.nationality || r.Nationalite || r.nat || "",
        status: r.status || r.Statut || "Prospect",
      }));
      setPlayers(prev => [...normalized, ...prev]);
    };
    reader.readAsText(file);
  };

  const importClubsCSV = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result||""));
      const normalized = rows.map(r => ({
        id: uid(),
        name: r.name || r.Nom || r.club || r.Club || "",
        country: r.country || r.Pays || "FRA",
        division: r.division || r.Division || "",
        city: r.city || r.Ville || "",
        notes: r.notes || r.Notes || "",
      }));
      setClubs(prev => [...normalized, ...prev]);
    };
    reader.readAsText(file);
  };

  // Derived lists
  const sports = Array.from(new Set(players.map(p=>p.sport).filter(Boolean)));
  const statuses = Array.from(new Set(players.map(p=>p.status).filter(Boolean)));
  const countries = Array.from(new Set(clubs.map(c=>c.country).filter(Boolean)));
  const categories = Array.from(new Set(friendlies.map(f=>f.category).filter(Boolean)));
  const contractStatuses = Array.from(new Set(contracts.map(c=>c.status).filter(Boolean)));

  const filteredPlayers = useMemo(() => {
    const q = searchPlayers.toLowerCase();
    return players
      .filter(p => !filterSport || p.sport === filterSport)
      .filter(p => !filterStatus || p.status === filterStatus)
      .filter(p => Object.values(p).some(v => String(v).toLowerCase().includes(q)));
  }, [players, searchPlayers, filterSport, filterStatus]);

  const filteredClubs = useMemo(() => {
    const q = searchClubs.toLowerCase();
    return clubs
      .filter(c => !filterCountry || c.country === filterCountry)
      .filter(c => Object.values(c).some(v => String(v).toLowerCase().includes(q)));
  }, [clubs, searchClubs, filterCountry]);

  const filteredFriendlies = useMemo(() => {
    const q = searchFriendlies.toLowerCase();
    return friendlies
      .filter(f => !filterCategory || f.category === filterCategory)
      .filter(f => Object.values(f).some(v => String(v).toLowerCase().includes(q)));
  }, [friendlies, searchFriendlies, filterCategory]);

  const filteredContracts = useMemo(() => {
    const q = searchContracts.toLowerCase();
    return contracts
      .filter(c => !filterContractStatus || c.status === filterContractStatus)
      .filter(c => Object.values(c).some(v => String(v).toLowerCase().includes(q)));
  }, [contracts, searchContracts, filterContractStatus]);

  // KPIs simples
  const kpiFootball = players.filter(p=>p.sport.toLowerCase().includes("foot")).length;
  const kpiRugby = players.filter(p=>p.sport.toLowerCase().includes("rug")).length;
  const kpiBasket = players.filter(p=>p.sport.toLowerCase().includes("bask")).length;

  const isAdmin = user?.role === "admin";

  // PWA helpers (à télécharger depuis l’onglet Paramètres)
  const downloadManifest = () => downloadJSON("manifest.webmanifest", {
    name: branding.name || "Agent Dashboard",
    short_name: branding.name || "Agent",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.accent,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  });

  const downloadServiceWorker = () =>
    downloadFile(
      "service-worker.js",
`self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { self.clients.claim(); });
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    try { return await fetch(event.request); } catch (e) { return caches.match(event.request) || Response.error(); }
  })());
});`
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" style={{ '--tw-ring-color': branding.accent }}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl grid place-items-center font-bold" style={{ backgroundColor: `${branding.accent}22`, color: branding.accent }}>
              {branding.logoText?.slice(0,1) || "A"}
            </div>
            <div>
              <div className="font-semibold tracking-tight leading-none">{branding.name || "Agent Dashboard"}</div>
              <div className="text-xs text-muted-foreground">Starter — React + Tailwind</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Données locales</span>
            {user ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="hidden sm:inline-flex"><Shield className="h-3 w-3 mr-1"/>{user.role}</Badge>
                <div className="hidden sm:block font-medium">{user.name}</div>
                <Button size="sm" variant="secondary" onClick={()=>setUser(null)}><LogOut className="h-3 w-3 mr-2"/>Déconnexion</Button>
              </div>
            ) : (
              <Button size="sm" onClick={()=>setAuthOpen(true)}><LogIn className="h-3 w-3 mr-2"/>Se connecter</Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-6 md:w-[900px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="players">Joueurs</TabsTrigger>
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
            <TabsTrigger value="friendlies">Amicaux</TabsTrigger>
            <TabsTrigger value="contracts"><Handshake className="h-4 w-4 mr-2"/>Contrats</TabsTrigger>
            <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-2"/>Paramètres</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <KpiCard title="Joueurs & Staff" value={players.length}/>
              <KpiCard title="Clubs" value={clubs.length}/>
              <KpiCard title="Demandes amicales" value={friendlies.length}/>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-base">Répartition par sport</CardTitle></CardHeader>
                <CardContent>
                  <Row label="Football" value={kpiFootball}/>
                  <Row label="Rugby" value={kpiRugby}/>
                  <Row label="Basket" value={kpiBasket}/>
                </CardContent>
              </Card>
              <Card className="rounded-2xl md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Dernières demandes d'amical</CardTitle></CardHeader>
                <CardContent>
                  {friendlies.length === 0 ? (
                    <EmptyState title="Aucune demande">
                      <Button onClick={()=>setTab("friendlies")}><CalendarCheck className="mr-2 h-4 w-4"/>Ajouter une demande</Button>
                    </EmptyState>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Club</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Date souhaitée</TableHead>
                            <TableHead>Zone</TableHead>
                            <TableHead>Budget</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {friendlies.slice(0,5).map(f => (
                            <TableRow key={f.id}>
                              <TableCell>{f.requesterClub}</TableCell>
                              <TableCell>{f.category}</TableCell>
                              <TableCell>{f.dateWanted || "—"}</TableCell>
                              <TableCell>{f.location}</TableCell>
                              <TableCell>{f.budget ? `${f.budget} €` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PLAYERS */}
          <TabsContent value="players" className="mt-6 space-y-4">
            <EntityToolbar
              icon={Users}
              title="Joueurs & Staff"
              count={filteredPlayers.length}
              search={searchPlayers}
              setSearch={setSearchPlayers}
              onAdd={()=>setEditPlayer({})}
              onExport={isAdmin ? ()=>downloadCSV("players.csv", players) : undefined}
              extra={
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Filtres:</div>
                  <select className="border rounded-md h-9 px-2 text-sm" value={filterSport} onChange={e=>setFilterSport(e.target.value)}>
                    <option value="">Sport</option>
                    {sports.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="border rounded-md h-9 px-2 text-sm" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                    <option value="">Statut</option>
                    {statuses.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button variant="secondary" size="sm" onClick={()=>fileRefCSVPlayers.current?.click()}><FileSpreadsheet className="h-4 w-4 mr-2"/>Importer CSV</Button>
                  <input ref={fileRefCSVPlayers} type="file" accept=".csv" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) importPlayersCSV(f); e.target.value=''; }}/>
                </div>
              }
            />
            {filteredPlayers.length === 0 ? (
              <EmptyState title="Aucun joueur ou staff">
                <Button onClick={()=>setEditPlayer({})}><Plus className="mr-2 h-4 w-4"/>Ajouter</Button>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Année</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Poids</TableHead>
                      <TableHead>Nat.</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.sport}</TableCell>
                        <TableCell>{p.position}</TableCell>
                        <TableCell>{p.club}</TableCell>
                        <TableCell>{p.birthYear}</TableCell>
                        <TableCell>{p.heightCm ? `${p.heightCm} cm` : "—"}</TableCell>
                        <TableCell>{p.weightKg ? `${p.weightKg} kg` : "—"}</TableCell>
                        <TableCell>{p.nationality}</TableCell>
                        <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="icon" onClick={()=>setEditPlayer(p)}><Pencil className="h-4 w-4"/></Button>
                            {isAdmin && <Button variant="destructive" size="icon" onClick={()=>setPlayers(prev=>prev.filter(x=>x.id!==p.id))}><Trash2 className="h-4 w-4"/></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* CLUBS */}
          <TabsContent value="clubs" className="mt-6 space-y-4">
            <EntityToolbar
              icon={Building2}
              title="Clubs"
              count={filteredClubs.length}
              search={searchClubs}
              setSearch={setSearchClubs}
              onAdd={()=>setEditClub({})}
              onExport={isAdmin ? ()=>downloadCSV("clubs.csv", clubs) : undefined}
              extra={
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Filtre:</div>
                  <select className="border rounded-md h-9 px-2 text-sm" value={filterCountry} onChange={e=>setFilterCountry(e.target.value)}>
                    <option value="">Pays</option>
                    {countries.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button variant="secondary" size="sm" onClick={()=>fileRefCSVClubs.current?.click()}><FileSpreadsheet className="h-4 w-4 mr-2"/>Importer CSV</Button>
                  <input ref={fileRefCSVClubs} type="file" accept=".csv" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) importClubsCSV(f); e.target.value=''; }}/>
                </div>
              }
            />
            {filteredClubs.length === 0 ? (
              <EmptyState title="Aucun club référencé">
                <Button onClick={()=>setEditClub({})}><Plus className="mr-2 h-4 w-4"/>Ajouter</Button>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClubs.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.country}</TableCell>
                        <TableCell>{c.division}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell className="max-w-[340px] truncate" title={c.notes}>{c.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="icon" onClick={()=>setEditClub(c)}><Pencil className="h-4 w-4"/></Button>
                            {isAdmin && <Button variant="destructive" size="icon" onClick={()=>setClubs(prev=>prev.filter(x=>x.id!==c.id))}><Trash2 className="h-4 w-4"/></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* FRIENDLIES */}
          <TabsContent value="friendlies" className="mt-6 space-y-4">
            <EntityToolbar
              icon={CalendarCheck}
              title="Demandes de matchs amicaux"
              count={filteredFriendlies.length}
              search={searchFriendlies}
              setSearch={setSearchFriendlies}
              onAdd={()=>setEditFriendly({})}
              onExport={isAdmin ? ()=>downloadCSV("friendlies.csv", friendlies) : undefined}
              extra={
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Filtre:</div>
                  <select className="border rounded-md h-9 px-2 text-sm" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                    <option value="">Catégorie</option>
                    {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              }
            />
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-medium mb-3">Ajout rapide</div>
              <QuickAddFriendly onAdd={(item)=>setFriendlies(prev=>[{...item, id: uid()}, ...prev])} />
            </div>
            {filteredFriendlies.length === 0 ? (
              <EmptyState title="Aucune demande enregistrée">
                <Button onClick={()=>setEditFriendly({})}><Plus className="mr-2 h-4 w-4"/>Ajouter</Button>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Club</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Date souhaitée</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[160px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFriendlies.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.requesterClub}</TableCell>
                        <TableCell>{f.category}</TableCell>
                        <TableCell>{f.dateWanted || "—"}</TableCell>
                        <TableCell>{f.location}</TableCell>
                        <TableCell>{f.budget ? `${f.budget} €` : "—"}</TableCell>
                        <TableCell className="max-w-[340px] truncate" title={f.notes}>{f.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="icon" onClick={()=>setEditFriendly(f)}><Pencil className="h-4 w-4"/></Button>
                            <Button variant="secondary" size="icon" onClick={()=>setFriendlies(prev=>[{...f, id: uid()}, ...prev])}><Plus className="h-4 w-4"/></Button>
                            {isAdmin && <Button variant="destructive" size="icon" onClick={()=>setFriendlies(prev=>prev.filter(x=>x.id!==f.id))}><Trash2 className="h-4 w-4"/></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* CONTRACTS */}
          <TabsContent value="contracts" className="mt-6 space-y-4">
            <EntityToolbar
              icon={Handshake}
              title="Contrats & Commissions"
              count={filteredContracts.length}
              search={searchContracts}
              setSearch={setSearchContracts}
              onAdd={()=>setEditContract({})}
              onExport={isAdmin ? ()=>downloadCSV("contracts.csv", contracts) : undefined}
              extra={
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Filtre:</div>
                  <select className="border rounded-md h-9 px-2 text-sm" value={filterContractStatus} onChange={e=>setFilterContractStatus(e.target.value)}>
                    <option value="">Statut</option>
                    {contractStatuses.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              }
            />
            {filteredContracts.length === 0 ? (
              <EmptyState title="Aucun contrat">
                <Button onClick={()=>setEditContract({})}><Plus className="mr-2 h-4 w-4"/>Nouveau contrat</Button>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Personne</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead><Percent className="inline h-4 w-4 mr-1"/>Commission</TableHead>
                      <TableHead><Euro className="inline h-4 w-4 mr-1"/>Fixe</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[160px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.person}</TableCell>
                        <TableCell>{c.club}</TableCell>
                        <TableCell>{c.type}</TableCell>
                        <TableCell>{c.start || "—"}</TableCell>
                        <TableCell>{c.end || "—"}</TableCell>
                        <TableCell>{typeof c.commissionPct === 'number' ? `${c.commissionPct}%` : c.commissionPct}</TableCell>
                        <TableCell>{c.fixedFee ? `${c.fixedFee} €` : "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="icon" onClick={()=>setEditContract(c)}><Pencil className="h-4 w-4"/></Button>
                            {isAdmin && <Button variant="destructive" size="icon" onClick={()=>setContracts(prev=>prev.filter(x=>x.id!==c.id))}><Trash2 className="h-4 w-4"/></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-base">Branding</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput label="Nom" value={branding.name} onChange={v=>setBranding(b=>({...b, name: v}))} placeholder="Agent Dashboard"/>
                    <LabeledInput label="Lettre/logo" value={branding.logoText} onChange={v=>setBranding(b=>({...b, logoText: v}))} placeholder="A"/>
                    <div className="space-y-1 col-span-2">
                      <Label>Couleur d'accent</Label>
                      <Input type="color" value={branding.accent} onChange={e=>setBranding(b=>({...b, accent: e.target.value}))}/>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={()=>setBranding({ ...DEFAULT_BRANDING, name: "SAGAA Dashboard", accent: "#0057FF", logoText: "S" })}>Style SAGAA</Button>
                    <Button variant="secondary" onClick={()=>setBranding(DEFAULT_BRANDING)}>Style neutre</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-base">Sauvegarde & Import</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={()=>downloadJSON("backup.json", { players, clubs, friendlies, contracts, branding })}><Download className="h-4 w-4 mr-2"/>Exporter JSON</Button>
                    <input ref={fileRefJSON} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) doImportJSON(f); e.target.value=''; }}/>
                    <Button variant="secondary" onClick={()=>fileRefJSON.current?.click()}><Upload className="h-4 w-4 mr-2"/>Importer JSON</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Astuce: exporte en JSON puis réimporte sur un autre appareil (localStorage).</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <PlayerDialog
        open={!!editPlayer}
        onOpenChange={(v)=>!v && setEditPlayer(null)}
        initial={editPlayer && Object.keys(editPlayer).length? editPlayer : null}
        onSave={(p)=>setPlayers(prev=>{
          const exists = prev.some(x=>x.id===p.id);
          return exists ? prev.map(x=>x.id===p.id? p : x) : [{...p, id: p.id || uid()}, ...prev];
        })}
      />
      <ClubDialog
        open={!!editClub}
        onOpenChange={(v)=>!v && setEditClub(null)}
        initial={editClub && Object.keys(editClub).length? editClub : null}
        onSave={(c)=>setClubs(prev=>{
          const exists = prev.some(x=>x.id===c.id);
          return exists ? prev.map(x=>x.id===c.id? c : x) : [{...c, id: c.id || uid()}, ...prev];
        })}
      />
      <FriendlyDialog
        open={!!editFriendly}
        onOpenChange={(v)=>!v && setEditFriendly(null)}
        initial={editFriendly && Object.keys(editFriendly).length? editFriendly : null}
        onSave={(f)=>setFriendlies(prev=>{
          const exists = prev.some(x=>x.id===f.id);
          return exists ? prev.map(x=>x.id===f.id? f : x) : [{...f, id: f.id || uid()}, ...prev];
        })}
      />
      <ContractDialog
        open={!!editContract}
        onOpenChange={(v)=>!v && setEditContract(null)}
        initial={editContract && Object.keys(editContract).length? editContract : null}
        peopleOptions={players.map(p=>p.name)} clubOptions={clubs.map(c=>c.name)}
        onSave={(ct)=>setContracts(prev=>{
          const exists = prev.some(x=>x.id===ct.id);
          return exists ? prev.map(x=>x.id===ct.id? ct : x) : [{...ct, id: ct.id || uid()}, ...prev];
        })}
      />

      {/* Auth démo */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Connexion (démo)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <LabeledInput label="Nom" value={user?.name || ""} onChange={(v)=>setUser(u=>({ ...(u||{}), name: v }))} placeholder="Ton nom" />
            <div className="space-y-1">
              <Label>Rôle</Label>
              <select className="border rounded-md h-9 px-2 w-full text-sm" value={user?.role || "user"} onChange={e=>setUser(u=>({ ...(u||{}), role: e.target.value }))}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setAuthOpen(false)}>Fermer</Button>
            <Button onClick={()=>setAuthOpen(false)}><LogIn className="mr-2 h-4 w-4"/>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="py-10 text-center text-xs text-muted-foreground">
        Prototype local • Import/Export CSV & JSON • Filtres • Branding • Contrats • PWA assets.
      </footer>
    </div>
  );
}
