"use client"; 

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function PageReloader() {
  const searchParams = useSearchParams();
  const potato = searchParams.get("potato") === "true";

  useEffect(() => {
    if (potato) {
      window.location.reload();
    }
  }, [potato]);

  return null;
}