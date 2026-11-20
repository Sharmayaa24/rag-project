import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Box, Typography, Avatar, Stack, ButtonBase, Chip } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import SettingsDialog, { PROVIDERS_INFO } from "./SettingsDialog";
import { getSettings } from "../api";

export default function Navbar({ icon, title, actions }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isChat = location.pathname === "/chat";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState("ollama");

  useEffect(() => {
    getSettings()
      .then((s) => setActiveProvider(s.chatProvider || "ollama"))
      .catch(() => {});
  }, []);

  const currentProviderInfo =
    PROVIDERS_INFO.find((p) => p.id === activeProvider) || PROVIDERS_INFO[0];

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          bgcolor: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            px: { xs: 2, md: 4 },
            minHeight: { xs: 56, md: 60 },
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 160 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 32,
                height: 32,
                borderRadius: "9px",
                bgcolor: "#0071E3",
                color: "#FFFFFF",
                boxShadow: "0 2px 8px rgba(0, 113, 227, 0.25)",
              }}
            >
              {icon}
            </Avatar>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              color="#1D1D1F"
              sx={{ letterSpacing: "-0.015em", fontSize: 15.5 }}
            >
              {title}
            </Typography>
          </Stack>

          {/* macOS / iOS Segmented Control */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "rgba(118, 118, 128, 0.12)",
              p: "3px",
              borderRadius: "980px",
            }}
          >
            <ButtonBase
              onClick={() => navigate("/upload")}
              sx={{
                px: 2.25,
                py: 0.65,
                borderRadius: "980px",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontSize: 13.5,
                fontWeight: !isChat ? 600 : 500,
                color: !isChat ? "#1D1D1F" : "#86868B",
                bgcolor: !isChat ? "#FFFFFF" : "transparent",
                boxShadow: !isChat ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
              Documents
            </ButtonBase>

            <ButtonBase
              onClick={() => navigate("/chat")}
              sx={{
                px: 2.25,
                py: 0.65,
                borderRadius: "980px",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontSize: 13.5,
                fontWeight: isChat ? 600 : 500,
                color: isChat ? "#1D1D1F" : "#86868B",
                bgcolor: isChat ? "#FFFFFF" : "transparent",
                boxShadow: isChat ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "none",
                transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
            >
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 15 }} />
              Assistant
            </ButtonBase>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
            sx={{ minWidth: { xs: "auto", sm: 160 } }}
          >
            <Chip
              icon={<TuneRoundedIcon sx={{ fontSize: 15 }} />}
              label={currentProviderInfo.name}
              onClick={() => setSettingsOpen(true)}
              sx={{
                height: 32,
                px: 0.5,
                fontSize: 12.5,
                fontWeight: 600,
                bgcolor: "#F5F5F7",
                color: "#1D1D1F",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                cursor: "pointer",
                "& .MuiChip-icon": { color: "#0071E3" },
                "&:hover": {
                  bgcolor: "#E8F2FF",
                  borderColor: "#0071E3",
                },
              }}
            />
            {actions}
          </Stack>
        </Toolbar>
      </AppBar>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdated={(updated) => setActiveProvider(updated.chatProvider || "ollama")}
      />
    </>
  );
}
