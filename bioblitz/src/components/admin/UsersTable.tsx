"use client";
import React from "react";
import { Input } from "@/components/ui/input";

type AdminUser = any;

type Props = {
  showDb: boolean;
  fetchingUsers: boolean;
  handleLoadDb: () => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  sortedUsers: AdminUser[];
  editingUser: AdminUser | null;
  setEditingUser: (u: AdminUser | null) => void;
  setEditingOriginal: (u: AdminUser | null) => void;
  handleUpdateUser: (u: AdminUser) => void;
  handleSetUserRole: (uid: string, role: string) => void;
  handleDeleteUser: (uid: string) => void;
};

export default function UsersTable({
  showDb,
  fetchingUsers,
  handleLoadDb,
  searchQuery,
  setSearchQuery,
  sortedUsers,
  editingUser,
  setEditingUser,
  setEditingOriginal,
  handleUpdateUser,
  handleSetUserRole,
  handleDeleteUser,
}: Props) {
  if (!showDb) {
    return (
      <div className="py-20 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50">
        <p className="text-neutral-400 mb-6 text-center max-w-md">
          The user database is not loaded by default to save on read operations.
        </p>
        <button
          onClick={handleLoadDb}
          disabled={fetchingUsers}
          className="px-6 py-3 bg-neutral-600 hover:bg-neutral-500 text-white rounded-xl font-semibold transition-all"
        >
          {fetchingUsers ? "Fetching Database..." : "Access User Database"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Input
          placeholder="Search users by name, username, email, or UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 max-w-md"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-neutral-950 border border-neutral-800 rounded-xl text-sm">
          <thead>
            <tr className="text-left text-neutral-300">
              <th className="py-2 px-4 border-b border-neutral-800">Display Name</th>
              <th className="py-2 px-4 border-b border-neutral-800">Username</th>
              <th className="py-2 px-4 border-b border-neutral-800">Email</th>
              <th className="py-2 px-4 border-b border-neutral-800">Role</th>
              <th className="py-2 px-4 border-b border-neutral-800">UID</th>
              <th className="py-2 px-4 border-b border-neutral-800 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.uid} className="hover:bg-neutral-900/60">
                <td
                  className="py-2 px-4 border-b border-neutral-800 text-neutral-100 cursor-pointer"
                  onClick={() => {
                    setEditingUser({ ...u });
                    setEditingOriginal({ ...u });
                  }}
                >
                  {editingUser?.uid === u.uid ? (
                    <input
                      value={editingUser.displayName}
                      onChange={(e) =>
                        setEditingUser((prev: any) => {
                          if (!prev) return prev;
                          return { ...prev, displayName: e.target.value };
                        })
                      }
                      onBlur={() => {
                        if (!editingUser) return;
                        handleUpdateUser({ ...editingUser });
                        setEditingUser(null);
                        setEditingOriginal(null);
                      }}
                      className="w-full bg-transparent border-b border-neutral-700 text-neutral-100 px-0.5 py-1 focus:outline-none focus:border-neutral-500"
                    />
                  ) : (
                    u.displayName || "Unnamed"
                  )}
                </td>
                <td
                  className="py-2 px-4 border-b border-neutral-800 text-neutral-300 cursor-pointer"
                  onClick={() => {
                    setEditingUser({ ...u });
                    setEditingOriginal({ ...u });
                  }}
                >
                  {editingUser?.uid === u.uid ? (
                    <input
                      value={editingUser.username}
                      onChange={(e) =>
                        setEditingUser((prev: any) => {
                          if (!prev) return prev;
                          return { ...prev, username: e.target.value };
                        })
                      }
                      onBlur={() => {
                        if (!editingUser) return;
                        handleUpdateUser({ ...editingUser });
                        setEditingUser(null);
                        setEditingOriginal(null);
                      }}
                      className="w-full bg-transparent border-b border-neutral-700 text-neutral-100 px-0.5 py-1 focus:outline-none focus:border-neutral-500"
                    />
                  ) : (
                    `@${u.username || "no-username"}`
                  )}
                </td>
                <td className="py-2 px-4 border-b border-neutral-800 text-neutral-300">{u.email || "-"}</td>
                <td className="py-2 px-4 border-b border-neutral-800 text-neutral-300">
                  <select
                    value={Array.isArray(u.roles) ? (u.roles.includes("admin") ? "admin" : u.roles.includes("staff") ? "staff" : "user") : "user"}
                    onChange={(e) => handleSetUserRole(u.uid, e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-2 px-4 border-b border-neutral-800 text-neutral-400 font-mono text-xs break-all">{u.uid}</td>
                <td className="py-2 px-4 border-b border-neutral-800">
                  <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                    <button onClick={() => handleDeleteUser(u.uid)} className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
