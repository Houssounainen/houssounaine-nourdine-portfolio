"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";

export type MemberDirectoryRow={
  id:string;
  member_number:string|null;
  full_name:string;
  village:string|null;
  program:string|null;
  study_level:string|null;
  phone:string|null;
  email?:string|null;
  profile_id?:string|null;
  invitation_sent_at?:string|null;
  account_activated_at?:string|null;
  status:string;
};

export function MemberDirectory({
  members,
  avatars={},
  inviteAction,
}:{
  members:MemberDirectoryRow[];
  /** Photo de profil par profile_id (facultatif). */
  avatars?:Record<string,string|null>;
  inviteAction:(formData:FormData)=>Promise<void>;
}){
  const [query,setQuery]=useState("");
  const [village,setVillage]=useState("all");
  const [status,setStatus]=useState("all");

  const villages=useMemo(
    ()=>[...new Set(members.map((member)=>member.village).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b,"fr")),
    [members]
  );

  const statuses=useMemo(
    ()=>[...new Set(members.map((member)=>member.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr")),
    [members]
  );

  const filtered=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase("fr");
    return members.filter((member)=>{
      if(village!=="all"&&member.village!==village) return false;
      if(status!=="all"&&member.status!==status) return false;
      if(!needle) return true;
      const haystack=[
        member.member_number,
        member.full_name,
        member.village,
        member.program,
        member.study_level,
        member.phone,
        member.email,
      ].filter(Boolean).join(" ").toLocaleLowerCase("fr");
      return haystack.includes(needle);
    });
  },[members,query,village,status]);

  return <article className="panel directory-panel">
    <div className="directory-toolbar">
      <label className="directory-search mg-search">
        <UiIcon name="search"/>
        <span className="sr-only">Rechercher un membre</span>
        <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Nom, numéro, filière, téléphone…"/>
      </label>
      <label><span className="sr-only">Filtrer par village</span><select value={village} onChange={(event)=>setVillage(event.target.value)}><option value="all">Tous les villages</option>{villages.map((value)=><option value={value} key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Filtrer par statut</span><select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="all">Tous les statuts</option>{statuses.map((value)=><option value={value} key={value}>{value}</option>)}</select></label>
      <span className="directory-count">{filtered.length} / {members.length}</span>
    </div>

    <div className="table-wrap">
      <table><thead><tr><th>Membre</th><th>N°</th><th>Village</th><th>Études</th><th>Contact</th><th>Compte</th><th>Statut</th><th>Accès</th></tr></thead>
      <tbody>{filtered.map((member)=>{
        const onboarding=member.account_activated_at?"Activé":member.profile_id?"Invité":"À inviter";
        const canInvite=member.status==="active"&&Boolean(member.email)&&!member.account_activated_at;
        return <tr key={member.id}>
          <td><span className="mg-person"><Avatar name={member.full_name} url={member.profile_id?avatars[member.profile_id]:null} size={36}/><span><b>{member.full_name||"Sans nom"}</b>{member.email&&<small className="member-email">{member.email}</small>}</span></span></td>
          <td><span className="mg-mono">{member.member_number||"—"}</span></td>
          <td>{member.village||"—"}</td>
          <td>{[member.program,member.study_level].filter(Boolean).join(" · ")||"—"}</td>
          <td>{member.phone||"—"}</td>
          <td><span className={"badge onboarding-"+(member.account_activated_at?"active":member.profile_id?"invited":"pending")}>{onboarding}</span></td>
          <td><span className={"badge mg-status mg-status-"+member.status+(member.status==="active"?" ok":"")}>{member.status}</span></td>
          <td>
            {canInvite?<form action={inviteAction}>
              <input type="hidden" name="member_id" value={member.id}/>
              <button className="button secondary" type="submit">{member.profile_id?"Renvoyer":"Envoyer"} l’accès</button>
            </form>:member.account_activated_at?<small className="muted">Compte actif</small>:<small className="muted">{member.email?"Active le membre":"Email requis"}</small>}
          </td>
        </tr>;
      })}</tbody></table>
      {!filtered.length&&<div className="directory-empty mg-empty"><span className="icon-tile lg" style={{"--tile":"var(--accent)"} as React.CSSProperties}><UiIcon name="users"/></span><p>Aucun membre ne correspond à ces critères.</p></div>}
    </div>
  </article>;
}
