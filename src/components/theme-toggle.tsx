"use client";

import * as React from 'react';
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder or null during server-side rendering and initial client-side mount
    // to avoid hydration mismatch if theme is resolved from localStorage.
    // A simple button placeholder that matches the final size can be good.
    return <div style={{ width: '36px', height: '36px' }} />; 
  }

  const isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="theme-toggle-switch"
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
        className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-gray-300 dark:data-[state=checked]:bg-accent dark:data-[state=unchecked]:bg-gray-600"
      />
      <Label htmlFor="theme-toggle-switch" className="cursor-pointer">
        {isDarkMode ? (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        )}
      </Label>
    </div>
  );
}
