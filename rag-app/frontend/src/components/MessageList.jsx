import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  CircularProgress,
  Fade,
  ListItemButton,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { AgentTraceCard } from "./AgentTrace";

export function SourceCard({ source }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(source.score * 100);
  const highMatch = pct >= 70;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mt: 1 }}>
      <ListItemButton
        dense
        onClick={() => setOpen((o) => !o)}
        sx={{ gap: 1.2, px: 1.75, py: 1, bgcolor: open ? "primary.light" : "transparent" }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={600} color="text.primary" flex={1} noWrap>
          {source.fileName || "Document"} • Page {source.page}
        </Typography>
        <Chip
          label={`${pct}% match`}
          size="small"
          sx={{
            fontSize: 10.5,
            height: 20,
            bgcolor: highMatch ? "secondary.light" : "grey.100",
            color: highMatch ? "secondary.dark" : "text.secondary",
          }}
        />
        {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50", borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", lineHeight: 1.7 }}>
            "{source.snippet}…"
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}

export function UserMessage({ text }) {
  return (
    <Fade in timeout={200}>
      <Box display="flex" justifyContent="flex-end" alignItems="flex-start" gap={1.5} mb={3}>
        <Paper
          sx={{
            maxWidth: "78%",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            px: 2.5,
            py: 1.75,
            borderRadius: "18px 4px 18px 18px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <Typography variant="body1" fontSize={15} lineHeight={1.65}>
            {text}
          </Typography>
        </Paper>
        <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.light", color: "primary.main" }}>
          <PersonRoundedIcon sx={{ fontSize: 19 }} />
        </Avatar>
      </Box>
    </Fade>
  );
}

export function BotMessage({ m }) {
  const [copied, setCopied] = useState(false);

  const copyAnswer = () => {
    navigator.clipboard.writeText(m.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Fade in timeout={250}>
      <Box display="flex" justifyContent="flex-start" alignItems="flex-start" gap={1.5} mb={3}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
          <SmartToyRoundedIcon sx={{ fontSize: 19 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: "85%" }}>
          <AgentTraceCard trace={m.agentTrace} />
          <Paper
            variant="outlined"
            sx={{
              px: 2.5,
              py: 2,
              borderRadius: "4px 18px 18px 18px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <Typography variant="body1" fontSize={15} lineHeight={1.7} color="text.primary">
              {m.text}
            </Typography>
          </Paper>

          <Box display="flex" alignItems="center" gap={1} mt={0.5} ml={0.5}>
            <Tooltip title={copied ? "Copied!" : "Copy text"}>
              <IconButton size="small" onClick={copyAnswer} color={copied ? "success" : "default"}>
                {copied ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          {m.sources?.length > 0 && (
            <Box mt={1}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                Retrieved Vector Sources ({m.sources.length})
              </Typography>
              {m.sources.map((s, idx) => (
                <SourceCard key={idx} source={s} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
}

export function ThinkingIndicator({ elapsed }) {
  return (
    <Box display="flex" gap={1.5} alignItems="flex-start" mb={3}>
      <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText" }}>
        <SmartToyRoundedIcon sx={{ fontSize: 19 }} />
      </Avatar>
      <Paper
        variant="outlined"
        sx={{
          px: 2.5,
          py: 1.75,
          borderRadius: "4px 18px 18px 18px",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <CircularProgress size={16} thickness={5} color="primary" />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Searching Qdrant vectors and generating answer… ({elapsed}s)
        </Typography>
      </Paper>
    </Box>
  );
}

