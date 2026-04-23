import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getAll, type MissionBase, type MissionType } from "@/lib/db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { exportPDF, htmlKV, htmlTable } from "@/lib/pdf";

export const Route = createFileRoute("/stats")({
  component: () => (
    <AuthGate>
      <AppShell>
        <Stats />
      </AppShell>
    </AuthGate>
  ),
});



function Stats() {
  const [missions, setMissions] = useState<MissionBase[]>([]);
  const [types, setTypes] = useState<MissionType[]>([]);
  useEffect(() => { (async () => { setMissions(await getAll("missions")); setTypes(await getAll("missionTypes")); })(); }, []);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name || id;

  const byType = Object.entries(missions.reduce<Record<string, number>>((a, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {}))
    .map(([k, v]) => ({ name: typeName(k), value: v }));

  const monthly = (() => {
    const map: Record<string, number> = {};
    missions.forEach((m) => {
      const key = (m.data?.date || "").slice(0, 7) || "غير محدد";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  })();

  const targetsCount = missions.reduce((s, m) => {
    if (m.type === "strike" && Array.isArray(m.data?.targets)) return s + m.data.targets.length;
    return s + (Number(m.data?.targetsCount) || 0);
  }, 0);

  async function exportMonthly() {
    const month = new Date().toISOString().slice(0, 7);
    const ms = missions.filter((m) => (m.data?.date || "").startsWith(month));

    // targets count for the month
    const monthTargets = ms.reduce((s, m) => {
      if (m.type === "strike" && Array.isArray(m.data?.targets)) return s + m.data.targets.length;
      return s + (Number(m.data?.targetsCount) || 0);
    }, 0);

    // count per type
    const typeCounts = ms.reduce<Record<string, number>>((a, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {});
    const typeRows = Object.entries(typeCounts).map(([k, v]) => [typeName(k), v]);

    // count per executor
    const execCounts = ms.reduce<Record<string, number>>((a, m) => {
      const k = m.executor || m.data?.executor || "—"; a[k] = (a[k] || 0) + 1; return a;
    }, {});
    const execRows = Object.entries(execCounts).map(([k, v]) => [k, v]);

    const body =
      htmlKV([
        ["الشهر", month],
        ["إجمالي المهام", ms.length],
        ["إجمالي الأهداف", monthTargets],
        ["عدد أنواع المهام", Object.keys(typeCounts).length],
      ]) +
      `<h3 style="color:#2d4a2d;">المهام حسب النوع</h3>` +
      htmlTable(["النوع", "العدد"], typeRows) +
      `<h3 style="color:#2d4a2d;">المهام حسب المحور</h3>` +
      htmlTable(["المحور", "العدد"], execRows) +
      `<h3 style="color:#2d4a2d;">قائمة المهام التفصيلية</h3>` +
      htmlTable(
        ["#", "النوع", "رقم المهمة", "التاريخ", "القطاع", "المحور", "الأهداف"],
        ms.map((m, i) => [
          i + 1,
          typeName(m.type),
          m.data?.missionNumber || "",
          m.data?.date || "",
          m.data?.sector || m.data?.area || "",
          m.executor || m.data?.executor || "—",
          m.type === "strike" && Array.isArray(m.data?.targets)
            ? m.data.targets.length
            : (m.data?.targetsCount || ""),
        ])
      );
    await exportPDF({ title: `تقرير الإحصائيات الشهري - ${month}`, bodyHtml: body, filename: `تقرير-الإحصائيات-${month}.pdf` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gold">الإحصائيات</h1>
        <Button onClick={exportMonthly} className="gap-1"><FileDown className="w-4 h-4" /> PDF شهري</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="military-card rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gold">{missions.length}</div>
          <div className="text-xs text-muted-foreground mt-1">إجمالي المهام</div>
        </div>
        <div className="military-card rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blood">{targetsCount}</div>
          <div className="text-xs text-muted-foreground mt-1">عدد الأهداف</div>
        </div>
        <div className="military-card rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-military-light">{monthly.length}</div>
          <div className="text-xs text-muted-foreground mt-1">أشهر النشاط</div>
        </div>
      </div>

      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold mb-3 text-gold">حسب النوع</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4a3a" />
              <XAxis dataKey="name" stroke="#9aa39a" fontSize={11} />
              <YAxis stroke="#9aa39a" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "#1a2e1a", border: "1px solid #3a4a3a", borderRadius: 8, color: "#e0e0e0" }} labelStyle={{ color: "#c9a84c" }} itemStyle={{ color: "#e0e0e0" }} />
              <Bar dataKey="value" fill="#4a7a4a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold mb-3 text-gold">المهام الشهرية</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4a3a" />
              <XAxis dataKey="month" stroke="#9aa39a" fontSize={11} />
              <YAxis stroke="#9aa39a" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "#1a2e1a", border: "1px solid #3a4a3a", borderRadius: 8, color: "#e0e0e0" }} labelStyle={{ color: "#c9a84c" }} itemStyle={{ color: "#e0e0e0" }} />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#c9a84c" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
