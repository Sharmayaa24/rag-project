import { createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0071E3",
      dark: "#0077ED",
      light: "#E8F2FF",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#34C759",
      light: "#EAF9EE",
      dark: "#1E8E3E",
    },
    error: {
      main: "#FF3B30",
    },
    text: {
      primary: "#1D1D1F",
      secondary: "#86868B",
    },
    background: {
      default: "#F5F5F7",
      paper: "#FFFFFF",
    },
    divider: "rgba(0, 0, 0, 0.08)",
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"SF Pro Display"',
      '"SF Pro Text"',
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h4: { fontWeight: 700, letterSpacing: "-0.028em", lineHeight: 1.15 },
    h5: { fontWeight: 600, letterSpacing: "-0.022em", lineHeight: 1.2 },
    h6: { fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.3 },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { letterSpacing: "-0.01em", lineHeight: 1.6 },
    body2: { letterSpacing: "-0.008em", lineHeight: 1.5 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 980,
          paddingLeft: 20,
          paddingRight: 20,
          transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        outlined: {
          borderColor: "rgba(0, 0, 0, 0.06)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 980 },
      },
    },
  },
});

export default theme;
