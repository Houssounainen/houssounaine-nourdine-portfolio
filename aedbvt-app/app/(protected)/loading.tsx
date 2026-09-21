export default function ProtectedLoading(){
  return <section className="page loading-page" aria-busy="true" aria-live="polite">
    <div className="loading-header"><span className="loading-line short"/><span className="loading-line title"/></div>
    <div className="loading-stat-grid">{Array.from({length:4}).map((_,index)=><span className="loading-card" key={index}/>)}</div>
    <div className="loading-content-grid"><span className="loading-panel"/><span className="loading-panel"/></div>
    <span className="sr-only">Chargement de l’espace AEDBVT…</span>
  </section>;
}
