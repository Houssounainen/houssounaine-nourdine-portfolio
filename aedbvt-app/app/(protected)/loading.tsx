export default function ProtectedLoading(){
  return <section className="page loading-page st-loading" aria-busy="true" aria-live="polite">
    <div className="loading-header"><span className="loading-line short"/><span className="loading-line title"/></div>
    <div className="loading-stat-grid">{Array.from({length:4}).map((_,index)=><span className="loading-card st-sk-stat" key={index}><i/><b/><em/></span>)}</div>
    <div className="loading-content-grid">
      {Array.from({length:2}).map((_,panel)=><span className="loading-panel st-sk-panel" key={panel}>
        <b className="st-sk-title"/>
        {Array.from({length:4}).map((_,row)=><span className="st-sk-row" key={row}><i/><span><b/><em/></span></span>)}
      </span>)}
    </div>
    <span className="sr-only">Chargement de l’espace AEDBVT…</span>
  </section>;
}
