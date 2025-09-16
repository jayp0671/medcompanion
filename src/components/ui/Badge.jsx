export function Badge({ tone = "soft", children }) {
  const cls = tone === "ok" ? "badge badge-ok" :
              tone === "warn" ? "badge badge-warn" :
              tone === "bad" ? "badge badge-bad" : "badge badge-soft"
  return <span className={cls}>{children}</span>
}
