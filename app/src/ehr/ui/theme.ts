import { createTheme, defaultVariantColorsResolver } from "@mantine/core";

/** Original VGI tokens from docs/design/visual-style.md. */
export const clinicalTokens = {
  canvas: "#F3F5F7",
  surface: "#FFFFFF",
  banner: "#E8EEF2",
  hover: "#F6F8FA",
  selected: "#E6EFF7",
  ink: "#243341",
  secondary: "#526171",
  divider: "#CBD5DF",
  control: "#718096",
  blue: { ink: "#245A81", tint: "#E8F1F8", hover: "#1C4868" },
  red: { ink: "#9C2833", tint: "#FCECEE", hover: "#82212B" },
  yellow: { ink: "#825300", tint: "#FFF3D6", hover: "#694300" },
  green: { ink: "#256348", tint: "#EAF5EE", hover: "#1D503A" },
  violet: { ink: "#65448B", tint: "#F1ECF7", hover: "#523771" },
  gray: { ink: "#526171", tint: "#EDF0F3", hover: "#414E5B" },
};
export type ClinicalTone =
  "blue" | "red" | "yellow" | "green" | "violet" | "gray";
function tone(color: string): color is ClinicalTone {
  return ["blue", "red", "yellow", "green", "violet", "gray"].includes(color);
}
export const clinicalTheme = createTheme({
  primaryColor: "blue",
  primaryShade: 8,
  colors: Object.fromEntries(
    (["blue", "red", "yellow", "green", "violet", "gray"] as const).map(
      (color) => {
        const { ink, tint, hover } = clinicalTokens[color];
        return [
          color,
          [tint, tint, tint, tint, tint, ink, ink, ink, ink, hover] as const,
        ];
      },
    ),
  ),
  black: clinicalTokens.ink,
  white: clinicalTokens.surface,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: "12px", sm: "13px", md: "13px", lg: "14px", xl: "18px" },
  lineHeights: { xs: "16px", sm: "18px", md: "18px", lg: "20px", xl: "24px" },
  spacing: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
  radius: { xs: "3px", sm: "4px", md: "4px", lg: "4px", xl: "4px" },
  defaultRadius: "sm",
  focusRing: "auto",
  // Exact opaque ink/tint pairs keep alerts, badges and secondary actions legible.
  variantColorResolver: (input) => {
    const color = input.color ?? input.theme.primaryColor;
    if (!tone(color)) return defaultVariantColorsResolver(input);
    const token = clinicalTokens[color];
    switch (input.variant) {
      case "filled":
        return {
          background: token.ink,
          hover: token.hover,
          color: "#FFFFFF",
          border: "transparent",
        };
      case "light":
        return {
          background: token.tint,
          hover: token.tint,
          color: token.ink,
          border: "transparent",
        };
      case "subtle":
        return {
          background: "transparent",
          hover: token.tint,
          color: token.ink,
          border: "transparent",
        };
      case "outline":
        return {
          background: "#FFFFFF",
          hover: token.tint,
          color: token.ink,
          border: token.ink,
        };
      default:
        return defaultVariantColorsResolver(input);
    }
  },
  components: {
    Button: { defaultProps: { fw: 600 } },
    Badge: {
      defaultProps: { variant: "light", radius: "xs", fw: 600, tt: "none" },
    },
    Text: { defaultProps: { c: clinicalTokens.ink } },
    Tooltip: { defaultProps: { fz: "xs" } },
  },
});

export const clinicalCssVariables = {
  "--clinical-canvas": clinicalTokens.canvas,
  "--clinical-surface": clinicalTokens.surface,
  "--clinical-banner": clinicalTokens.banner,
  "--clinical-hover": clinicalTokens.hover,
  "--clinical-selected": clinicalTokens.selected,
  "--clinical-ink": clinicalTokens.ink,
  "--clinical-muted": clinicalTokens.secondary,
  "--clinical-border": clinicalTokens.divider,
  "--clinical-control": clinicalTokens.control,
  "--clinical-primary": clinicalTokens.blue.ink,
  ...Object.fromEntries(
    (["blue", "red", "yellow", "green", "violet", "gray"] as const).flatMap(
      (tone) => [
        [`--clinical-${tone}-ink`, clinicalTokens[tone].ink],
        [`--clinical-${tone}-tint`, clinicalTokens[tone].tint],
      ],
    ),
  ),
};
