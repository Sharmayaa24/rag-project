import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  IconButton,
  TextField,
  Chip,
  Alert,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { getSettings, updateSettings } from "../api";

export const PROVIDERS_INFO = [
  {
    id: "freebuff",
    name: "FreeBuff Cloud",
    badge: "Fast • Free • No Key",
    badgeColor: "#248A3D",
    badgeBg: "#EAF9EE",
    accent: "#0071E3",
    icon: <BoltRoundedIcon sx={{ fontSize: 20 }} />,
    description: "Instant cloud AI responses (~2–4s) with zero API key required.",
    needsKey: false,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Fast Cloud",
    badgeColor: "#0071E3",
    badgeBg: "#E8F2FF",
    accent: "#0071E3",
    icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 19 }} />,
    description: "Uses Google Gemini 3.5 Flash Lite (~1s) for fast, structured answers.",
    needsKey: true,
    keyField: "geminiApiKey",
    keyLabel: "Gemini API Key",
    keyPlaceholder: "AIzaSy...",
    hasKeyFlag: "hasGeminiKey",
    modelField: "geminiModel",
    defaultModel: "gemini-3.5-flash-lite",
  },
  {
    id: "groq",
    name: "Groq Cloud",
    badge: "Ultra-Fast LPU",
    badgeColor: "#C93400",
    badgeBg: "#FFF3EB",
    accent: "#FF9500",
    icon: <RocketLaunchRoundedIcon sx={{ fontSize: 19 }} />,
    description: "Sub-second Llama 3.3 70B responses using Groq's free API tier.",
    needsKey: true,
    keyField: "groqApiKey",
    keyLabel: "Groq API Key",
    keyPlaceholder: "gsk_...",
    hasKeyFlag: "hasGroqKey",
    modelField: "groqModel",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "openrouter",
    name: "OpenRouter Free",
    badge: "Free Models",
    badgeColor: "#5856D6",
    badgeBg: "#F0EFFF",
    accent: "#5856D6",
    icon: <PublicRoundedIcon sx={{ fontSize: 19 }} />,
    description: "Connects to OpenRouter free-tier models (Llama 3.3, Gemma 3, DeepSeek).",
    needsKey: true,
    keyField: "openrouterApiKey",
    keyLabel: "OpenRouter API Key",
    keyPlaceholder: "sk-or-v1-...",
    hasKeyFlag: "hasOpenrouterKey",
    modelField: "openrouterModel",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  },
  {
    id: "ollama",
    name: "Local Ollama",
    badge: "100% Offline CPU",
    badgeColor: "#86868B",
    badgeBg: "#F5F5F7",
    accent: "#1D1D1F",
    icon: <ComputerRoundedIcon sx={{ fontSize: 19 }} />,
    description: "Runs locally on your machine (qwen2.5:3b). Private, but slower on CPU.",
    needsKey: false,
    modelField: "ollamaModel",
    defaultModel: "qwen2.5:3b",
  },
];

export default function SettingsDialog({ open, onClose, onUpdated }) {
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [serverState, setServerState] = useState({});
  const [keys, setKeys] = useState({
    geminiApiKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    postgresDsn: "",
  });
  const [models, setModels] = useState({
    ollamaModel: "qwen2.5:3b",
    geminiModel: "gemini-3.5-flash-lite",
    groqModel: "llama-3.3-70b-versatile",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    getSettings()
      .then((data) => {
        setServerState(data);
        setSelectedProvider(data.chatProvider || "ollama");
        setModels({
          ollamaModel: data.ollamaModel || "qwen2.5:3b",
          geminiModel: data.geminiModel || "gemini-3.5-flash-lite",
          groqModel: data.groqModel || "llama-3.3-70b-versatile",
          openrouterModel: data.openrouterModel || "meta-llama/llama-3.3-70b-instruct:free",
        });
      })
      .catch(() => {});
  }, [open]);

  const activeInfo =
    PROVIDERS_INFO.find((p) => p.id === selectedProvider) || PROVIDERS_INFO[0];

  const handleSave = async () => {
    setError("");
    if (
      activeInfo.needsKey &&
      !serverState[activeInfo.hasKeyFlag] &&
      !(keys[activeInfo.keyField] || "").trim()
    ) {
      setError(`Please enter your ${activeInfo.keyLabel} or choose FreeBuff Cloud (No API key required).`);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings({
        chatProvider: selectedProvider,
        ...models,
        ...keys,
      });
      setServerState(updated);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          bgcolor: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.14)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2.25,
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} color="#1D1D1F">
            AI Response Engine
          </Typography>
          <Typography variant="caption" color="#86868B">
            Switch to a fast cloud engine anytime when local Ollama is slow
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={1.25}>
          {PROVIDERS_INFO.map((p) => {
            const active = selectedProvider === p.id;
            const keySaved = p.hasKeyFlag ? serverState[p.hasKeyFlag] : false;

            return (
              <Paper
                key={p.id}
                variant="outlined"
                onClick={() => {
                  setSelectedProvider(p.id);
                  setError("");
                }}
                sx={{
                  p: 1.75,
                  borderRadius: "16px",
                  cursor: "pointer",
                  borderColor: active ? "#0071E3" : "rgba(0, 0, 0, 0.08)",
                  bgcolor: active ? "#E8F2FF" : "#FFFFFF",
                  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  "&:hover": {
                    borderColor: "#0071E3",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "11px",
                      bgcolor: active ? "#0071E3" : "#F5F5F7",
                      color: active ? "#FFFFFF" : "#1D1D1F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {p.icon}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                      <Typography variant="subtitle2" fontWeight={700} color="#1D1D1F">
                        {p.name}
                      </Typography>
                      <Chip
                        label={p.badge}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          fontWeight: 600,
                          bgcolor: p.badgeBg,
                          color: p.badgeColor,
                        }}
                      />
                      {keySaved && (
                        <Chip
                          label="Key Saved"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            bgcolor: "#EAF9EE",
                            color: "#248A3D",
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="#86868B" display="block">
                      {p.description}
                    </Typography>
                  </Box>

                  {active && <CheckCircleRoundedIcon sx={{ color: "#0071E3", fontSize: 22 }} />}
                </Stack>

                {/* Inline Configuration when selected */}
                {active && (p.needsKey || p.modelField) && (
                  <Stack
                    spacing={1.5}
                    mt={2}
                    pt={1.75}
                    sx={{ borderTop: "1px solid rgba(0, 113, 227, 0.18)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.needsKey && (
                      <TextField
                        label={
                          keySaved
                            ? `${p.keyLabel} (Already saved — enter to replace)`
                            : p.keyLabel
                        }
                        placeholder={p.keyPlaceholder}
                        type="password"
                        size="small"
                        fullWidth
                        value={keys[p.keyField] || ""}
                        onChange={(e) =>
                          setKeys((prev) => ({ ...prev, [p.keyField]: e.target.value }))
                        }
                        sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}
                      />
                    )}
                    {p.modelField && (
                      <TextField
                        label="Model Name"
                        size="small"
                        fullWidth
                        value={models[p.modelField] || p.defaultModel}
                        onChange={(e) =>
                          setModels((prev) => ({ ...prev, [p.modelField]: e.target.value }))
                        }
                        sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}
                      />
                    )}
                  </Stack>
                )}
              </Paper>
            );
          })}
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 1.75,
            borderRadius: "16px",
            borderColor: "rgba(0, 0, 0, 0.08)",
            bgcolor: "#F5F5F7",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" fontWeight={700} color="#1D1D1F">
              PostgreSQL Database Tool (Optional)
            </Typography>
            {serverState.hasPostgresDsn && (
              <Chip
                label="DSN Saved"
                size="small"
                sx={{ height: 20, fontSize: 10, bgcolor: "#EAF9EE", color: "#248A3D" }}
              />
            )}
          </Stack>
          <TextField
            label={
              serverState.hasPostgresDsn
                ? "PostgreSQL URL (Saved — enter to replace)"
                : "PostgreSQL Connection URL"
            }
            placeholder="postgresql://postgres:12345678@localhost:5432/postgres"
            type="password"
            size="small"
            fullWidth
            value={keys.postgresDsn || ""}
            onChange={(e) => setKeys((prev) => ({ ...prev, postgresDsn: e.target.value }))}
            sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}
          />
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          justifyContent: "space-between",
        }}
      >
        <Button onClick={onClose} sx={{ color: "#86868B" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={handleSave}
          sx={{
            bgcolor: "#0071E3",
            "&:hover": { bgcolor: "#0077ED" },
          }}
        >
          {saving ? "Saving…" : `Use ${activeInfo.name}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
