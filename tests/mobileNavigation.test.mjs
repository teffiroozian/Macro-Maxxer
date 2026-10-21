import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import drawerModule from "../components/MobileNavDrawer.tsx";

const ControlsDrawer = drawerModule.default ?? drawerModule;

test("mobile controls drawer retains controls without a restaurant browsing tab or list", () => {
  const markup = renderToStaticMarkup(React.createElement(ControlsDrawer, {
    isOpen: true, onClose() {}, headerTitle: "Chipotle",
    controlsContent: React.createElement("span", null, "Ranking controls"),
    controlsFooter: React.createElement("button", null, "Apply filters"),
  }));
  assert.match(markup, /Ranking controls/);
  assert.match(markup, /Apply filters/);
  assert.doesNotMatch(markup, /Featured Restaurants|All Restaurants|>Restaurants<|href="\/restaurant/);
});

test("closed mobile controls drawer stays inert for its existing transition", () => {
  const markup = renderToStaticMarkup(React.createElement(ControlsDrawer, { isOpen: false, onClose() {} }));
  assert.match(markup, /inert=""/);
  assert.match(markup, /pointer-events-none/);
  assert.match(markup, /transition-transform duration-200/);
});
