import React from "react"

const BatteryProgress = ({ percentage }) => {
  const fillPercentage = Math.min(100, Math.max(0, percentage))
  const batteryColor = percentage <= 20
    ? "bg-destructive"
    : percentage <= 50
      ? "bg-chart-4"
      : "bg-primary"

  return (
    <div className="flex items-center gap-0.5">
      <div className="h-6 w-20 rounded-md border-2 border-border bg-background p-0.5">
        <div
          className={`h-full rounded-sm transition-[width] duration-300 ${batteryColor}`}
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <div className="h-3 w-1 rounded-r-sm bg-border" />
      <span className="ml-2 font-bold text-foreground">{percentage}%</span>
    </div>
  )
}

export default BatteryProgress
