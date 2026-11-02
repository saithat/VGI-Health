import { it, expect } from "vitest";
import { commandEvent } from "../src/ehr/ui/Exotic";
it("palette keeps confirmation and acknowledgment event authority", () => {
  expect(commandEvent("orders", "nav")).toEqual({ click: { comp: "orders" } });
  expect(commandEvent("weight", "confirm")).toEqual({
    confirm: { comp: "weight" },
  });
  expect(commandEvent("interaction", "ack")).toEqual({
    ack: { alert: "interaction" },
  });
});
