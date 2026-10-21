"use client";

import { useEffect, useState } from "react";
import { Capacitor, registerPlugin, type Plugin } from "@capacitor/core";
import { isKeyboardViewportReduced } from "@/lib/native/navigation";

const Keyboard = registerPlugin<Plugin>("Keyboard");

export function useNativeSearchKeyboard(isSearch: boolean) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!isSearch) return;
    let cancelled = false;
    const show = () => { if (!cancelled) setKeyboardOpen(true); };
    const hide = () => { if (!cancelled) setKeyboardOpen(false); };
    const viewport = window.visualViewport;
    let layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
    const updateOrientation = () => { layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight); };
    const updateViewport = () => {
      if (cancelled || !viewport) return;
      const focused = document.activeElement;
      const editing = focused instanceof HTMLElement &&
        (focused.matches("input, textarea") || focused.isContentEditable);
      setKeyboardOpen(editing && isKeyboardViewportReduced(
        Math.max(layoutHeight, window.innerHeight, document.documentElement.clientHeight),
        viewport.height,
      ));
    };
    // Core-only builds have no Keyboard plugin. WKWebView's visual viewport
    // still reports the software keyboard; keep this fallback dependency-free.
    const hasKeyboardPlugin = Capacitor.isPluginAvailable("Keyboard");
    const listeners = hasKeyboardPlugin
      ? [Keyboard.addListener("keyboardWillShow", show), Keyboard.addListener("keyboardWillHide", hide)]
      : [];
    window.addEventListener("orientationchange", updateOrientation);
    window.addEventListener("keyboardWillShow", show);
    window.addEventListener("keyboardWillHide", hide);
    if (!hasKeyboardPlugin) {
      viewport?.addEventListener("resize", updateViewport);
      document.addEventListener("focusin", updateViewport);
      document.addEventListener("focusout", updateViewport);
    }
    const timer = window.setTimeout(updateViewport, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("orientationchange", updateOrientation);
      window.removeEventListener("keyboardWillShow", show);
      window.removeEventListener("keyboardWillHide", hide);
      viewport?.removeEventListener("resize", updateViewport);
      document.removeEventListener("focusin", updateViewport);
      document.removeEventListener("focusout", updateViewport);
      for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => undefined);
    };
  }, [isSearch]);

  return isSearch && keyboardOpen;
}
