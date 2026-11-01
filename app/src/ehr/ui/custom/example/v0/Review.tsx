import { Paper, Stack } from '@mantine/core';
import { UiNodeView, type PresentationProps } from '@ehr/presentation';
export default function Review({ node, onEvent }: PresentationProps) {
  return <Paper p="xs" withBorder><Stack gap="xs"><UiNodeView node={node} onEvent={onEvent} /></Stack></Paper>;
}
