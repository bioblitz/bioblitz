"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function DigestPreviewPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/digest/preview", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError(await res.text());
          setLoading(false);
          return;
        }

        setHtml(await res.text());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
        Loading preview...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-red-400">
        {error}
      </div>
    );

  return (
    <iframe
      srcDoc={html || ""}
      className="w-full min-h-screen border-0"
      title="Digest Preview"
    />
  );
}
