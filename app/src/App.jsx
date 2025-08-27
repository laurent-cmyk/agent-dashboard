import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users, Building2, CalendarCheck, Plus, Pencil, Trash2, Search,
  Download, Save, LogIn, LogOut, Settings as SettingsIcon, Shield,
  FileSpreadsheet, Handshake
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

// =====================================================
// Utils
// =====================================================
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

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

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const csv = [headers.join(",")]
    .concat(rows.map(r => headers.map(h => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.replace(/^\"|\"$/g, ""));
  return lines.map(line => {
    const cells = line.split(",").map(c => c.replace(/^\"|\"$/g, "").replace(/\"\"/g, '"'));
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i]);
    return obj;
  });
}

// =====================================================
// Sample data
// =====================================================
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

// =====================================================
// Components simples
// =====================================================
function LabeledInput({ label, value, onChange, placeholder, type="text" }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
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

// =====================================================
// Main App
// =====================================================
export default function AgentApp() {
  const [players, setPlayers] = useLocalStorage("app.players", SAMPLE_PLAYERS);
  const [clubs, setClubs] = useLocalStorage("app.clubs", SAMPLE_CLUBS);
  const [friendlies, setFriendlies] = useLocalStorage("app.friendlies", SAMPLE_FRIENDLIES);

  const [tab, setTab] = useState("dashboard");

  const kpiFootball = players.filter(p=>p.sport.toLowerCase().includes("foot")).length;
  const kpiRugby = players.filter(p=>p.sport.toLowerCase().includes("rug")).length;
  const kpiBasket = players.filter(p=>p.sport.toLowerCase().includes("bask")).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-20 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl grid place-items-center font-bold bg-primary/10">A</div>
            <div>
              <div className="font-semibold tracking-tight leading-none">Agent Dashboard</div>
              <div className="text-xs text-muted-foreground">Starter neutre — React + Tailwind</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="players">Joueurs</TabsTrigger>
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card><CardHeader><CardTitle>Joueurs</CardTitle></CardHeader><CardContent>{players.length}</CardContent></Card>
              <Card><CardHeader><CardTitle>Clubs</CardTitle></CardHeader><CardContent>{clubs.length}</CardContent></Card>
              <Card><CardHeader><CardTitle>Amicaux</CardTitle></CardHeader><CardContent>{friendlies.length}</CardContent></Card>
            </div>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle>Répartition par sport</CardTitle></CardHeader>
              <CardContent>
                <div>Football: {kpiFootball}</div>
                <div>Rugby: {kpiRugby}</div>
                <div>Basket: {kpiBasket}</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLAYERS */}
          <TabsContent value="players" className="mt-6 space-y-4">
            {players.length === 0 ? (
              <EmptyState title="Aucun joueur">
                <Button onClick={()=>setPlayers([{id:uid(), name:"Nouveau joueur", sport:"Football"}])}>Ajouter</Button>
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {players.map(p => (
                  <li key={p.id} className="border rounded p-2 flex justify-between">
                    <span>{p.name} ({p.sport})</span>
                    <Button variant="destructive" size="sm" onClick={()=>setPlayers(players.filter(x=>x.id!==p.id))}>Supprimer</Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* CLUBS */}
          <TabsContent value="clubs" className="mt-6 space-y-4">
            {clubs.length === 0 ? (
              <EmptyState title="Aucun club">
                <Button onClick={()=>setClubs([{id:uid(), name:"Nouveau club", country:"FRA"}])}>Ajouter</Button>
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {clubs.map(c => (
                  <li key={c.id} className="border rounded p-2 flex justify-between">
                    <span>{c.name} ({c.country})</span>
                    <Button variant="destructive" size="sm" onClick={()=>setClubs(clubs.filter(x=>x.id!==c.id))}>Supprimer</Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
