export default function Section({ title, children }) {
  return (
    <div className="section">
      <h1 className="section-title">{title}</h1>
      <div className="section-actions">{children}</div>
    </div>
  )
}
