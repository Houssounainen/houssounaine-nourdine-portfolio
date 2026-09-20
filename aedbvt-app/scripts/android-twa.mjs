import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root=process.cwd();
const twaDir=path.join(root,"android-twa");
const configPath=path.join(root,"android","config.json");
const config=JSON.parse(fs.readFileSync(configPath,"utf8"));

function getOrigin(){
  const raw=(process.env.AEDBVT_APP_ORIGIN||process.env.NEXT_PUBLIC_APP_URL||"").trim();
  if(!raw){
    throw new Error("AEDBVT_APP_ORIGIN est requis pour les commandes Android.");
  }
  const url=new URL(raw);
  if(url.protocol!=="https:"){
    throw new Error("AEDBVT_APP_ORIGIN doit utiliser HTTPS pour une Trusted Web Activity.");
  }
  url.pathname="/";
  url.search="";
  url.hash="";
  return url;
}

function bubblewrap(args,cwd=root){
  const npx=process.platform==="win32"?"npx.cmd":"npx";
  const result=spawnSync(npx,["--no-install","bubblewrap",...args],{
    cwd,
    stdio:"inherit",
    env:process.env,
  });
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status??1);
}

function twaManifestPath(){
  return path.join(twaDir,"twa-manifest.json");
}

function applyProjectConfig(){
  const manifestPath=twaManifestPath();
  if(!fs.existsSync(manifestPath)){
    throw new Error("android-twa/twa-manifest.json est introuvable. Lancez npm run android:init.");
  }

  const origin=getOrigin();
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  const packageId=(process.env.AEDBVT_ANDROID_PACKAGE_ID||config.packageId).trim();

  Object.assign(manifest,{
    packageId,
    name:config.name,
    launcherName:config.launcherName,
    appVersion:config.appVersion,
    appVersionCode:config.appVersionCode,
    host:origin.host,
    startUrl:config.startUrl,
    webManifestUrl:new URL("/manifest.webmanifest",origin).toString(),
    display:config.display,
    orientation:config.orientation,
    themeColor:config.themeColor,
    themeColorDark:config.themeColorDark,
    navigationColor:config.navigationColor,
    navigationColorDark:config.navigationColorDark,
    backgroundColor:config.backgroundColor,
    fallbackType:config.fallbackType,
    enableNotifications:config.enableNotifications,
    enableSiteSettingsShortcut:config.enableSiteSettingsShortcut,
  });

  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n");
  return manifest;
}

const command=process.argv[2];

try{
  if(command==="doctor"){
    bubblewrap(["doctor"]);
  }else if(command==="validate"){
    const origin=getOrigin();
    bubblewrap(["validate","--url="+origin.toString()]);
  }else if(command==="init"){
    const origin=getOrigin();
    if(fs.existsSync(twaManifestPath())){
      throw new Error("Le projet android-twa existe déjà. Supprimez-le uniquement si vous souhaitez le régénérer.");
    }
    bubblewrap([
      "init",
      "--manifest="+new URL("/manifest.webmanifest",origin).toString(),
      "--directory="+twaDir,
    ]);
    applyProjectConfig();
    bubblewrap(["update","--skipVersionUpgrade"],twaDir);
    console.log("Projet Android initialisé dans android-twa/.");
  }else if(command==="build"||command==="build-unsigned"){
    if(!fs.existsSync(twaManifestPath())){
      throw new Error("Initialisez d’abord le projet avec npm run android:init.");
    }
    applyProjectConfig();
    bubblewrap(["update","--skipVersionUpgrade"],twaDir);
    bubblewrap(command==="build-unsigned"?["build","--skipSigning"]:["build"],twaDir);
  }else{
    console.error("Commande inconnue. Utilisez validate, init, doctor, build ou build-unsigned.");
    process.exit(1);
  }
}catch(error){
  console.error(error instanceof Error?error.message:String(error));
  process.exit(1);
}
