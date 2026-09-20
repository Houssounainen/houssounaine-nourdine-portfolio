import fs from "node:fs";
import path from "node:path";

const dir=path.join(process.cwd(),"supabase","migrations");
const files=fs.readdirSync(dir).filter((name)=>name.endsWith(".sql")).sort();
const errors=[];

for(const file of files){
  const full=path.join(dir,file);
  const sql=fs.readFileSync(full,"utf8");
  const dollars=(sql.match(/\$\$/g)||[]).length;
  const lines=sql.split(/\r?\n/);

  if(dollars%2!==0) errors.push(file+": nombre impair de délimiteurs $$");
  if(!sql.trim().startsWith("begin;")) errors.push(file+": transaction BEGIN manquante");
  if(!sql.trim().endsWith("commit;")) errors.push(file+": transaction COMMIT manquante");

  lines.forEach((line,index)=>{
    const t=line.trim();
    if(t==="as $"||t==="end $;"||t==="$;"||t==="do $"||t.endsWith(" as $")){
      errors.push(file+":"+(index+1)+": délimiteur PostgreSQL incomplet");
    }
  });
}

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("SQL migration checks passed for "+files.length+" migration(s).");
