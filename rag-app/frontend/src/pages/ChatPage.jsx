import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Stack,
  Button,
  Chip,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AddCommentRoundedIcon from "@mui/icons-material/AddCommentRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { UserMessage, BotMessage, ThinkingIndicator } from "../components/MessageList";
import { AgentCardDialog } from "../components/AgentTrace";
import { ask, listDocuments, getAgentCard } from "../api";

const SUGGESTIONS = [
  "Summarize the main points across all uploaded documents",
  "How many PDFs and vector chunks are stored in the knowledge base?",
  "Compare the important findings or policies in the knowledge base",
  "Calculate 12 * 24 and check any leave or numeric rules in the PDFs",
];

export default function ChatPage() {
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [agentCard, setAgentCard] = useState(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => {});
    getAgentCard().then(setAgentCard).catch(() => {});
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
      const updatedHistory = [...messages, { role: "user", text: q }];
      setMessages(updatedHistory);
      setBusy(true);

      try {
        const response = await ask(q, null, messages);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: response.answer,
            sources: response.sources,
            agentTrace: response.agentTrace,
          },
        ]);
      } catch (err) {
        setError(err.message || "Failed to generate answer.");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [question, busy, messages]
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
    <Box sx={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      <Navbar
        icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />}
        title="A2A Multi-Agent Knowledge Chat"
        subtitle={`Qdrant Vector DB • ${docs.length} PDFs (${totalChunks} vectors, ${totalPages} pages)`}
        actions={
          <>
            {agentCard && (
              <Chip
                icon={<HubRoundedIcon sx={{ fontSize: 15 }} />}
                label={`A2A Agents (${agentCard.agents?.length || 5})`}
                onClick={() => setCardOpen(true)}
                sx={{
                  bgcolor: "primary.light",
                  color: "primary.main",
                  cursor: "pointer",
                  "& .MuiChip-icon": { color: "primary.main" },
                }}
              />
            )}
            {messages.length > 0 && (
              <Button variant="outlined" size="small" startIcon={<AddCommentRoundedIcon />} onClick={() => setMessages([])}>
                Clear Chat
              </Button>
            )}
            <Button variant="contained" size="small" startIcon={<CloudUploadRoundedIcon />} onClick={() => navigate("/upload")}>
              Upload / Manage PDFs
            </Button>
          </>
        }
      />

      <AgentCardDialog open={cardOpen} onClose={() => setCardOpen(false)} card={agentCard} />

      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, sm: 3, md: 4 }, py: 3, display: "flex", flexDirection: "column" }}>
        <Box sx={{ maxWidth: 820, width: "100%", mx: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
          {docs.length === 0 && isEmpty && (
            <EmptyState
              icon={<StorageRoundedIcon sx={{ fontSize: 34 }} />}
              title="Your Qdrant Vector Database is Empty"
              description="Upload PDF documents into Qdrant, or ask a question right now to see the A2A Coordinator, Math Analyst, and Web Research agents collaborate."
            >
              <Button variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => navigate("/upload")}>
                Go to Upload Page
              </Button>
            </EmptyState>
          )}

          {docs.length > 0 && isEmpty && (
            <EmptyState
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 30 }} />}
              title="A2A Multi-Agent RAG is Ready"
              description={
                <>
                  <strong>5 Specialist Agents</strong> (Coordinator, Qdrant RAG, Math/Catalog Analyst, Web Researcher, and Citation Verifier) collaborate across <strong>{totalChunks} vectors</strong> from <strong>{docs.length} PDFs</strong>.
                </>
              }
            >
              <Stack spacing={1.5} maxWidth={580} mx="auto">
                {SUGGESTIONS.map((s, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    onClick={() => handleSend(s)}
                    sx={{
                      p: 1.75,
                      px: 2.25,
                      borderRadius: 3,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                      "&:hover": { borderColor: "primary.main", bgcolor: "primary.light", transform: "translateY(-1px)" },
                    }}
                  >
                    <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 16 }} />
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      {s}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </EmptyState>
          )}

          {messages.map((m, idx) =>
            m.role === "user" ? <UserMessage key={idx} text={m.text} /> : <BotMessage key={idx} m={m} />
          )}

          {busy && <ThinkingIndicator elapsed={elapsed} />}

          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <div ref={bottomRef} />
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderTop: 1,
          borderColor: "divider",
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
        }}
      >
        <Box sx={{ maxWidth: 820, width: "100%", mx: "auto" }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              bgcolor: "background.paper",
              borderRadius: 3.5,
              px: 2,
              py: 1,
              "&:focus-within": {
                borderColor: "primary.main",
                boxShadow: "0 0 0 4px rgba(0, 113, 227, 0.15)",
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
              placeholder="Ask any question… (A2A Coordinator routes to Qdrant RAG, Math, or Web Agents)"
              disabled={busy}
              variant="standard"
              InputProps={{ disableUnderline: true, sx: { fontSize: 15, lineHeight: 1.6, pt: 0.5 } }}
            />
            <Tooltip title="Send Message (Enter)">
              <span>
                <IconButton
                  onClick={() => handleSend()}
                  disabled={!question.trim() || busy}
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    borderRadius: 2.5,
                    "&:hover": { bgcolor: "primary.dark" },
                    "&:disabled": { bgcolor: "grey.200", color: "grey.400" },
                  }}
                >
                  <SendRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Paper>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1}>
            Powered by A2A Multi-Agent Protocol • Searches across all {totalChunks} Qdrant vectors with tool fallback.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
