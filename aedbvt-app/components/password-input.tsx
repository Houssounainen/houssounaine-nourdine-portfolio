"use client";

import { useState, type InputHTMLAttributes } from "react";
import { UiIcon } from "@/components/ui-icon";

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><input {...props} type={visible ? "text" : "password"}/><button type="button" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-controls={props.id} aria-pressed={visible} onClick={() => setVisible(value => !value)}><UiIcon name={visible ? "eyeOff" : "eye"}/></button></div>;
}
