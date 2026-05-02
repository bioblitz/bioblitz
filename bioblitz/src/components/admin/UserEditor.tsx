"use client";
import React from "react";
import { Input } from "@/components/ui/input";

type Props = {
  status: string | null;
  findUsername: string;
  setFindUsername: (v: string) => void;
  findingUser: boolean;
  handleFindUser: () => void;
  editUserStatus: string | null;
  foundUser: any | null;
  editFields: any;
  setEditFields: (v: any) => void;
  savingUser: boolean;
  handleSaveUserFields: () => void;
};

export default function UserEditor({
  status,
  findUsername,
  setFindUsername,
  findingUser,
  handleFindUser,
  editUserStatus,
  foundUser,
  editFields,
  setEditFields,
  savingUser,
  handleSaveUserFields,
}: Props) {
  return (
    <div>
      {status && <p className="text-sm text-zinc-400 mb-4">{status}</p>}

      <div className="mb-8 border border-zinc-800 rounded-2xl bg-zinc-950/50 p-6">
        <h2 className="text-base font-semibold text-zinc-200 mb-4">Edit User Fields</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Username (without @)"
            value={findUsername}
            onChange={(e) => setFindUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFindUser()}
            className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
          />
          <button
            onClick={handleFindUser}
            disabled={findingUser || !findUsername.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {findingUser ? "Finding…" : "Find"}
          </button>
        </div>

        {editUserStatus && <p className="text-sm text-zinc-400 mb-3">{editUserStatus}</p>}

        {foundUser && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 font-mono">{foundUser.uid} · {foundUser.email}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(
                [
                  { key: "displayName", label: "Display Name", type: "text" },
                  { key: "username", label: "Username", type: "text" },
                  { key: "bio", label: "Bio", type: "text" },
                  { key: "location", label: "Location", type: "text" },
                  { key: "grade", label: "Grade", type: "text" },
                  { key: "school", label: "School", type: "text" },
                  { key: "bElo", label: "Rating (bElo)", type: "number" },
                  { key: "contestsPlayed", label: "Contests Played", type: "number" },
                ] as { key: keyof any; label: string; type: string }[]
              ).map(({ key, label, type }) => (
                <div key={String(key)} className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 font-medium">{label}</label>
                  <input
                    type={type}
                    value={String(editFields[key] ?? "")}
                    onChange={(e) => setEditFields((prev: any) => ({ ...prev, [key]: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveUserFields}
              disabled={savingUser}
              className="px-5 py-2 bg-neutral-600 hover:bg-neutral-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {savingUser ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
