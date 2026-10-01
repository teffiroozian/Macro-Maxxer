import { Suspense } from "react";
import { redirect } from "next/navigation";
import NativeSearchPage from "@/components/native/NativeSearchPage";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

export default function SearchPage() {
  if (!IS_CAPACITOR_BUILD) {
    redirect("/");
  }

  return (
    <Suspense fallback={null}>
      <NativeSearchPage />
    </Suspense>
  );
}
