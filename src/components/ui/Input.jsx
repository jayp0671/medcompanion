export default function Input({ className="", ...props }) {
  return <input className={`input focus-ring ${className}`} {...props} />
}
