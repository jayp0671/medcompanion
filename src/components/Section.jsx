export default function Section({ title, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
