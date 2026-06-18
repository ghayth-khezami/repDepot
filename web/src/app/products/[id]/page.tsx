import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProduct } from "@/lib/server-api";
import { buildProductMetadata, productJsonLd } from "@/lib/seo";
import { ProductDetailsClient } from "./ProductDetailsClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) {
    return { title: "Produit introuvable — Bébé Dépôt" };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();

  const jsonLd = productJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailsClient productId={id} initialProduct={product} />
    </>
  );
}
