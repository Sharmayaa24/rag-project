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
  Stack,
  ListItemButton,
  Divider,
} from "@mui/material";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { UserMessage, BotMessage, ThinkingIndicator } from "../components/MessageList";
import { ask, listDocuments } from "../api";

const SESSIONS_STORAGE_KEY = "rag_chat_sessions_v1";
const ACTIVE_SESSION_KEY = "rag_active_session_id_v1";

const SUGGESTIONS = [
  "Summarize the main points",
  "What are the key takeaways?",
  "Compare the important topics",
  "Explain the core concepts simply",
];

function createEmptySession() {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "New Conversation",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function loadInitialSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip transient `isNew` flag on load so history renders immediately
        return parsed.map((s) => ({
          ...s,
          messages: (s.messages || []).map((m) => ({ ...m, isNew: false })),
        }));
      }
    }
  } catch {
    // ignore storage errors
  }
  return [createEmptySession()];
}

export default function ChatPage() {
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [sessions, setSessions] = useState(loadInitialSessions);
  const [activeId, setActiveId] = useState(() => {
    const savedId = localStorage.getItem(ACTIVE_SESSION_KEY);
    return savedId || "";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const activeSession =
    sessions.find((s) => s.id === activeId) || sessions[0] || createEmptySession();
  const messages = activeSession.messages || [];

  useEffect(() => {
    if (!activeId || !sessions.some((s) => s.id === activeId)) {
      if (sessions[0]) {
        setActiveId(sessions[0].id);
      }
    }
  }, [activeId, sessions]);

  // Persist sessions & active session ID to localStorage
  useEffect(() => {
    try {
      const cleanSessions = sessions.map((s) => ({
        ...s,
        messages: (s.messages || []).map(({ role, text }) => ({ role, text })),
      }));
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(cleanSessions));
      if (activeSession?.id) {
        localStorage.setItem(ACTIVE_SESSION_KEY, activeSession.id);
      }
    } catch {
      // ignore quota errors
    }
  }, [sessions, activeSession?.id]);

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
  }, [messages.length, busy, activeSession.id]);

  const handleNewChat = () => {
    if (busy) return;
    // If current session is already empty, just focus input
    if (messages.length === 0) {
      inputRef.current?.focus();
      return;
    }
    const fresh = createEmptySession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setError("");
    inputRef.current?.focus();
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptySession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeSession.id) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleSend = useCallback(
    async (textToSend) => {
      const q = (textToSend ?? question).trim();
      if (!q || busy) return;
      setQuestion("");
      setError("");

      const targetSessionId = activeSession.id;
      const previousHistory = messages.map(({ role, text }) => ({ role, text }));
      const userTurn = { role: "user", text: q };

      // Append user message and update session title if first message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          const nextMsgs = [...(s.messages || []), userTurn];
          const nextTitle =
            s.messages.length === 0
              ? q.length > 38
                ? `${q.slice(0, 38)}…`
                : q
              : s.title;
          return {
            ...s,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
            messages: nextMsgs,
          };
        })
      );

      setBusy(true);

      try {
        const response = await ask(q, null, previousHistory);
        const botTurn = {
          role: "bot",
          text: response.answer,
          isNew: true,
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  messages: [...(s.messages || []), botTurn],
                }
              : s
          )
        );
      } catch (err) {
        setError(err.message || "Failed to generate answer.");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [question, busy, activeSession.id, messages]
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
          <>
            <Tooltip title={sidebarOpen ? "Hide History" : "Show History"}>
              <IconButton
                size="small"
                onClick={() => setSidebarOpen((o) => !o)}
                sx={{
                  bgcolor: sidebarOpen ? "#E8F2FF" : "transparent",
                  color: sidebarOpen ? "#0071E3" : "#1D1D1F",
                }}
              >
                <HistoryRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon sx={{ fontSize: 17 }} />}
              onClick={handleNewChat}
              sx={{
                bgcolor: "#0071E3",
                "&:hover": { bgcolor: "#0077ED" },
              }}
            >
              New Chat
            </Button>
          </>
        }
      />

      {/* Main Split Body: History Sidebar + Chat Area */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden", width: "100%" }}>
        {/* Left Apple HIG Chat History Sidebar */}
        {sidebarOpen && (
          <Box
            sx={{
              width: { xs: 250, md: 280 },
              flexShrink: 0,
              borderRight: "1px solid rgba(0, 0, 0, 0.08)",
              bgcolor: "rgba(255, 255, 255, 0.72)",
              backdropFilter: "saturate(180%) blur(20px)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box sx={{ p: 2, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#86868B",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Chat History ({sessions.length})
              </Typography>
              <Button
                size="small"
                startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={handleNewChat}
                sx={{ fontSize: 12, px: 1.25, py: 0.25, color: "#0071E3" }}
              >
                New
              </Button>
            </Box>

            <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.06)" }} />

            <Stack spacing={0.5} sx={{ flex: 1, overflowY: "auto", p: 1.25 }}>
              {sessions.map((s) => {
                const selected = s.id === activeSession.id;
                const turnCount = (s.messages || []).length;
                return (
                  <ListItemButton
                    key={s.id}
                    selected={selected}
                    onClick={() => {
                      setActiveId(s.id);
                      setError("");
                    }}
                    sx={{
                      borderRadius: "12px",
                      px: 1.5,
                      py: 1.1,
                      gap: 1.25,
                      transition: "all 0.2s ease",
                      "&.Mui-selected": {
                        bgcolor: "#E8F2FF",
                        color: "#0071E3",
                        "&:hover": { bgcolor: "#DCEBFF" },
                      },
                    }}
                  >
                    <ChatBubbleOutlineRoundedIcon
                      sx={{
                        fontSize: 16,
                        color: selected ? "#0071E3" : "#86868B",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={selected ? 600 : 500}
                        color={selected ? "#0071E3" : "#1D1D1F"}
                        noWrap
                        sx={{ fontSize: 13.5 }}
                      >
                        {s.title || "New Conversation"}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 11, color: "#86868B" }}>
                        {turnCount === 0
                          ? "Empty chat"
                          : `${turnCount} ${turnCount === 1 ? "message" : "messages"}`}
                      </Typography>
                    </Box>
                    <Tooltip title="Delete conversation">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        sx={{
                          p: 0.4,
                          color: "#86868B",
                          opacity: selected ? 0.9 : 0.5,
                          "&:hover": { color: "#FF3B30", opacity: 1 },
                        }}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Right Conversation Canvas */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
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
            <Box
              sx={{
                maxWidth: 1040,
                width: "100%",
                mx: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {docs.length === 0 && isEmpty && (
                <EmptyState
                  icon={<DescriptionOutlinedIcon sx={{ fontSize: 28 }} />}
                  title="No Documents Yet"
                  description="Add a document to your workspace or type a question below."
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
                  <Grid container spacing={1.5} maxWidth={600} mx="auto">
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
                m.role === "user" ? (
                  <UserMessage key={`${activeSession.id}-${idx}`} text={m.text} />
                ) : (
                  <BotMessage key={`${activeSession.id}-${idx}`} m={m} />
                )
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

          {/* Apple Frosted-Glass Bottom Composer */}
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "saturate(180%) blur(20px)",
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              px: { xs: 2, sm: 3, md: 4 },
              py: 2,
            }}
          >
            <Box sx={{ maxWidth: 1040, width: "100%", mx: "auto" }}>
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
      </Box>
    </Box>
  );
}
