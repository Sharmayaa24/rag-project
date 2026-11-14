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
      dark: "#248A3D",
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
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.028em",
      lineHeight: 1.15,
      color: "#1D1D1F",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
      color: "#1D1D1F",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.015em",
      lineHeight: 1.3,
      color: "#1D1D1F",
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    body1: {
      fontSize: "15.5px",
      fontWeight: 400,
      letterSpacing: "-0.01em",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "14px",
      letterSpacing: "-0.008em",
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "12.5px",
      fontWeight: 500,
      color: "#86868B",
    },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          backgroundColor: "#F5F5F7",
          color: "#1D1D1F",
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
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 980,
        },
      },
    },
  },
});

export default theme;
