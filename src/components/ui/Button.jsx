export default function Button({ variant = "ghost", className = "", ...props }) {
  const map = {
    primary: "btn btn-primary focus-ring",
    ghost: "btn btn-ghost focus-ring",
    danger: "btn btn-danger focus-ring",
  }
  return <button className={`${map[variant] || map.ghost} ${className}`} {...props} />
}
