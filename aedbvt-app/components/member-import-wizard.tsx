"use client";

import { useMemo, useState } from "react";

type ImportRow={
  member_number?:string;
  full_name:string;
  village:string;
  program?:string;
  study_level?:string;
  phone?:string;
  email?:string;
  joined_at?:string;
  status?:string;
};

type ParsedRow=ImportRow&{_line:number;_errors:string[]};

const aliases:Record<string,keyof ImportRow>={
  "numero":"member_number",
  "n°":"member_number",
  "numéro":"member_number",
  "member_number":"member_number",
  "nom":"full_name",
  "nom complet":"full_name",
  "full_name":"full_name",
  "village":"village",
  "filiere":"program",
  "filière":"program",
  "program":"program",
  "niveau":"study_level",
  "study_level":"study_level",
  "telephone":"phone",
  "téléphone":"phone",
  "phone":"phone",
  "email":"email",
  "e-mail":"email",
  "date adhesion":"joined_at",
  "date adhésion":"joined_at",
  "joined_at":"joined_at",
  "statut":"status",
  "status":"status",
};

function normalizeHeader(value:string){
  return value.trim().toLocaleLowerCase("fr").replace(/s+/g," ");
}

function parseCsv(text:string){
  const firstLine=text.split(/?
/,1)[0]||"";
  const counts=[
    [";",(firstLine.match(/;/g)||[]).length],
    [",",(firstLine.match(/,/g)||[]).length],
    ["	",(firstLine.match(/	/g)||[]).length],
  ] as [string,number][];
  const delimiter=counts.sort((a,b)=>b[1]-a[1])[0][0];

  const rows:string[][]=[];
  let row:string[]=[];
  let cell="";
  let quoted=false;

  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
      continue;
    }
    if(char===delimiter&&!quoted){row.push(cell);cell="";continue;}
    if((char==="
"||char==="")&&!quoted){
      if(char===""&&text[i+1]==="
") i++;
      row.push(cell);cell="";
      if(row.some((value)=>value.trim()!=="")) rows.push(row);
      row=[];
      continue;
    }
    cell+=char;
  }
  row.push(cell);
  if(row.some((value)=>value.trim()!=="")) rows.push(row);
  return rows;
}

function validateRow(row:ImportRow,line:number):ParsedRow{
  const errors:string[]=[];
  const village=row.village?.trim();
  const status=(row.status||"active").trim().toLowerCase();

  if(!row.full_name?.trim()) errors.push("Nom complet requis");
  if(!["Darsalama","Bandrani-Vouani"].includes(village)) errors.push("Village invalide");
  if(!["pending","active","inactive"].includes(status)) errors.push("Statut invalide");
  if(row.email&& !/^[^s@]+@[^s@]+.[^s@]+$/.test(row.email.trim())) errors.push("Email invalide");
  if(row.joined_at&& !/^d{4}-d{2}-d{2}$/.test(row.joined_at.trim())) errors.push("Date attendue : YYYY-MM-DD");

  return {
    ...row,
    full_name:row.full_name?.trim()||"",
    village,
    email:row.email?.trim().toLowerCase()||"",
    status,
    _line:line,
    _errors:errors,
  };
}

export function MemberImportWizard(){
  const [rows,setRows]=useState<ParsedRow[]>([]);
  const [fileName,setFileName]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{inserted:number;skipped:number;invalid:number;details?:string[]}|null>(null);
  const [error,setError]=useState("");

  const valid=useMemo(()=>rows.filter((row)=>row._errors.length===0),[rows]);
  const invalid=rows.length-valid.length;

  async function readFile(file:File){
    setResult(null);setError("");setFileName(file.name);
    const text=(await file.text()).replace(/^﻿/,"");
    const matrix=parseCsv(text);
    if(matrix.length<2){setRows([]);setError("Le fichier doit contenir une ligne d’en-têtes et au moins un membre.");return;}

    const keys=matrix[0].map((header)=>aliases[normalizeHeader(header)]||null);
    if(!keys.includes("full_name")||!keys.includes("village")){
      setRows([]);setError("Colonnes obligatoires absentes : nom complet et village.");return;
    }

    const parsed=matrix.slice(1).map((values,index)=>{
      const row:any={};
      keys.forEach((key,i)=>{if(key) row[key]=values[i]?.trim()||"";});
      return validateRow(row,index+2);
    });
    setRows(parsed);
  }

  function downloadTemplate(){
    const content="﻿numero;nom complet;village;filière;niveau;téléphone;email;date adhésion;statut\n;Exemple Membre;Darsalama;Licence Gestion;L3;0320000000;exemple@email.com;2026-09-01;active\n";
    const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="modele-import-membres-aedbvt.csv";a.click();
    URL.revokeObjectURL(url);
  }

  async function submit(){
    if(!valid.length||invalid>0) return;
    setBusy(true);setError("");setResult(null);
    try{
      const response=await fetch("/api/import/members",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({rows:valid.map(({_line,_errors,...row})=>row)}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Import impossible");
      setResult(data);
    }catch(err:any){
      setError(err?.message||"Import impossible");
    }finally{
      setBusy(false);
    }
  }

  return <div className="import-wizard">
    <div className="panel import-controls">
      <div><span className="eyebrow">Étape 1</span><h2>Choisir un fichier CSV</h2><p>Les colonnes obligatoires sont <b>nom complet</b> et <b>village</b>. Aucun membre existant ne sera écrasé.</p></div>
      <div className="import-actions"><label className="button primary import-file">Choisir un CSV<input type="file" accept=".csv,text/csv" onChange={(event)=>event.target.files?.[0]&&readFile(event.target.files[0])}/></label><button className="button secondary" type="button" onClick={downloadTemplate}>Télécharger le modèle</button></div>
      {fileName&&<small>Fichier : {fileName}</small>}
      {error&&<div className="import-error">{error}</div>}
    </div>

    {rows.length>0&&<div className="panel">
      <div className="panel-head"><div><span className="eyebrow">Étape 2</span><h2>Prévisualisation</h2></div><span className="status-pill">{valid.length} valide(s) · {invalid} erreur(s)</span></div>
      <div className="table-wrap"><table><thead><tr><th>Ligne</th><th>Nom</th><th>Village</th><th>Filière</th><th>Email</th><th>Statut</th><th>Validation</th></tr></thead><tbody>
        {rows.slice(0,100).map((row)=><tr key={row._line}><td>{row._line}</td><td><b>{row.full_name||"—"}</b></td><td>{row.village||"—"}</td><td>{row.program||"—"}</td><td>{row.email||"—"}</td><td>{row.status||"active"}</td><td>{row._errors.length?<span className="badge import-invalid">{row._errors.join(" · ")}</span>:<span className="badge ok">Valide</span>}</td></tr>)}
      </tbody></table></div>
      {rows.length>100&&<p className="form-hint">Aperçu limité aux 100 premières lignes. {rows.length} lignes seront traitées.</p>}
      <div className="import-submit"><button className="button primary" disabled={busy||invalid>0||!valid.length} onClick={submit}>{busy?"Import en cours…":"Importer "+valid.length+" membre(s)"}</button>{invalid>0&&<small>Corrigez les lignes invalides avant l’import.</small>}</div>
    </div>}

    {result&&<div className="panel import-result">
      <span className="eyebrow">Résultat</span><h2>Import terminé</h2>
      <div className="import-result-stats"><span><b>{result.inserted}</b><small>ajouté(s)</small></span><span><b>{result.skipped}</b><small>doublon(s) ignoré(s)</small></span><span><b>{result.invalid}</b><small>invalide(s)</small></span></div>
      {result.details?.length?<details><summary>Voir les détails</summary><ul>{result.details.map((detail,index)=><li key={index}>{detail}</li>)}</ul></details>:null}
      <a className="button secondary" href="/members">Retour au registre</a>
    </div>}
  </div>;
}
