type Cell=string|number|boolean|null|undefined;

function text(value:Cell){
  return value===null||value===undefined?"":String(value);
}

function csvCell(value:Cell){
  const valueText=text(value);
  return /[",\n\r;]/.test(valueText)?'"'+valueText.replace(/"/g,'""')+'"':valueText;
}

export function csvFile(headers:string[],rows:Cell[][]){
  const lines=[
    headers.map(csvCell).join(";"),
    ...rows.map((row)=>row.map(csvCell).join(";")),
  ];
  return "\uFEFF"+lines.join("\r\n");
}

function xmlEscape(value:Cell){
  return text(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

function cellXml(value:Cell){
  const numeric=typeof value==="number"&&Number.isFinite(value);
  const type=numeric?"Number":"String";
  return '<Cell><Data ss:Type="'+type+'">'+xmlEscape(value)+'</Data></Cell>';
}

export function excelXmlFile(sheetName:string,headers:string[],rows:Cell[][]){
  const safeSheet=sheetName.replace(/[\\\/?*\[\]:]/g," ").slice(0,31)||"Export";
  const headerRow="<Row>"+headers.map((header)=>cellXml(header)).join("")+"</Row>";
  const body=rows.map((row)=>"<Row>"+row.map(cellXml).join("")+"</Row>").join("");
  return '<?xml version="1.0"?>'+
    '<?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '+
    'xmlns:o="urn:schemas-microsoft-com:office:office" '+
    'xmlns:x="urn:schemas-microsoft-com:office:excel" '+
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
    '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>'+
    '<Worksheet ss:Name="'+xmlEscape(safeSheet)+'"><Table>'+
    headerRow+body+
    '</Table></Worksheet></Workbook>';
}

export function attachmentHeaders(filename:string,contentType:string){
  return {
    "Content-Type":contentType,
    "Content-Disposition":'attachment; filename="'+filename.replace(/"/g,"")+'"',
    "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff",
  };
}
