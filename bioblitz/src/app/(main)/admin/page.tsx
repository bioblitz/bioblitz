"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminAnalyticsCard from "@/components/admin/AdminAnalyticsCard";
import UserEditor from "@/components/admin/UserEditor";
import UsersTable from "@/components/admin/UsersTable";

type AdminUser = {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string | null;
};

type FullUser = {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  roles: string[];
  bElo: number;
  bio: string;
  location: string;
  grade: string;
  school: string;
  contestsPlayed: number;
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
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [potdAttempts, setPotdAttempts] = useState(0);
  const [potdCorrect, setPotdCorrect] = useState(0);
  const [potdPublished, setPotdPublished] = useState(0);
  const [analytics, setAnalytics] = useState<{
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
    week1Retention: number;
    month1Retention: number;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<AdminUser | null>(
    null,
  );

  // Find & edit user by username
  const [findUsername, setFindUsername] = useState("");
  const [findingUser, setFindingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<FullUser | null>(null);
  const [editFields, setEditFields] = useState<Partial<FullUser>>({});
  const [editUserStatus, setEditUserStatus] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  const [sortColumn, setSortColumn] = useState<SortColumn>("role");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [status, setStatus] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDb, setShowDb] = useState(false);

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
            fetchStats(nextUser);
          }
          setLoading(false);
        });
      } else {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchStats = async (currentUser: any) => {
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/admin/users?statsOnly=true", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats.");
      const data = await response.json();
      setSubmissionsCount(data.submissionsCount || 0);
      setTotalUsers(data.totalUsers || 0);
      setPotdAttempts(data.potdAttempts || 0);
      setPotdCorrect(data.potdCorrect || 0);
      setPotdPublished(data.potdPublished || 0);
      if (data.analytics) setAnalytics(data.analytics);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleRefreshStats = async () => {
    if (!user) return;
    try {
      setStatus("Refreshing stats...");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/cache-invalidate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to invalidate cache.");
      // Fetch fresh stats after invalidation
      await fetchStats(user);
      setStatus("Stats refreshed successfully!");
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error?.message || "Failed to refresh stats.");
      console.error(error);
    }
  };

  const fetchUsers = async (currentUser: any) => {
    try {
      setFetchingUsers(true);
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
      setSubmissionsCount(data.submissionsCount || 0);
      setTotalUsers(data.totalUsers || 0);
      setPotdAttempts(data.potdAttempts || 0);
      setPotdCorrect(data.potdCorrect || 0);
      setPotdPublished(data.potdPublished || 0);
      setShowDb(true);
    } catch (error: any) {
      setStatus(error?.message || "Failed to fetch users.");
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleLoadDb = () => {
    if (!user) return;
    fetchUsers(user);
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

  const handleFindUser = async () => {
    if (!user || !findUsername.trim()) return;
    setFindingUser(true);
    setFoundUser(null);
    setEditFields({});
    setEditUserStatus(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(
        `/api/admin/users?username=${encodeURIComponent(findUsername.trim().toLowerCase())}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "User not found.");
      setFoundUser(data.user);
      setEditFields(data.user);
    } catch (err: any) {
      setEditUserStatus(err?.message || "User not found.");
    } finally {
      setFindingUser(false);
    }
  };

  const handleSaveUserFields = async () => {
    if (!user || !foundUser) return;
    setSavingUser(true);
    setEditUserStatus(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: foundUser.uid, ...editFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save.");
      setEditUserStatus("Saved.");
      setFoundUser({ ...foundUser, ...editFields } as FullUser);
    } catch (err: any) {
      setEditUserStatus(err?.message || "Failed to save.");
    } finally {
      setSavingUser(false);
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

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return users;

    return users.filter((u) => {
      const nameMatch = (u.displayName || "").toLowerCase().includes(query);
      const usernameMatch = (u.username || "").toLowerCase().includes(query);
      const emailMatch = (u.email || "").toLowerCase().includes(query);
      const uidMatch = u.uid.toLowerCase().includes(query);
      return nameMatch || usernameMatch || emailMatch || uidMatch;
    });
  }, [users, searchQuery]);

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
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
  }, [filteredUsers, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-neutral-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4 text-neutral-100">
            Access Denied
          </h1>
          <p className="text-neutral-300">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100">Admin Panel</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400 mt-1">
              <span>
                Users:{" "}
                <span className="text-neutral-100 font-semibold">
                  {totalUsers}
                </span>
              </span>
              <span className="text-neutral-700">|</span>
              <span>
                Game submissions:{" "}
                <span className="text-neutral-100 font-semibold">
                  {submissionsCount}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshStats}
              className="text-sm text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-colors"
              title="Invalidate cached stats and fetch fresh data"
            >
              Refresh Stats
            </button>
            <Link
              href="/admin/analytics"
              className="text-sm text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-colors"
            >
              Open Analytics
            </Link>

            <Link
              href="/admin/message-reports"
              className="text-sm text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-colors"
            >
              <span>Message Reports</span>
            </Link>
            {/** 
            <button
              onClick={handleReindexSearch}
              className="text-sm text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
              disabled={reindexing}
            >
              {reindexing ? "Reindexing..." : "Reindex Search"}
            </button>

            
            **/}

            <Link
              href="/home"
              className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Return to home
            </Link>
          </div>
        </div>

        {status && <p className="text-sm text-neutral-400 mb-4">{status}</p>}

        <UserEditor
          status={status}
          findUsername={findUsername}
          setFindUsername={setFindUsername}
          findingUser={findingUser}
          handleFindUser={handleFindUser}
          editUserStatus={editUserStatus}
          foundUser={foundUser}
          editFields={editFields}
          setEditFields={setEditFields}
          savingUser={savingUser}
          handleSaveUserFields={handleSaveUserFields}
        />

        {!showDb ? (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50">
            <p className="text-neutral-400 mb-6 text-center max-w-md">
              The user database is not loaded by default to save on read
              operations.
            </p>
            <button
              onClick={handleLoadDb}
              disabled={fetchingUsers}
              className="px-6 py-3 bg-neutral-600 hover:bg-neutral-500 text-white rounded-xl font-semibold transition-all"
            >
              {fetchingUsers ? "Fetching Database..." : "Access User Database"}
            </button>
          </div>
        ) : (
          <>
            <UsersTable
              showDb={showDb}
              fetchingUsers={fetchingUsers}
              handleLoadDb={handleLoadDb}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortedUsers={sortedUsers}
              editingUser={editingUser}
              setEditingUser={setEditingUser}
              setEditingOriginal={setEditingOriginal}
              handleUpdateUser={handleUpdateUser}
              handleSetUserRole={handleSetUserRole}
              handleDeleteUser={handleDeleteUser}
            />
          </>
        )}
      </div>
    </div>
  );
}
