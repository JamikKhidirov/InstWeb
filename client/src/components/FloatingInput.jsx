import { useId, useState } from "react";

/**
 * Поле ввода с «плавающей» подписью — как в форме входа Instagram.
 */
export default function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  name,
  rightSlot,
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const active = focused || String(value).length > 0;

  return (
    <div className={`field ${active ? "field--active" : ""} ${rightSlot ? "field--has-action" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {rightSlot}
    </div>
  );
}
