export function renderAdministrativeTemplate(
  template:string,
  values:Record<string,string|number|null|undefined>
){
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(_match,key)=>{
    const value=values[key];
    return value===null||value===undefined?"":String(value);
  });
}
