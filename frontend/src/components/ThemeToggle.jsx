import React, { useEffect, useState } from "react"

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  )

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="theme-toggle"
      title={`Passa a tema ${theme === "dark" ? "chiaro" : "scuro"}`}
    >
      {theme === "dark" ? "🌞 Tema chiaro" : "🌙 Tema scuro"}
    </button>
  )
}