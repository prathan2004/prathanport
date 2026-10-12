import * as XLSX from 'xlsx';
export async function readRows(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), {type: 'array'});
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: false, defval: ''});
}
export function exportRows(rows, name) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Students');
  XLSX.writeFile(workbook, name);
}
