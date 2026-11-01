import { createContext, useContext, type ReactNode } from "react";
import { Box, Stack, Group, Paper, Flex } from "@mantine/core";
import type { Layout, PresentationBundle } from "./presentation-types";
import type { UiNode } from "./types";
const Context = createContext<PresentationBundle | null>(null);
export function PresentationProvider({ bundle, children }: { bundle: PresentationBundle | null; children: ReactNode }) {
  return <Context.Provider value={bundle}>{children}</Context.Provider>;
}
function paint(layout: Layout, original: ReactNode): ReactNode {
  if ("leaf" in layout) return original;
  const child = paint(layout.child, original);
  switch (layout.wrapper) {
    case "Box": return <Box {...layout.props}>{child}</Box>;
    case "Stack": return <Stack {...layout.props}>{child}</Stack>;
    case "Group": return <Group {...layout.props}>{child}</Group>;
    case "Paper": return <Paper {...layout.props}>{child}</Paper>;
    case "Flex": return <Flex {...layout.props}>{child}</Flex>;
  }
}
export function usePresentation(node: UiNode, original: ReactNode): ReactNode {
  const bundle = useContext(Context);
  if (!bundle) return original;
  const kind = Object.keys(node)[0];
  const payload: unknown = Object.values(node)[0];
  const id = typeof payload === "object" && payload !== null && "id" in payload ? payload.id : null;
  const composite = bundle.composites.find((c) => c.id === id);
  const component = (composite ? bundle.components.find((c) => c.key === `composite:${composite.name}`) : null) ?? bundle.components.find((c) => c.key === kind);
  return component ? paint(component.layout, original) : original;
}
