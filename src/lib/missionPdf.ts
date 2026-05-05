import { exportPDF, htmlKV, htmlTable, htmlEscape } from "./pdf";
import { getAll, type MissionBase, type MissionType, type MissionAttachment } from "./db";
import { formatTimeAr } from "./utils";

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

function attachmentsHtml(attachments?: MissionAttachment[]): string {
  const list = attachments || [];
  const images = list.filter((a) => a.type === "image");
  const videos = list.filter((a) => a.type === "video");
  let html = "";
  if (images.length > 0) {
    html += `<h3 style="color:#2d4a2d; margin-top:20px;">المرفقات - الصور (${images.length})</h3>`;
    html += `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;">`;
    for (const att of images) {
      html += `<img src="${att.dataUrl}" style="width:220px; height:auto; border:2px solid #2d4a2d; border-radius:8px; object-fit:cover;" crossorigin="anonymous" />`;
    }
    html += `</div>`;
  }
  if (videos.length > 0) {
    html += `<h3 style="color:#2d4a2d; margin-top:20px;">المرفقات - مقاطع الفيديو (${videos.length})</h3>`;
    html += `<ul style="margin-top:8px;">`;
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      html += `<li style="margin:4px 0;">${htmlEscape(v.name || `فيديو ${i + 1}`)}</li>`;
    }
    html += `</ul>`;
    html += `<div style="font-size:11px; color:#555; margin-top:4px;">يتم إرسال مقاطع الفيديو مع التقرير عبر تطبيق المراسلة.</div>`;
  }
  return html;
}

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
        ["وقت الخروج", formatTimeAr(d.exitTime)],
        ["وقت العودة", formatTimeAr(d.returnTime)],
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
        ["وقت البداية", formatTimeAr(d.startTime)],
        ["وقت النهاية", formatTimeAr(d.endTime)],
        ["عدد الطلعات", d.sortiesCount],
        ["الغرض", d.purpose],
      ]) +
      `<h3 style="color:#2d4a2d;">جدول الأهداف</h3>` +
      htmlTable(
        ["#", "الوقت", "نوع الهدف", "تفاصيل", "الإحداثي", "LV", "المقذوف", "قوة الضربة", "ملاحظات"],
        targets.map((t: any, i: number) => [
          i + 1,
          formatTimeAr(t.time),
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
      ["الوقت", formatTimeAr(d.time)],
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
        .map((k) => {
          const fieldDef = typeDef?.fields.find((f) => f.key === k);
          const val = fieldDef?.type === "time" ? formatTimeAr(d[k]) : d[k];
          return [labelFor(k), val];
        })
    );
  }

  // Prepend القطاع / الفرقة header
  const teamName = (m as any).team || "";
  const headerHtml = htmlKV([
    ["القطاع", executorName],
    ["الفرقة المنفذة", teamName],
  ]);
  body = headerHtml + body;

  // Add image attachments for all mission types
  body += attachmentsHtml(m.attachments);

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
