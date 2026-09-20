function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/…/g, "...")
    .replace(/[^\x20-\xFF]/g, "?");
}

function esc(value: unknown) {
  return clean(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: unknown, width = 82) {
  const words = clean(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function latin1(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 255;
  return bytes;
}

export function simplePdf(title: string, rows: string[]) {
  const prepared: string[] = [];
  rows.forEach((row) => wrap(row).forEach((line) => prepared.push(line)));

  const chunks: string[][] = [];
  for (let i = 0; i < prepared.length; i += 45) chunks.push(prepared.slice(i, i + 45));
  if (!chunks.length) chunks.push([""]);

  const pageCount = chunks.length;
  const fontNo = 3 + 2 * pageCount;
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" + chunks.map((_, i) => (3 + i) + " 0 R").join(" ") + "] /Count " + pageCount + " >>";

  chunks.forEach((chunk, i) => {
    const pageNo = 3 + i;
    const contentNo = 3 + pageCount + i;
    objects[pageNo] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + fontNo + " 0 R >> >> /Contents " + contentNo + " 0 R >>";

    const commands = [
      "BT /F1 15 Tf 46 806 Td (" + esc(title) + ") Tj ET",
      "BT /F1 8 Tf 46 789 Td (AEDBVT - document interne - page " + (i + 1) + "/" + pageCount + ") Tj ET",
    ];
    let y = 765;
    chunk.forEach((line) => {
      commands.push("BT /F1 10 Tf 46 " + y + " Td (" + esc(line) + ") Tj ET");
      y -= 16;
    });
    const stream = commands.join("\n");
    objects[contentNo] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
  });

  objects[fontNo] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let i = 1; i <= fontNo; i++) {
    offsets[i] = pdf.length;
    pdf += i + " 0 obj\n" + objects[i] + "\nendobj\n";
  }

  const xref = pdf.length;
  pdf += "xref\n0 " + (fontNo + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i <= fontNo; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (fontNo + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";

  return latin1(pdf);
}
