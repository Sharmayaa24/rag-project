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

// Apple HIG Vibrant Accent Palette for alternating bullets, types, and highlights
const ACCENT_PALETTE = [
  { main: "#0071E3", bg: "#E8F2FF", border: "rgba(0, 113, 227, 0.22)" },   // Apple Blue
  { main: "#5856D6", bg: "#F0EFFF", border: "rgba(88, 86, 214, 0.22)" },   // Apple Indigo
  { main: "#248A3D", bg: "#EAF9EE", border: "rgba(52, 199, 89, 0.25)" },   // Apple Green
  { main: "#C93400", bg: "#FFF3EB", border: "rgba(255, 149, 0, 0.25)" },   // Apple Orange
  { main: "#D70040", bg: "#FFEBEF", border: "rgba(255, 45, 85, 0.22)" },   // Apple Rose
  { main: "#008299", bg: "#E6F8FB", border: "rgba(48, 176, 199, 0.25)" },  // Apple Teal
];

function renderInlineFormatting(text, accent) {
  if (!text) return null;
  // Split by **bold** or `code`
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      const inner = tok.slice(2, -2);
      return (
        <Box
          key={i}
          component="span"
          sx={{
            fontWeight: 700,
            color: accent?.main || "#0071E3",
            bgcolor: accent?.bg || "#E8F2FF",
            px: 0.75,
            py: 0.15,
            borderRadius: "6px",
            mx: 0.15,
          }}
        >
          {inner}
        </Box>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      const inner = tok.slice(1, -1);
      return (
        <Box
          key={i}
          component="span"
          sx={{
            fontFamily: "monospace",
            fontWeight: 600,
            fontSize: "0.9em",
            color: "#5856D6",
            bgcolor: "#F0EFFF",
            px: 0.75,
            py: 0.15,
            borderRadius: "6px",
            mx: 0.15,
          }}
        >
          {inner}
        </Box>
      );
    }
    return tok;
  });
}

function FormattedBotContent({ text, isStreaming }) {
  const lines = (text || "").split("\n");
  let itemColorIdx = 0;

  return (
    <Stack spacing={1.15}>
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        const isLastLine = idx === lines.length - 1;

        if (!line) {
          return <Box key={idx} sx={{ height: 4 }} />;
        }

        // 1. Markdown Heading (#, ##, ###) or standalone bold header
        const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
        const standaloneHeader =
          !headingMatch &&
          line.startsWith("**") &&
          line.endsWith("**") &&
          line.length < 80 &&
          !line.slice(2, -2).includes("**");

        if (headingMatch || standaloneHeader) {
          const headingText = headingMatch
            ? headingMatch[2].replace(/\*\*/g, "")
            : line.slice(2, -2);
          const color = ACCENT_PALETTE[idx % ACCENT_PALETTE.length];

          return (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                pt: idx > 0 ? 1 : 0,
                pb: 0.25,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 18,
                  borderRadius: 980,
                  bgcolor: color.main,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#1D1D1F",
                  letterSpacing: "-0.015em",
                }}
              >
                {headingText}
                {isStreaming && isLastLine && <span className="streaming-cursor" />}
              </Typography>
            </Box>
          );
        }

        // 2. Bullet Point (-, *, •) or Numbered Item (1., 2.)
        const bulletMatch = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
        if (bulletMatch) {
          const marker = bulletMatch[1];
          const body = bulletMatch[2];
          const isNumbered = /^\d/.test(marker);
          const color = ACCENT_PALETTE[itemColorIdx % ACCENT_PALETTE.length];
          itemColorIdx += 1;

          // Check if there is a "Type / Key Label: description" pattern
          const labelMatch = body.match(/^(?:\*\*([^*]+)\*\*|([A-Za-z0-9][A-Za-z0-9\s/&()-]{1,38})):\s*(.+)$/);

          return (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.35,
                p: 1.35,
                borderRadius: "14px",
                bgcolor: color.bg,
                border: `1px solid ${color.border}`,
                transition: "transform 0.2s ease",
              }}
            >
              {/* Colorful Bullet Badge */}
              <Box
                sx={{
                  minWidth: isNumbered ? 24 : 10,
                  height: isNumbered ? 24 : 10,
                  mt: isNumbered ? 0.1 : 0.85,
                  borderRadius: "980px",
                  bgcolor: color.main,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11.5,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {isNumbered ? marker.replace(/[.)]/, "") : ""}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {labelMatch ? (
                  <Typography variant="body1" sx={{ fontSize: 15, lineHeight: 1.6, color: "#1D1D1F" }}>
                    <Chip
                      label={labelMatch[1] || labelMatch[2]}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: 12,
                        fontWeight: 700,
                        bgcolor: color.main,
                        color: "#FFFFFF",
                        mr: 1,
                        mb: 0.25,
                      }}
                    />
                    {renderInlineFormatting(labelMatch[3], color)}
                    {isStreaming && isLastLine && <span className="streaming-cursor" />}
                  </Typography>
                ) : (
                  <Typography variant="body1" sx={{ fontSize: 15, lineHeight: 1.6, color: "#1D1D1F" }}>
                    {renderInlineFormatting(body, color)}
                    {isStreaming && isLastLine && <span className="streaming-cursor" />}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }

        // 3. Standard Paragraph with inline highlights
        const defaultAccent = ACCENT_PALETTE[idx % ACCENT_PALETTE.length];
        return (
          <Typography
            key={idx}
            variant="body1"
            sx={{ fontSize: 15.5, lineHeight: 1.68, color: "#1D1D1F" }}
          >
            {renderInlineFormatting(line, defaultAccent)}
            {isStreaming && isLastLine && <span className="streaming-cursor" />}
          </Typography>
        );
      })}
    </Stack>
  );
}

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
  const shouldStream = Boolean(m.isNew);
  const [displayedText, setDisplayedText] = useState(shouldStream ? "" : fullText);
  const [isStreaming, setIsStreaming] = useState(shouldStream);

  useEffect(() => {
    if (!shouldStream) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    const tokens = fullText.split(/(\s+)/);
    if (tokens.length <= 4) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    let currentIndex = 0;
    const step = Math.max(2, Math.ceil(tokens.length / 45));
    const interval = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= tokens.length) {
        setDisplayedText(fullText);
        setIsStreaming(false);
        clearInterval(interval);
      } else {
        setDisplayedText(tokens.slice(0, currentIndex).join(""));
      }
    }, 26);

    return () => clearInterval(interval);
  }, [fullText, shouldStream]);

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

      <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: "90%", sm: "84%" } }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2.75,
            py: 2.25,
            borderRadius: "20px 20px 20px 4px",
            bgcolor: "#FFFFFF",
            borderColor: "rgba(0, 0, 0, 0.06)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
            wordBreak: "break-word",
          }}
        >
          <FormattedBotContent text={displayedText} isStreaming={isStreaming} />
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
  "Preparing structured answer…",
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
