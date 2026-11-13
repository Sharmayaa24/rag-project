import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  CircularProgress,
  Avatar,
  Fade,
  Alert,
  Paper,
  Stack,
  Button,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AddCommentRoundedIcon from "@mui/icons-material/AddCommentRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import { ask, listDocuments } from "../api";

const SUGGESTIONS = [
  "Summarize the main points across all uploaded documents",
  "What are the key policies, rules, or procedures mentioned?",
  "Compare the important findings or topics in the knowledge base",
  "List any critical numbers, dates, or technical requirements",
];

function SourceCard({ source }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(source.score * 100);

  return (
    <Box
      sx={{
        border: "1px solid #e4e4e7",
        borderRadius: 2,
        overflow: "hidden",
        mt: 1,
        bgcolor: "#ffffff",
        transition: "border-color 0.15s",
        "&:hover": { borderColor: "#7c3aed" },
      }}
    >
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          px: 1.75,
          py: 1,
          cursor: "pointer",
          bgcolor: open ? "#f5f3ff" : "transparent",
          transition: "background-color 0.15s",
        }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 16, color: "#7c3aed", flexShrink: 0 }} />
        <Typography fontSize={12} fontWeight={600} color="#27272a" flex={1} noWrap>
          {source.fileName || "Document"} • Page {source.page}
        </Typography>
        <Chip
          label={`${pct}% match`}
          size="small"
          sx={{
            fontSize: 10.5,
            fontWeight: 700,
            height: 20,
            bgcolor: pct >= 70 ? "#dcfce7" : "#f4f4f5",
            color: pct >= 70 ? "#15803d" : "#71717a",
            flexShrink: 0,
          }}
        />
        {open ? (
          <ExpandLessRoundedIcon sx={{ fontSize: 18, color: "#71717a", flexShrink: 0 }} />
        ) : (
          <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "#71717a", flexShrink: 0 }} />
        )}
      </Box>
      <Collapse in={open}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "#fafafa",
            borderTop: "1px solid #f4f4f5",
          }}
        >
          <Typography
            fontSize={12.5}
            color="#52525b"
            lineHeight={1.7}
            sx={{ fontStyle: "italic" }}
          >
            "{source.snippet}…"
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

function UserMessage({ text }) {
  return (
    <Fade in timeout={200}>
      <Box display="flex" justifyContent="flex-end" alignItems="flex-start" gap={1.5} mb={3}>
        <Box sx={{ maxWidth: "78%" }}>
          <Box
            sx={{
              bgcolor: "#7c3aed",
              color: "#ffffff",
              px: 2.5,
              py: 1.75,
              borderRadius: "18px 4px 18px 18px",
              fontSize: 15,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
            }}
          >
            {text}
          </Box>
        </Box>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: "#ede9fe",
            color: "#7c3aed",
            flexShrink: 0,
          }}
        >
          <PersonRoundedIcon sx={{ fontSize: 19 }} />
        </Avatar>
      </Box>
    </Fade>
  );
}

function BotMessage({ m }) {
  const [copied, setCopied] = useState(false);

  const copyAnswer = () => {
    navigator.clipboard.writeText(m.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Fade in timeout={250}>
      <Box display="flex" justifyContent="flex-start" alignItems="flex-start" gap={1.5} mb={3}>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: "#7c3aed",
            color: "#ffffff",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
          }}
        >
          <SmartToyRoundedIcon sx={{ fontSize: 19 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: "85%" }}>
          <Box
            sx={{
              bgcolor: "#ffffff",
              border: "1px solid #e4e4e7",
              px: 2.5,
              py: 2,
              borderRadius: "4px 18px 18px 18px",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#18181b",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            {m.text}
          </Box>

          <Box display="flex" alignItems="center" gap={1} mt={0.5} ml={0.5}>
            <Tooltip title={copied ? "Copied!" : "Copy text"}>
              <IconButton
                size="small"
                onClick={copyAnswer}
                sx={{ color: copied ? "#16a34a" : "#a1a1aa", p: 0.5 }}
              >
                {copied ? (
                  <CheckRoundedIcon sx={{ fontSize: 15 }} />
                ) : (
                  <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {m.sources?.length > 0 && (
            <Box mt={1}>
              <Typography
                fontSize={11}
                fontWeight={700}
                color="#71717a"
                letterSpacing={0.5}
                textTransform="uppercase"
                mb={0.5}
              >
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

function ThinkingIndicator({ elapsed }) {
  return (
    <Box display="flex" gap={1.5} alignItems="flex-start" mb={3}>
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: "#7c3aed",
          color: "#ffffff",
          flexShrink: 0,
        }}
      >
        <SmartToyRoundedIcon sx={{ fontSize: 19 }} />
      </Avatar>
      <Box
        sx={{
          bgcolor: "#ffffff",
          border: "1px solid #e4e4e7",
          px: 2.5,
          py: 1.75,
          borderRadius: "4px 18px 18px 18px",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        }}
      >
        <CircularProgress size={16} thickness={5} sx={{ color: "#7c3aed" }} />
        <Typography fontSize={14} color="#52525b" fontWeight={500}>
          Searching Qdrant vectors and generating answer… ({elapsed}s)
        </Typography>
      </Box>
    </Box>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    listDocuments()
      .then((d) => setDocs(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const handleSend = useCallback(
    async (textToSend) => {
      const q = (textToSend ?? question).trim();
      if (!q || busy) return;
      setQuestion("");
      setError("");
      setMessages((prev) => [...prev, { role: "user", text: q }]);
      setBusy(true);

      try {
        // Always search across ALL vectors in Qdrant (no single PDF selection needed)
        const response = await ask(q, null);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: response.answer, sources: response.sources },
        ]);
      } catch (err) {
        setError(err.message || "Failed to generate answer.");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [question, busy]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalPages = docs.reduce((acc, d) => acc + (d.pages || 0), 0);
  const totalChunks = docs.reduce((acc, d) => acc + (d.chunks || 0), 0);
  const isEmpty = messages.length === 0 && !busy;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#fbfbfe",
      }}
    >
      {/* ── TOP HEADER BAR ── */}
      <Box
        sx={{
          height: 64,
          borderBottom: "1px solid #e4e4e7",
          bgcolor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, md: 4 },
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: "#ffffff" }} />
          </Box>
          <Box>
            <Typography fontSize={16} fontWeight={800} color="#18181b" letterSpacing={-0.3}>
              AI Knowledge Base Chat
            </Typography>
            <Typography fontSize={11.5} color="#71717a">
              Connected to Qdrant • {docs.length} PDFs indexed ({totalChunks} vectors, {totalPages} pages)
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {messages.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCommentRoundedIcon />}
              onClick={() => setMessages([])}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#d4d4d8",
                color: "#3f3f46",
              }}
            >
              Clear Chat
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadRoundedIcon />}
            onClick={() => navigate("/upload")}
            sx={{
              bgcolor: "#7c3aed",
              borderRadius: 2,
              px: 2,
              py: 0.8,
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": { bgcolor: "#6d28d9" },
            }}
          >
            Upload / Manage PDFs
          </Button>
        </Stack>
      </Box>

      {/* ── MESSAGES SCROLL AREA ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            maxWidth: "820px",
            width: "100%",
            mx: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* If 0 documents in Qdrant */}
          {docs.length === 0 && isEmpty && (
            <Box sx={{ my: "auto", textAlign: "center", py: 6, px: 2 }}>
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  bgcolor: "#ede9fe",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2.5,
                }}
              >
                <StorageRoundedIcon sx={{ fontSize: 34 }} />
              </Box>
              <Typography variant="h5" fontWeight={800} color="#18181b" mb={1}>
                Your Qdrant Vector Database is Empty
              </Typography>
              <Typography fontSize={15} color="#71717a" maxWidth={440} mx="auto" mb={3}>
                Go to the Upload page to index your PDF documents into Qdrant first, then come
                back here to ask questions.
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUploadRoundedIcon />}
                onClick={() => navigate("/upload")}
                sx={{
                  bgcolor: "#7c3aed",
                  borderRadius: 2.5,
                  px: 3,
                  py: 1.2,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#6d28d9" },
                }}
              >
                Go to Upload Page
              </Button>
            </Box>
          )}

          {/* Welcome State (when vectors exist in Qdrant) */}
          {docs.length > 0 && isEmpty && (
            <Box sx={{ my: "auto", textAlign: "center", py: 5, px: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "#ede9fe",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2.5,
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.15)",
                }}
              >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography
                variant="h5"
                fontWeight={800}
                color="#18181b"
                mb={1}
                letterSpacing={-0.5}
              >
                Ask anything — Qdrant searches all your data automatically
              </Typography>
              <Typography
                fontSize={15}
                color="#71717a"
                maxWidth={540}
                mx="auto"
                mb={4}
                lineHeight={1.6}
              >
                <strong>{totalChunks} vector chunks</strong> from{" "}
                <strong>{docs.length} uploaded PDFs</strong> are indexed in Qdrant. Ask any
                question below and the AI will retrieve the best matching chunks and cite the
                source document and page.
              </Typography>

              <Stack spacing={1.5} maxWidth={580} mx="auto">
                {SUGGESTIONS.map((s, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    onClick={() => handleSend(s)}
                    sx={{
                      p: 1.75,
                      px: 2.25,
                      border: "1px solid #e4e4e7",
                      borderRadius: 3,
                      textAlign: "left",
                      cursor: "pointer",
                      bgcolor: "#ffffff",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      "&:hover": {
                        borderColor: "#7c3aed",
                        bgcolor: "#faf5ff",
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(124, 58, 237, 0.08)",
                      },
                    }}
                  >
                    <AutoAwesomeRoundedIcon
                      sx={{ fontSize: 16, color: "#7c3aed", flexShrink: 0 }}
                    />
                    <Typography fontSize={14} fontWeight={500} color="#27272a">
                      {s}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* Conversation Messages */}
          {messages.map((m, idx) =>
            m.role === "user" ? (
              <UserMessage key={idx} text={m.text} />
            ) : (
              <BotMessage key={idx} m={m} />
            )
          )}

          {busy && <ThinkingIndicator elapsed={elapsed} />}

          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{ mb: 3, borderRadius: 2.5 }}
            >
              {error}
            </Alert>
          )}

          <div ref={bottomRef} />
        </Box>
      </Box>

      {/* ── DOCKED INPUT BAR ── */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          borderTop: "1px solid #e4e4e7",
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ maxWidth: "820px", width: "100%", mx: "auto" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              bgcolor: "#f4f4f5",
              border: "1.5px solid #e4e4e7",
              borderRadius: 3.5,
              px: 2,
              py: 1,
              transition: "all 0.15s ease",
              "&:focus-within": {
                borderColor: "#7c3aed",
                bgcolor: "#ffffff",
                boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.15)",
              },
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={6}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask any question… (Enter to send, Shift+Enter for new line)"
              disabled={busy}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, lineHeight: 1.6, pt: 0.5 },
              }}
            />
            <Tooltip title="Send Message (Enter)">
              <span>
                <IconButton
                  onClick={() => handleSend()}
                  disabled={!question.trim() || busy}
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "#7c3aed",
                    color: "#ffffff",
                    borderRadius: 2.5,
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    "&:hover": { bgcolor: "#6d28d9" },
                    "&:disabled": {
                      bgcolor: "#e4e4e7",
                      color: "#a1a1aa",
                    },
                  }}
                >
                  <SendRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography
            variant="caption"
            color="#a1a1aa"
            display="block"
            textAlign="center"
            mt={1}
          >
            Every question automatically searches across all {totalChunks} vectors stored in Qdrant.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
