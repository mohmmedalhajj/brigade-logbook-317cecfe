import { exportPDF, htmlKV, htmlTable, htmlEscape } from "./pdf";
import type { MissionBase } from "./db";

export async function missionToPDF(m: MissionBase, executorName: string) {
  const d = m.data;
  let title = "تقرير مهمة";
  let body = "";

  if (m.type === "recon") {
    title = "تقرير مهمة استطلاع";
    body =
      htmlKV([
        ["رقم المهمة", d.missionNumber],
        ["الجهة المنفذة", executorName],
        ["أمر المهمة", d.missionOrder],
        ["أمام قطاع", d.sector],
        ["التاريخ", d.date],
        ["وقت الخروج", d.exitTime],
        ["وقت العودة", d.returnTime],
        ["عدد الطلعات", d.sortiesCount],
        ["عدد الأهداف", d.targetsCount],
      ]) +
      `<h3 style="color:#2d4a2d;">النتائج</h3>` +
      `<div style="border:1px solid #cfd8cf; padding:10px; white-space:pre-wrap;">${htmlEscape(d.results)}</div>` +
      `<h3 style="color:#2d4a2d;">ملاحظات</h3>` +
      `<div style="border:1px solid #cfd8cf; padding:10px; white-space:pre-wrap;">${htmlEscape(d.notes)}</div>` +
      htmlKV([["الفريق المنفذ", d.team]]);
  } else if (m.type === "strike") {
    title = "تقرير مهمة استهداف";
    const targets = Array.isArray(d.targets) ? d.targets : [];
    body =
      htmlKV([
        ["رقم المهمة", d.missionNumber],
        ["الجهة المنفذة", executorName],
        ["جهة الأمر", d.orderSource],
        ["القطاع", d.sector],
        ["المنطقة", d.area],
        ["نوع الطائرة", d.aircraftType],
        ["كود المهمة", d.code],
        ["التاريخ", d.date],
        ["وقت البداية", d.startTime],
        ["وقت النهاية", d.endTime],
        ["عدد الطلعات", d.sortiesCount],
        ["الغرض", d.purpose],
      ]) +
      `<h3 style="color:#2d4a2d;">جدول الأهداف</h3>` +
      htmlTable(
        ["#", "الوقت", "نوع الهدف", "تفاصيل", "الإحداثي", "LV", "المقذوف", "قوة الضربة", "ملاحظات"],
        targets.map((t: any, i: number) => [
          i + 1,
          t.time,
          t.targetType,
          t.details,
          t.coordinate,
          t.lv,
          t.projectile,
          t.power,
          t.notes,
        ])
      ) +
      `<h3 style="color:#2d4a2d;">ملاحظات</h3>` +
      `<div style="border:1px solid #cfd8cf; padding:10px; white-space:pre-wrap;">${htmlEscape(d.notes)}</div>`;
  } else if (m.type === "artillery") {
    title = "تقرير مهمة تصحيح مدفعي";
    body = htmlKV([
      ["رقم المهمة", d.missionNumber],
      ["الجهة المنفذة", executorName],
      ["أمر المهمة", d.missionOrder],
      ["القطاع", d.sector],
      ["التاريخ", d.date],
      ["الإحداثي", d.coordinate],
      ["LV", d.lv],
      ["نوع الرمي", d.fireType],
      ["نتائج الرمي", d.fireResults],
      ["التصحيح المطلوب", d.correction],
      ["التأثير", d.impact],
      ["ملاحظات", d.notes],
    ]);
  } else if (m.type === "jamming") {
    title = "تقرير مهمة تشويش";
    body = htmlKV([
      ["رقم المهمة", d.missionNumber],
      ["الجهة المنفذة", executorName],
      ["أمام قطاع", d.sector],
      ["التاريخ", d.date],
      ["الوقت", d.time],
      ["نوع الطائرة", d.aircraftType],
      ["الرقم التسلسلي", d.serial],
      ["إحداثي البداية", d.startCoord],
      ["LV البداية", d.startLV],
      ["إحداثي النهاية", d.endCoord],
      ["LV النهاية", d.endLV],
      ["نوع التشويش", d.jammingType],
      ["قوة التأثير", d.impactPower],
      ["تفاصيل موجزة", d.details],
      ["الفريق المنفذ", d.team],
    ]);
  } else {
    title = `تقرير ${m.type}`;
    body = htmlKV(Object.entries(d).map(([k, v]) => [k, v]));
  }

  await exportPDF({
    title,
    subtitle: `رقم المهمة: ${d.missionNumber || ""}`,
    bodyHtml: body,
    filename: `mission-${d.missionNumber || m.id}.pdf`,
  });
}
