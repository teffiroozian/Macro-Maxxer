import { redirect } from "next/navigation";
import NativeSavedPage from "@/components/native/NativeSavedPage";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

export default function SavedPage() {
  if (!IS_CAPACITOR_BUILD) {
    redirect("/");
  }

  return <NativeSavedPage />;
}
