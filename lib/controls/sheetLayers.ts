// Shared dismissal/history ownership for a parent sheet and its portaled children.
export type SheetHistory = {
  push: (id: number) => void;
  back: (steps: number) => void;
  active: (open: boolean) => void;
};

export function createSheetLayers(history: SheetHistory) {
  let nextId = Date.now();
  let pendingTravel = false;
  let queuedSteps = 0;
  const layers: Array<{ id: number; dismiss: () => void; pushed: boolean }> = [];
  const flush = () => {
    for (const layer of layers) if (!layer.pushed) {
      history.push(layer.id);
      layer.pushed = true;
    }
  };
  const travel = (steps: number) => {
    if (!steps) return;
    if (pendingTravel) { queuedSteps += steps; return; }
    pendingTravel = true;
    history.back(steps);
  };
  return {
    open(dismiss: () => void) {
      const layer = { id: ++nextId, dismiss, pushed: false };
      layers.push(layer);
      history.active(true);
      if (!pendingTravel) flush();
      return () => {
        const index = layers.indexOf(layer);
        if (index < 0) return;
        const removed = layers.splice(index);
        // A programmatic parent close also dismisses its still-mounted children.
        for (const child of removed.slice(1).reverse()) child.dismiss();
        history.active(layers.length > 0);
        travel(removed.filter((entry) => entry.pushed).length);
      };
    },
    escape() {
      const top = layers.at(-1);
      if (!top) return false;
      top.dismiss();
      return true;
    },
    pop(id?: number) {
      if (pendingTravel) {
        pendingTravel = false;
        const steps = queuedSteps;
        queuedSteps = 0;
        if (steps) travel(steps);
        else flush();
        return;
      }
      const index = layers.findIndex((layer) => layer.id === id);
      const removed = layers.splice(index < 0 ? 0 : index + 1);
      for (const layer of removed.reverse()) layer.dismiss();
      history.active(layers.length > 0);
    },
  };
}
