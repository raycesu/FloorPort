export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-10">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-white/5" />
        <div className="h-4 w-40 rounded-lg bg-white/5" />
      </div>
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 rounded-[14px] bg-white/5" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[380px] rounded-2xl bg-white/5" />
        <div className="h-[380px] rounded-2xl bg-white/5" />
      </div>
      {/* Holdings table */}
      <div className="h-72 rounded-2xl bg-white/5" />
    </div>
  )
}
