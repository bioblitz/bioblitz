"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function CreateContestRedirect() {
  const router = useRouter();

  useEffect(() => {
    const id = uuidv4();
    router.replace(`/contests/create/${id}`);
  }, [router]);

  return null;
}