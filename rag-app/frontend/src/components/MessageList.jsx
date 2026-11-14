import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

export function UserMessage({ text }) {
  return (
    <Box
      className="anim-user-msg"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        flexWrap: "nowrap",
        gap: 1.25,
        mb: 2.75,
        width: "100%",
      }}
    >
      <Paper
        sx={{
          maxWidth: { xs: "82%", sm: "72%" },
          bgcolor: "#0071E3",
          color: "#FFFFFF",
          px: 2.25,
          py: 1.4,
          borderRadius: "20px 20px 4px 20px",
          boxShadow: "0 2px 12px rgba(0, 113, 227, 0.18)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <Typography variant="body1" sx={{ fontSize: 15.5, lineHeight: 1.55, color: "#FFFFFF" }}>
          {text}
        </Typography>
      </Paper>
      <Avatar
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          bgcolor: "#E8F2FF",
          color: "#0071E3",
        }}
      >
        <PersonRoundedIcon sx={{ fontSize: 17 }} />
      </Avatar>
    </Box>
  );
}

export function BotMessage({ m }) {
  const [copied, setCopied] = useState(false);
  const fullText = m.text || "";
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    const words = fullText.split(" ");
    if (words.length <= 2) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    let currentIndex = 0;
    const step = Math.max(1, Math.ceil(words.length / 45));
    const interval = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= words.length) {
        setDisplayedText(fullText);
        setIsStreaming(false);
        clearInterval(interval);
      } else {
        setDisplayedText(words.slice(0, currentIndex).join(" "));
      }
    }, 26);

    return () => clearInterval(interval);
  }, [fullText]);

  const copyAnswer = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      className="anim-bot-msg"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        gap: 1.25,
        mb: 3,
        width: "100%",
      }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          mt: 0.25,
          bgcolor: "#1D1D1F",
          color: "#FFFFFF",
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: "85%", sm: "78%" } }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2.5,
            py: 1.85,
            borderRadius: "20px 20px 20px 4px",
            bgcolor: "#FFFFFF",
            borderColor: "rgba(0, 0, 0, 0.06)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <Typography variant="body1" sx={{ fontSize: 15.5, lineHeight: 1.65, color: "#1D1D1F" }}>
            {displayedText}
            {isStreaming && <span className="streaming-cursor" />}
          </Typography>
        </Paper>

        <Box display="flex" alignItems="center" mt={0.4} ml={0.5}>
          <Tooltip title={copied ? "Copied" : "Copy"}>
            <IconButton
              size="small"
              onClick={copyAnswer}
              sx={{ color: copied ? "#34C759" : "#86868B", p: 0.5 }}
            >
              {copied ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

const THINKING_STEPS = [
  "Reading documents…",
  "Analyzing details…",
  "Preparing answer…",
];

export function ThinkingIndicator({ elapsed }) {
  const stepIndex = Math.min(Math.floor(elapsed / 7), THINKING_STEPS.length - 1);

  return (
    <Box
      className="anim-bot-msg"
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        gap: 1.25,
        mb: 3,
        width: "100%",
      }}
    >
      <Avatar
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          mt: 0.25,
          bgcolor: "#0071E3",
          color: "#FFFFFF",
          animation: "appleOrbBreath 2s ease-in-out infinite",
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
      </Avatar>

      <Paper
        variant="outlined"
        sx={{
          px: 2.25,
          py: 1.75,
          borderRadius: "20px 20px 20px 4px",
          minWidth: { xs: 240, sm: 310 },
          maxWidth: 400,
          bgcolor: "#FFFFFF",
          borderColor: "rgba(0, 0, 0, 0.06)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={1.25}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </Box>
            <Typography variant="body2" fontWeight={500} color="#1D1D1F">
              {THINKING_STEPS[stepIndex]}
            </Typography>
          </Stack>
          {elapsed > 0 && (
            <Chip
              label={`${elapsed}s`}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                bgcolor: "#F5F5F7",
                color: "#86868B",
              }}
            />
          )}
        </Stack>

        <Stack spacing={0.85}>
          <Box className="shimmer-line" sx={{ height: 7, width: "90%" }} />
          <Box className="shimmer-line" sx={{ height: 7, width: "62%" }} />
        </Stack>
      </Paper>
    </Box>
  );
}
