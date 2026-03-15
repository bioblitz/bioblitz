"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminUser = {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string | null;
};

type SortColumn = "role" | "username" | "displayName";

const rolePriority: Record<string, number> = {
  admin: 0,
  staff: 1,
  "": 2,
  user: 2,
};

function primaryRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return "user";
}

function normalizeRole(role: string): string {
  const value = role.trim().toLowerCase();
  if (value === "admin" || value === "staff") return value;
  return "user";
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<AdminUser | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("role");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [status, setStatus] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        nextUser.getIdTokenResult(true).then((idTokenResult) => {
          const claims: any = idTokenResult.claims || {};
          const roles = Array.isArray(claims.roles)
            ? claims.roles.map((r: unknown) => String(r).toLowerCase())
            : [];
          const admin =
            claims.admin === true ||
            claims.role === "admin" ||
            roles.includes("admin");

          setIsAdmin(admin);
          if (admin) {
            fetchUsers(nextUser);
          }
          setLoading(false);
        });
      } else {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUsers = async (currentUser: any) => {
    try {
      setStatus(null);
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users.");
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setSubmissionsCount(
        Number.isFinite(Number(data.submissionsCount))
          ? Number(data.submissionsCount)
          : 0
      );
    } catch (error: any) {
      setStatus(error?.message || "Failed to fetch users.");
    }
  };

  const handleSetUserRole = async (uid: string, newRole: string) => {
    if (!user) return;
    try {
      setStatus(null);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, role: normalizeRole(newRole) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update role.");
      }
      setStatus(data?.message || "Role updated.");
      fetchUsers(user);
    } catch (error: any) {
      setStatus(error?.message || "Failed to update role.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!user) return;
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      setStatus(null);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete user.");
      }
      setStatus(data?.message || "User deleted.");
      fetchUsers(user);
    } catch (error: any) {
      setStatus(error?.message || "Failed to delete user.");
    }
  };

  const handleUpdateUser = async (nextUser: AdminUser) => {
    if (!user) return;
    if (!editingOriginal) return;

    const trimmedDisplayName = nextUser.displayName.trim();
    const trimmedUsername = nextUser.username.trim();
    if (
      trimmedDisplayName === editingOriginal.displayName &&
      trimmedUsername === editingOriginal.username
    ) {
      return;
    }

    try {
      setStatus(null);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: nextUser.uid,
          displayName: trimmedDisplayName,
          username: trimmedUsername,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update user.");
      }
      setStatus(data?.message || "User updated.");
      setEditingUser(null);
      setEditingOriginal(null);
      fetchUsers(user);
    } catch (error: any) {
      setStatus(error?.message || "Failed to update user.");
    }
  };

  const handleReindexSearch = async () => {
    if (!user || reindexing) return;
    try {
      setStatus(null);
      setReindexing(true);
      const idToken = await user.getIdToken();
      const response = await fetch("/api/search/reindex", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to reindex search.");
      }
      setStatus(data?.message || "Search reindexed.");
    } catch (error: any) {
      setStatus(error?.message || "Failed to reindex search.");
    } finally {
      setReindexing(false);
    }
  };


  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (!sortColumn) return list;

    return list.sort((a, b) => {
      if (sortColumn === "role") {
        const aRole = primaryRole(a.roles || []);
        const bRole = primaryRole(b.roles || []);
        const aPriority = rolePriority[aRole] ?? 3;
        const bPriority = rolePriority[bRole] ?? 3;

        if (aPriority !== bPriority) {
          return sortDirection === "asc"
            ? aPriority - bPriority
            : bPriority - aPriority;
        }

        const aName = String(a.displayName || "").toLowerCase();
        const bName = String(b.displayName || "").toLowerCase();
        if (aName < bName) return sortDirection === "asc" ? -1 : 1;
        if (aName > bName) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aValue = String(a[sortColumn] || "").toLowerCase();
      const bValue = String(b[sortColumn] || "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
        <div className="text-center text-zinc-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4 text-zinc-100">Access Denied</h1>
          <p className="text-zinc-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Admin Panel</h1>
            <div className="text-sm text-zinc-400 mt-1">
              Total users: <span className="text-zinc-100 font-semibold">{users.length}</span>
              <span className="mx-2 text-zinc-600">|</span>
              Contests taken: <span className="text-zinc-100 font-semibold">{submissionsCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReindexSearch}
              className="text-sm text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
              disabled={reindexing}
            >
              {reindexing ? "Reindexing..." : "Reindex Search"}
            </button>
            <Link href="/home" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Return to home
            </Link>
          </div>
        </div>

        {status && <p className="text-sm text-zinc-400 mb-4">{status}</p>}

        <div className="overflow-x-auto">
          <table className="w-full bg-zinc-950 border border-zinc-800 rounded-xl text-sm">
            <thead>
              <tr className="text-left text-zinc-300">
                <th className="py-2 px-4 border-b border-zinc-800">Display Name</th>
                <th
                  className="py-2 px-4 border-b border-zinc-800 cursor-pointer"
                  onClick={() => handleSort("username")}
                >
                  Username {sortColumn === "username" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-2 px-4 border-b border-zinc-800">Email</th>
                <th
                  className="py-2 px-4 border-b border-zinc-800 cursor-pointer"
                  onClick={() => handleSort("role")}
                >
                  Role {sortColumn === "role" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="py-2 px-4 border-b border-zinc-800">UID</th>
                <th className="py-2 px-4 border-b border-zinc-800 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-zinc-900/60">
                  <td
                    className="py-2 px-4 border-b border-zinc-800 text-zinc-100 cursor-pointer"
                    onClick={() => {
                      setEditingUser({ ...u });
                      setEditingOriginal({ ...u });
                    }}
                  >
                    {editingUser?.uid === u.uid ? (
                      <input
                        value={editingUser.displayName}
                        onChange={(e) =>
                          setEditingUser((prev) => {
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
                        className="w-full bg-transparent border-b border-zinc-700 text-zinc-100 px-0.5 py-1 focus:outline-none focus:border-violet-500"
                      />
                    ) : (
                      u.displayName || "Unnamed"
                    )}
                  </td>
                  <td
                    className="py-2 px-4 border-b border-zinc-800 text-zinc-300 cursor-pointer"
                    onClick={() => {
                      setEditingUser({ ...u });
                      setEditingOriginal({ ...u });
                    }}
                  >
                    {editingUser?.uid === u.uid ? (
                      <input
                        value={editingUser.username}
                        onChange={(e) =>
                          setEditingUser((prev) => {
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
                        className="w-full bg-transparent border-b border-zinc-700 text-zinc-100 px-0.5 py-1 focus:outline-none focus:border-violet-500"
                      />
                    ) : (
                      `@${u.username || "no-username"}`
                    )}
                  </td>
                  <td className="py-2 px-4 border-b border-zinc-800 text-zinc-300">
                    {u.email || "-"}
                  </td>
                  <td className="py-2 px-4 border-b border-zinc-800 text-zinc-300">
                    <select
                      value={primaryRole(u.roles || [])}
                      onChange={(e) => handleSetUserRole(u.uid, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-md px-2 py-1"
                    >
                      <option value="user">User</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2 px-4 border-b border-zinc-800 text-zinc-400 font-mono text-xs break-all">
                    {u.uid}
                  </td>
                  <td className="py-2 px-4 border-b border-zinc-800">
                    <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteUser(u.uid)}
                        className="px-3 py-1 rounded-md bg-red-700 hover:bg-red-600 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
