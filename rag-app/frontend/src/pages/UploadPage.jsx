import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  ButtonBase,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Stack,
  Tooltip,
  Fade,
  Avatar,
  TextField,
  CircularProgress,
  Grid,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import Navbar from "../components/Navbar";
import {
  uploadDocument,
  uploadTextDocument,
  uploadUrlDocument,
  listDocuments,
  deleteDocument,
} from "../api";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
];

const UPLOAD_MODES = [
  { id: "files", label: "Files", icon: <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} /> },
  { id: "text", label: "Paste Text", icon: <NotesRoundedIcon sx={{ fontSize: 16 }} /> },
  { id: "url", label: "Web Link", icon: <LanguageRoundedIcon sx={{ fontSize: 16 }} /> },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("files");
  const [docs, setDocs] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [webUrl, setWebUrl] = useState("");

  const refresh = useCallback(() => {
    listDocuments()
      .then(setDocs)
      .catch(() =>
        setStatus({
          type: "error",
          msg: "Cannot connect to backend server on port 8000.",
        })
      );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const processFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (selected.length === 0) return;

    const initialQueue = selected.map((file, idx) => {
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const valid = ALLOWED_EXTENSIONS.includes(ext);
      return {
        id: `${Date.now()}-${idx}`,
        file,
        name: file.name,
        state: valid ? "pending" : "error",
        detail: valid ? "Waiting…" : `Unsupported (${ext})`,
      };
    });

    setQueue(initialQueue);
    setUploading(true);
    setStatus(null);

    let successCount = 0;

    for (const item of initialQueue) {
      if (item.state === "error") continue;

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, state: "uploading", detail: "Processing…" } : q))
      );

      try {
        await uploadDocument(item.file);
        successCount += 1;
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, state: "done", detail: "Ready" } : q))
        );
        await refresh();
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, state: "error", detail: err.message || "Failed" } : q
          )
        );
      }
    }

    setUploading(false);

    if (successCount > 0) {
      setStatus({
        type: "success",
        msg:
          successCount === 1
            ? "1 document added to your workspace."
            : `${successCount} documents added to your workspace.`,
      });
    }
  };

  const handleTextSubmit = async () => {
    if (!noteContent.trim() || uploading) return;
    setUploading(true);
    setStatus(null);
    try {
      const doc = await uploadTextDocument(noteTitle.trim() || "Note.txt", noteContent);
      setNoteTitle("");
      setNoteContent("");
      setStatus({ type: "success", msg: `"${doc.fileName}" added to your workspace.` });
      await refresh();
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!webUrl.trim() || uploading) return;
    setUploading(true);
    setStatus(null);
    try {
      const doc = await uploadUrlDocument(webUrl.trim());
      setWebUrl("");
      setStatus({ type: "success", msg: `"${doc.fileName}" imported into your workspace.` });
      await refresh();
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!uploading) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d.documentId !== id));
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflowY: "auto",
        bgcolor: "#F5F5F7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar
        icon={<AutoStoriesRoundedIcon sx={{ fontSize: 18 }} />}
        title="Workspace"
        actions={
          <Button
            variant="contained"
            size="small"
            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => navigate("/chat")}
            sx={{
              bgcolor: "#0071E3",
              "&:hover": { bgcolor: "#0077ED" },
            }}
          >
            Open Assistant
          </Button>
        }
      />

      {/* Full-Width Side-by-Side Workspace */}
      <Box sx={{ flex: 1, width: "100%", px: { xs: 2.5, md: 4, lg: 5 }, py: { xs: 3, md: 4 } }}>
        <Grid container spacing={3.5} alignItems="flex-start">
          {/* LEFT PANEL: Add Knowledge + Active Upload Queue */}
          <Grid size={{ xs: 12, md: 5, lg: 5 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: "20px",
                bgcolor: "#FFFFFF",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1.5}
                mb={2.5}
              >
                <Box>
                  <Typography variant="h5" color="text.primary">
                    Add Knowledge
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Upload files, paste notes, or import links
                  </Typography>
                </Box>

                {/* Apple Segmented Control */}
                <Box
                  sx={{
                    display: "inline-flex",
                    bgcolor: "rgba(118, 118, 128, 0.12)",
                    p: "3px",
                    borderRadius: "980px",
                  }}
                >
                  {UPLOAD_MODES.map((m) => {
                    const active = mode === m.id;
                    return (
                      <ButtonBase
                        key={m.id}
                        onClick={() => {
                          setMode(m.id);
                          setStatus(null);
                        }}
                        sx={{
                          px: 1.75,
                          py: 0.6,
                          borderRadius: "980px",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                          fontSize: 12.5,
                          fontWeight: active ? 600 : 500,
                          color: active ? "#1D1D1F" : "#86868B",
                          bgcolor: active ? "#FFFFFF" : "transparent",
                          boxShadow: active ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "none",
                          transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                        }}
                      >
                        {m.icon}
                        {m.label}
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Stack>

              {/* Mode 1: Multi-File Upload */}
              {mode === "files" && (
                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => !uploading && document.getElementById("file-input").click()}
                  sx={{
                    border: "1.5px dashed",
                    borderColor: dragging ? "#0071E3" : "#D2D2D7",
                    borderRadius: "16px",
                    p: { xs: 3, md: 4 },
                    textAlign: "center",
                    bgcolor: dragging ? "#E8F2FF" : "#F5F5F7",
                    transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    cursor: uploading ? "default" : "pointer",
                    "&:hover": {
                      borderColor: "#0071E3",
                      bgcolor: "#E8F2FF",
                    },
                  }}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    hidden
                    onChange={(e) => {
                      processFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "14px",
                      bgcolor: "#FFFFFF",
                      color: "#0071E3",
                      mx: "auto",
                      mb: 1.75,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <CloudUploadRoundedIcon sx={{ fontSize: 26 }} />
                  </Avatar>

                  <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                    {dragging ? "Drop files to upload" : "Drag and drop files here"}
                  </Typography>

                  <Typography color="text.secondary" fontSize={13} mb={2}>
                    Select one or multiple files at once
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.6}
                    justifyContent="center"
                    flexWrap="wrap"
                    useFlexGap
                    mb={2.5}
                  >
                    {["PDF", "DOCX", "TXT", "MD", "CSV", "JSON", "PNG / JPG"].map((fmt) => (
                      <Chip
                        key={fmt}
                        label={fmt}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          bgcolor: "#FFFFFF",
                          color: "#86868B",
                        }}
                      />
                    ))}
                  </Stack>

                  <Button
                    variant="contained"
                    disabled={uploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("file-input").click();
                    }}
                    sx={{
                      bgcolor: "#0071E3",
                      "&:hover": { bgcolor: "#0077ED" },
                    }}
                  >
                    {uploading ? "Uploading Files…" : "Choose Files"}
                  </Button>
                </Box>
              )}

              {/* Mode 2: Paste Text */}
              {mode === "text" && (
                <Stack spacing={2}>
                  <TextField
                    label="Title"
                    placeholder="e.g. Meeting Notes or Product Specs"
                    fullWidth
                    size="small"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    disabled={uploading}
                  />
                  <TextField
                    label="Content"
                    placeholder="Paste or type your text content here…"
                    fullWidth
                    multiline
                    minRows={6}
                    maxRows={12}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    disabled={uploading}
                  />
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      disabled={!noteContent.trim() || uploading}
                      onClick={handleTextSubmit}
                      sx={{ bgcolor: "#0071E3", "&:hover": { bgcolor: "#0077ED" } }}
                    >
                      {uploading ? "Saving…" : "Save to Workspace"}
                    </Button>
                  </Box>
                </Stack>
              )}

              {/* Mode 3: Web Link */}
              {mode === "url" && (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Enter any public webpage or article URL to extract and index its text.
                  </Typography>
                  <TextField
                    placeholder="https://example.com/article"
                    fullWidth
                    size="small"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    disabled={uploading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleUrlSubmit();
                      }
                    }}
                  />
                  {uploading && <LinearProgress sx={{ borderRadius: 980 }} />}
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      disabled={!webUrl.trim() || uploading}
                      onClick={handleUrlSubmit}
                      sx={{ bgcolor: "#0071E3", "&:hover": { bgcolor: "#0077ED" } }}
                    >
                      {uploading ? "Importing…" : "Import URL"}
                    </Button>
                  </Box>
                </Stack>
              )}

              {status && (
                <Fade in>
                  <Alert
                    severity={status.type}
                    onClose={() => setStatus(null)}
                    icon={status.type === "success" ? <CheckCircleRoundedIcon fontSize="inherit" /> : undefined}
                    sx={{ mt: 2, borderRadius: "14px" }}
                  >
                    {status.msg}
                  </Alert>
                </Fade>
              )}
            </Paper>

            {/* Upload Queue Panel (Side-by-Side Grid inside Left Column) */}
            {queue.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  mt: 2.5,
                  p: 2.5,
                  borderRadius: "20px",
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="caption" fontWeight={600} color="#86868B" textTransform="uppercase">
                    Upload Queue ({queue.length})
                  </Typography>
                  {!uploading && (
                    <Button size="small" onClick={() => setQueue([])} sx={{ fontSize: 12, minWidth: 0, px: 1 }}>
                      Clear
                    </Button>
                  )}
                </Stack>
                <Grid container spacing={1}>
                  {queue.map((item) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.5,
                          py: 1,
                          borderRadius: "12px",
                          bgcolor: "#F5F5F7",
                        }}
                      >
                        {item.state === "uploading" && <CircularProgress size={15} thickness={5} />}
                        {item.state === "done" && (
                          <CheckCircleRoundedIcon sx={{ fontSize: 17, color: "#34C759", flexShrink: 0 }} />
                        )}
                        {item.state === "error" && (
                          <ErrorOutlineRoundedIcon sx={{ fontSize: 17, color: "#FF3B30", flexShrink: 0 }} />
                        )}
                        {item.state === "pending" && (
                          <InsertDriveFileOutlinedIcon sx={{ fontSize: 17, color: "#86868B", flexShrink: 0 }} />
                        )}
                        <Typography variant="caption" fontWeight={600} color="text.primary" flex={1} noWrap>
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 11,
                            flexShrink: 0,
                            color:
                              item.state === "error"
                                ? "#FF3B30"
                                : item.state === "done"
                                ? "#248A3D"
                                : "#86868B",
                          }}
                        >
                          {item.detail}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Grid>

          {/* RIGHT PANEL: Full-Space Side-by-Side Document Library Grid */}
          <Grid size={{ xs: 12, md: 7, lg: 7 }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: "20px",
                bgcolor: "#FFFFFF",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                minHeight: 420,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Box>
                  <Typography variant="h5" color="text.primary">
                    Library
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {docs.length === 0
                      ? "No documents uploaded yet"
                      : `${docs.length} ${docs.length === 1 ? "document" : "documents"} ready for chat`}
                  </Typography>
                </Box>
                {docs.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => navigate("/chat")}
                    sx={{
                      borderColor: "rgba(0, 0, 0, 0.12)",
                      color: "#1D1D1F",
                      "&:hover": { bgcolor: "#F5F5F7", borderColor: "rgba(0, 0, 0, 0.22)" },
                    }}
                  >
                    Ask Assistant
                  </Button>
                )}
              </Stack>

              {docs.length === 0 ? (
                <Box
                  sx={{
                    py: 10,
                    textAlign: "center",
                    borderRadius: "16px",
                    bgcolor: "#F5F5F7",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "14px",
                      bgcolor: "#E8F2FF",
                      color: "#0071E3",
                      mx: "auto",
                      mb: 1.5,
                    }}
                  >
                    <FolderOpenRoundedIcon sx={{ fontSize: 26 }} />
                  </Avatar>
                  <Typography variant="subtitle1" color="text.primary" mb={0.5}>
                    Your Library is Empty
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded files, notes, and links will appear here side by side.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {docs.map((doc) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={doc.documentId}>
                      <Paper
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          px: 2,
                          py: 1.5,
                          bgcolor: "#F5F5F7",
                          borderColor: "transparent",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                          "&:hover": {
                            bgcolor: "#FFFFFF",
                            borderColor: "rgba(0, 113, 227, 0.3)",
                            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
                            transform: "translateY(-1px)",
                          },
                        }}
                      >
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            bgcolor: "#E8F2FF",
                            color: "#0071E3",
                            flexShrink: 0,
                          }}
                        >
                          <DescriptionOutlinedIcon sx={{ fontSize: 19 }} />
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={600} fontSize={14} color="text.primary" noWrap>
                            {doc.fileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {doc.pages} {doc.pages === 1 ? "page" : "pages"}
                          </Typography>
                        </Box>
                        <Chip
                          label="Ready"
                          size="small"
                          sx={{
                            bgcolor: "#EAF9EE",
                            color: "#248A3D",
                            fontSize: 10.5,
                            height: 20,
                            flexShrink: 0,
                          }}
                        />
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(doc.documentId, e)}
                            sx={{ color: "#86868B", "&:hover": { color: "#FF3B30" } }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
