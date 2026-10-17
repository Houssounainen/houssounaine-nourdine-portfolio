"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { UiIcon } from "@/components/ui-icon";
import "@/app/manage.css";

export type FilterItem = {
  id: string;
  /** Texte libre utilisé par la recherche. */
  text: string;
  /** Valeurs des filtres rapides (clé de filtre → valeur). */
  facets?: Record<string, string>;
  /** Ligne déjà rendue côté serveur (a.list-row, tr…). */
  node: ReactNode;
};

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Puces (par défaut jusqu’à 5 options) ou liste déroulante. */
  mode?: "chips" | "select";
};

/**
 * Liste filtrable côté client : recherche + filtres rapides (puces ou liste déroulante).
 * Les lignes sont rendues par la page serveur et passées telles quelles.
 */
export function FilterList({ items, filters = [], placeholder = "Rechercher…", table, empty, actions, noResult = "Aucun résultat pour ces filtres." }: {
  items: FilterItem[];
  filters?: FilterDef[];
  placeholder?: string;
  /** En-tête de tableau : les lignes sont alors des <tr>. */
  table?: ReactNode;
  /** Contenu affiché quand la liste est vide (avant filtre). */
  empty?: ReactNode;
  /** Actions affichées à droite de la barre d’outils. */
  actions?: ReactNode;
  noResult?: string;
}) {
  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return items.filter(item => {
      for (const [key, value] of Object.entries(values)) {
        if (value && value !== "all" && item.facets?.[key] !== value) return false;
      }
      return !q || item.text.toLocaleLowerCase("fr").includes(q);
    });
  }, [items, query, values]);

  if (!items.length) return <>{empty ?? <div className="panel empty-state">Aucun élément.</div>}</>;

  const filtered = visible.length !== items.length;

  return <div className="filter-list">
    <div className="toolbar manage-toolbar">
      <label className="manage-search grow">
        <UiIcon name="search"/>
        <span className="sr-only">Rechercher</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={placeholder}/>
      </label>
      {filters.map(filter => (filter.mode ?? (filter.options.length <= 5 ? "chips" : "select")) === "chips"
        ? <div className="chip-row" role="group" aria-label={filter.label} key={filter.key}>
          <button type="button" className="chip" aria-pressed={!values[filter.key] || values[filter.key] === "all"} onClick={() => setValues(v => ({ ...v, [filter.key]: "all" }))}>Tous</button>
          {filter.options.map(option => <button type="button" key={option.value} className="chip" aria-pressed={values[filter.key] === option.value}
            onClick={() => setValues(v => ({ ...v, [filter.key]: v[filter.key] === option.value ? "all" : option.value }))}>{option.label}</button>)}
        </div>
        : <label key={filter.key}><span className="sr-only">{filter.label}</span>
          <select value={values[filter.key] || "all"} onChange={event => setValues(v => ({ ...v, [filter.key]: event.target.value }))}>
            <option value="all">{filter.label} : tous</option>
            {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>)}
      <span className="manage-count">{filtered ? `${visible.length} / ${items.length}` : items.length}</span>
      {actions}
    </div>
    {table
      ? <div className="panel table-wrap"><table>
        <thead>{table}</thead>
        <tbody>{visible.map(item => <Fragment key={item.id}>{item.node}</Fragment>)}</tbody>
      </table>{!visible.length && <div className="empty-state">{noResult}</div>}</div>
      : <div className="panel list-card">
        {visible.map(item => <Fragment key={item.id}>{item.node}</Fragment>)}
        {!visible.length && <div className="empty-state">{noResult}</div>}
      </div>}
  </div>;
}

