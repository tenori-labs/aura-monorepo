"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md p-2",
          "text-zinc-600 dark:text-zinc-400",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "transition-colors"
        )}
        aria-label="Toggle theme"
      >
        <Monitor className="h-5 w-5" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="h-5 w-5" />
    } else if (theme === "dark") {
      return <Moon className="h-5 w-5" />
    } else {
      return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2",
        "text-zinc-600 dark:text-zinc-400",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        "transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
        "dark:focus:ring-zinc-500"
      )}
      aria-label={`Toggle theme (current: ${theme})`}
      title={`Current theme: ${theme}. Click to cycle themes.`}
    >
      {getIcon()}
    </button>
  )
}

