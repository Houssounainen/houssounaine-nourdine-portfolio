import { UiIcon, routeIcon, type IconName } from "@/components/ui-icon";
import { routeColor } from "@/lib/navigation";

/** Grande tuile d’icône colorée de la rubrique, placée avant le titre d’une page de gestion. */
export function PageIcon({ href, icon }: { href: string; icon?: IconName }) {
  return <span className="icon-tile lg solid mg-page-icon" style={{ "--tile": routeColor(href) } as React.CSSProperties} aria-hidden="true"><UiIcon name={icon || routeIcon(href)}/></span>;
}
