import { createTheme } from "@mantine/core";
export const clinicalTheme = createTheme({
  primaryColor: "teal",
  primaryShade: 8,
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: "12px", sm: "13px", md: "13px", lg: "15px", xl: "18px" },
  defaultRadius: "sm",
  components: { Button: { defaultProps: { fw: 600 } } },
});
