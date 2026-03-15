"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

function RedirectLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = uuidv4();
    const query = searchParams?.toString();
    const suffix = query ? `?${query}` : "";
    router.replace(`/contests/create/${id}${suffix}`);
  }, [router, searchParams]);

  return null;
}

export default function CreateContestRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectLogic />
    </Suspense>
  );
}