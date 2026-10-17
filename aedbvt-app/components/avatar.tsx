import Link from "next/link";

const PALETTE = ["#2453d6", "#12b76a", "#f79009", "#ee46bc", "#7a5af8", "#0ba5ec", "#f04438", "#15b79e"];

function hue(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function initialsOf(name?: string | null) {
  return (name || "?").split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Avatar unique de l’application : photo de profil si elle existe, sinon initiales sur une
 * couleur stable dérivée du nom. `href` rend l’avatar cliquable vers le profil.
 */
export function Avatar({ name, url, size = 36, href, ring = false, className = "" }: { name?: string | null; url?: string | null; size?: number; href?: string; ring?: boolean; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)), "--avatar-bg": hue(name || "?") } as React.CSSProperties;
  const content = url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" loading="lazy" width={size} height={size}/>
    : <span aria-hidden="true">{initialsOf(name)}</span>;
  const classes = `ui-avatar${ring ? " has-ring" : ""}${url ? " has-photo" : ""} ${className}`.trim();
  if (href) return <Link href={href} className={classes} style={style} aria-label={name ? `Profil de ${name}` : "Profil"}>{content}</Link>;
  return <span className={classes} style={style} title={name || undefined}>{content}</span>;
}

/** Pile d’avatars (« 12 membres participent »). */
export function AvatarStack({ people, max = 5, size = 28 }: { people: { name?: string | null; url?: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  return <span className="avatar-stack">
    {shown.map((person, index) => <Avatar key={index} name={person.name} url={person.url} size={size}/>)}
    {people.length > max && <span className="avatar-stack-more" style={{ width: size, height: size }}>+{people.length - max}</span>}
  </span>;
}
