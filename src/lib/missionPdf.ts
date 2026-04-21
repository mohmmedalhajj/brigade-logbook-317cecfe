import { exportPDF, htmlKV, htmlTable, htmlEscape } from "./pdf";
import { getAll, type MissionBase, type MissionType, type MissionAttachment } from "./db";

// Built-in Arabic labels for known field keys (used as fallback for custom types)
const BUILTIN_LABELS: Record<string, string> = {
  missionNumber: "رقم المهمة",
  missionOrder: "أمر المهمة",
  orderSource: "جهة الأمر",
  sector: "القطاع / أمام قطاع",
  area: "المنطقة",
  aircraftType: "نوع الطائرة",
  code: "كود المهمة",
  date: "التاريخ",
  time: "الوقت",
  exitTime: "وقت الخروج",
  returnTime: "وقت العودة",
  startTime: "وقت البداية",
  endTime: "وقت النهاية",
  sortiesCount: "عدد الطلعات",
  targetsCount: "عدد الأهداف",
  results: "النتائج",
  notes: "ملاحظات",
  team: "الفريق المنفذ",
  purpose: "الغرض",
  coordinate: "الإحداثي",
  lv: "LV",
  fireType: "نوع الرمي",
  fireResults: "نتائج الرمي",
  correction: "التصحيح المطلوب",
  impact: "التأثير",
  serial: "الرقم التسلسلي",
  startCoord: "إحداثي البداية",
  startLV: "LV البداية",
  endCoord: "إحداثي النهاية",
  endLV: "LV النهاية",
  jammingType: "نوع التشويش",
  impactPower: "قوة التأثير",
  details: "تفاصيل موجزة",
  targets: "الأهداف",
};

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
    // Custom user-defined mission type — look up Arabic field labels from the type definition
    const allTypes = await getAll<MissionType>("missionTypes");
    const typeDef = allTypes.find((t) => t.id === m.type);
    title = `تقرير ${typeDef?.name || m.type}`;

    const labelFor = (key: string): string => {
      const fromType = typeDef?.fields.find((f) => f.key === key)?.label;
      return fromType || BUILTIN_LABELS[key] || key;
    };

    // Preserve the field order defined in the type, then append any extra keys
    const orderedKeys: string[] = [];
    if (typeDef) {
      for (const f of typeDef.fields) {
        if (f.key in d) orderedKeys.push(f.key);
      }
    }
    for (const k of Object.keys(d)) {
      if (!orderedKeys.includes(k)) orderedKeys.push(k);
    }

    body = htmlKV(
      orderedKeys
        .filter((k) => d[k] !== undefined && d[k] !== null && d[k] !== "")
        .map((k) => [labelFor(k), d[k]])
    );
  }

  // Add image attachments to the PDF body
  const imageAttachments = (m.attachments || []).filter((a) => a.type === "image");
  if (imageAttachments.length > 0) {
    body += `<h3 style="color:#2d4a2d; margin-top:20px;">المرفقات (${imageAttachments.length} صورة)</h3>`;
    body += `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;">`;
    for (const att of imageAttachments) {
      body += `<img src="${att.dataUrl}" style="width:220px; height:auto; border:2px solid #2d4a2d; border-radius:8px; object-fit:cover;" crossorigin="anonymous" />`;
    }
    body += `</div>`;
  }

  // Build Arabic filename
  const missionTypeName = title.replace(/^تقرير\s+/, "").trim();
  const missionNum = d.missionNumber || m.id;
  const filename = `${missionTypeName} - رقم ${missionNum}.pdf`;

  await exportPDF({
    title,
    subtitle: `رقم المهمة: ${d.missionNumber || ""}`,
    bodyHtml: body,
    filename,
  });
}
