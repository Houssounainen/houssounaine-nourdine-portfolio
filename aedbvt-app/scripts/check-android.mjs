import fs from "node:fs";

const errors=[];
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const config=JSON.parse(fs.readFileSync("android/config.json","utf8"));
const manifest=fs.readFileSync("app/manifest.ts","utf8");
const env=fs.readFileSync(".env.example","utf8");
const ignore=fs.readFileSync(".gitignore","utf8");

if(pkg.devDependencies?.["@bubblewrap/cli"]!=="1.25.0"){
  errors.push("@bubblewrap/cli doit être épinglé en 1.25.0.");
}

for(const script of ["android:validate","android:init","android:doctor","android:build","android:build:unsigned"]){
  if(!pkg.scripts?.[script]) errors.push("Script npm manquant : "+script);
}

if(!/^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/.test(config.packageId)){
  errors.push("Android packageId invalide : "+config.packageId);
}

if(!Number.isInteger(config.appVersionCode)||config.appVersionCode<1){
  errors.push("appVersionCode Android invalide.");
}

if(!manifest.includes('id:"/"')){
  errors.push("Le manifest PWA doit avoir un id stable.");
}

if(!fs.existsSync("app/.well-known/assetlinks.json/route.ts")){
  errors.push("Endpoint Digital Asset Links manquant.");
}

for(const key of ["AEDBVT_ANDROID_PACKAGE_ID","AEDBVT_APP_ORIGIN","ANDROID_SHA256_FINGERPRINTS"]){
  if(!env.includes(key+"=")) errors.push("Variable Android absente de .env.example : "+key);
}

for(const pattern of ["*.jks","*.keystore","*.apk","*.aab"]){
  if(!ignore.split("\n").includes(pattern)) errors.push("Protection Git manquante : "+pattern);
}

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Android TWA configuration checks passed.");
