"use client";
import React from "react";

type Props = {
  activeTab: "overview" | "users" | "analytics";
  setActiveTab: (t: "overview" | "users" | "analytics") => void;
};

export default function AdminTabs({ activeTab, setActiveTab }: Props) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "analytics", label: "Analytics" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveTab(tab.key)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "bg-zinc-100 text-zinc-950"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
