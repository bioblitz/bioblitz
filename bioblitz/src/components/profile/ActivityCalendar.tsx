import { ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityCalendarProps {
  calendarViewDate: Date;
  activeDates: Set<string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isCurrentMonth: boolean;
}

export default function ActivityCalendar({
  calendarViewDate,
  activeDates,
  onPrevMonth,
  onNextMonth,
  isCurrentMonth,
}: ActivityCalendarProps) {
  const viewYear = calendarViewDate.getFullYear();
  const viewMonth = calendarViewDate.getMonth();
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfViewMonth = new Date(viewYear, viewMonth, 1).getDay();
  const viewMonthName = calendarViewDate.toLocaleString("default", {
    month: "long",
  });

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Activity</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <span className="text-sm text-zinc-400 min-w-[100px] text-center">
            {viewMonthName} {viewYear}
          </span>
          <button
            onClick={onNextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-center text-xs text-zinc-600 font-medium">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfViewMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInViewMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const dateStr = date.toDateString();
          const isActive = activeDates.has(dateStr);
          const isFuture = date > new Date();

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all ${
                isActive
                  ? "bg-violet-600 text-white font-bold shadow-lg"
                  : isFuture
                  ? "bg-zinc-900/50 text-zinc-700 cursor-not-allowed"
                  : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
