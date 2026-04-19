import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { getAll } from "@/lib/db";
import type { MissionBase, FuelEntry, ShellEntry, CustodyEntry, MissionType } from "@/lib/db";
import { ListTodo, Target, Fuel, Package, Crosshair, Radio } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/")({ component: () => <AuthGate><AppShell><Home /></AppShell></AuthGate> });

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="military-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [missions, setMissions] = useState<MissionBase[]>([]);
  const [fuel, setFuel] = useState<FuelEntry[]>([]);
  const [shells, setShells] = useState<ShellEntry[]>([]);
  const [custody, setCustody] = useState<CustodyEntry[]>([]);
  const [types, setTypes] = useState<MissionType[]>([]);

  useEffect(() => {
    (async () => {
      setMissions(await getAll("missions"));
      setFuel(await getAll("fuel"));
      setShells(await getAll("shells"));
      setCustody(await getAll("custody"));
      setTypes(await getAll("missionTypes"));
    })();
  }, []);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name || id;

  const targetsCount = missions.reduce((sum, m) => {
    if (m.type === "strike" && Array.isArray(m.data?.targets)) return sum + m.data.targets.length;
    return sum + (Number(m.data?.targetsCount) || 0);
  }, 0);

  const fuelTotal = fuel.reduce((s, f) => s + (Number(f.withdrawn) || 0), 0);

  const byType = Object.entries(
    missions.reduce<Record<string, number>>((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: typeName(k), value: v }));

  const COLORS = ["#4a7a4a", "#a02828", "#c9a84c", "#3b6fa0", "#8b5fbf"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ListTodo} label="إجمالي المهام" value={missions.length} color="bg-primary" />
        <StatCard icon={Target} label="عدد الأهداف" value={targetsCount} color="bg-blood" />
        <StatCard icon={Fuel} label="استهلاك المخصصات" value={fuelTotal} color="bg-accent" />
        <StatCard icon={Package} label="عدد العهدات" value={custody.length} color="bg-chart-4" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {types.map((t, i) => (
          <StatCard
            key={t.id}
            icon={i % 2 === 0 ? Crosshair : Radio}
            label={t.name}
            value={missions.filter((m) => m.type === t.id).length}
            color={i % 2 === 0 ? "bg-military" : "bg-military-dark"}
          />
        ))}
      </div>

      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold mb-3 text-gold">توزيع المهام حسب النوع</h3>
        {byType.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات بعد</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold mb-3 text-gold">القذائف حسب النوع</h3>
        {shells.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات بعد</div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={Object.entries(
                shells.reduce<Record<string, number>>((acc, s) => { acc[s.type] = (acc[s.type] || 0) + s.count; return acc; }, {})
              ).map(([name, value]) => ({ name, value }))}>
                <XAxis dataKey="name" stroke="#9aa39a" fontSize={11} />
                <YAxis stroke="#9aa39a" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#4a7a4a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
