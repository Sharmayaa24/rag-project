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
  Button,
  Grid,
} from "@mui/material";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AddCommentRoundedIcon from "@mui/icons-material/AddCommentRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { UserMessage, BotMessage, ThinkingIndicator } from "../components/MessageList";
import { ask, listDocuments } from "../api";

const SUGGESTIONS = [
  "Summarize the main points",
  "What are the key takeaways?",
  "Compare the important topics",
  "Explain the core concepts simply",
];

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
    listDocuments().then(setDocs).catch(() => {});
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

  const isEmpty = messages.length === 0 && !busy;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#F5F5F7",
      }}
    >
      <Navbar
        icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />}
        title="Workspace"
        actions={
          messages.length > 0 ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCommentRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setMessages([])}
              sx={{
                borderColor: "rgba(0, 0, 0, 0.12)",
                color: "#1D1D1F",
                bgcolor: "#FFFFFF",
                "&:hover": { bgcolor: "#F5F5F7", borderColor: "rgba(0, 0, 0, 0.2)" },
              }}
            >
              Clear
            </Button>
          ) : null
        }
      />

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: 3.5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ maxWidth: 760, width: "100%", mx: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
          {docs.length === 0 && isEmpty && (
            <EmptyState
              icon={<DescriptionOutlinedIcon sx={{ fontSize: 28 }} />}
              title="No Documents Yet"
              description="Add a PDF document to your workspace or type a question below."
            >
              <Button
                variant="contained"
                startIcon={<CloudUploadRoundedIcon />}
                onClick={() => navigate("/upload")}
                sx={{ bgcolor: "#0071E3", "&:hover": { bgcolor: "#0077ED" } }}
              >
                Add Documents
              </Button>
            </EmptyState>
          )}

          {docs.length > 0 && isEmpty && (
            <EmptyState
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 28 }} />}
              title="How can I help you?"
              description="Ask a question about your documents or choose a prompt below."
            >
              <Grid container spacing={1.5} maxWidth={560} mx="auto">
                {SUGGESTIONS.map((s, idx) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                    <Paper
                      variant="outlined"
                      onClick={() => handleSend(s)}
                      sx={{
                        p: 2,
                        height: "100%",
                        borderRadius: "16px",
                        bgcolor: "#FFFFFF",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                        "&:hover": {
                          borderColor: "#0071E3",
                          bgcolor: "#E8F2FF",
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={500} color="#1D1D1F">
                        {s}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </EmptyState>
          )}

          {messages.map((m, idx) =>
            m.role === "user" ? <UserMessage key={idx} text={m.text} /> : <BotMessage key={idx} m={m} />
          )}

          {busy && <ThinkingIndicator elapsed={elapsed} />}

          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3, borderRadius: "14px" }}>
              {error}
            </Alert>
          )}

          <div ref={bottomRef} />
        </Box>
      </Box>

      {/* Apple Frosted-Glass Bottom Bar */}
      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
        }}
      >
        <Box sx={{ maxWidth: 760, width: "100%", mx: "auto" }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              bgcolor: "#FFFFFF",
              borderRadius: "24px",
              px: 2.25,
              py: 0.9,
              borderColor: "rgba(0, 0, 0, 0.1)",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
              transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
              "&:focus-within": {
                borderColor: "#0071E3",
                boxShadow: "0 0 0 4px rgba(0, 113, 227, 0.18)",
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
              placeholder="Message…"
              disabled={busy}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15.5, lineHeight: 1.5, py: 0.4, color: "#1D1D1F" },
              }}
            />
            <Tooltip title="Send">
              <span>
                <IconButton
                  onClick={() => handleSend()}
                  disabled={!question.trim() || busy}
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "#0071E3",
                    color: "#FFFFFF",
                    borderRadius: "50%",
                    transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    "&:hover": {
                      bgcolor: "#0077ED",
                      transform: "scale(1.04)",
                    },
                    "&:disabled": {
                      bgcolor: "#E5E5EA",
                      color: "#86868B",
                    },
                  }}
                >
                  <ArrowUpwardRoundedIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
