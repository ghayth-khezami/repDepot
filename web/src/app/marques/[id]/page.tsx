"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarkProductsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/produits");
  }, [router]);
  return null;
}
