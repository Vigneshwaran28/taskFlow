"use client";
import { useParams } from "next/navigation";
import { Redirect } from "@/app-shell/guards";
import { ProductDetail } from "../components/ProductDetail";

export function ProductPage() {
  const id = Number(useParams<{ productId: string }>().productId);
  if (!Number.isInteger(id) || id <= 0) return <Redirect to="/inventory" />;
  return <ProductDetail key={id} productId={id} />;
}
