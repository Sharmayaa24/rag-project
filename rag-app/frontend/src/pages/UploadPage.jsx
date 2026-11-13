import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Stack,
  Tooltip,
  Fade,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import { uploadDocument, listDocuments, deleteDocument } from "../api";

export default function UploadPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);

  const refresh = useCallback(() => {
    listDocuments()
      .then(setDocs)
      .catch(() =>
        setStatus({
          type: "error",
          msg: "Cannot connect to backend on port 8000. Is it running?",
        })
      );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!uploading) {
      setProgress(0);
      return;
    }
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 3, 90));
    }, 300);
    return () => clearInterval(timer);
  }, [uploading]);

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", msg: "Please select a valid PDF file." });
      return;
    }
    setUploading(true);
    setStatus(null);
    try {
      const doc = await uploadDocument(file);
      setProgress(100);
      setStatus({
        type: "success",
        msg: `"${doc.fileName}" converted to ${doc.chunks} vectors from ${doc.pages} pages and stored in Qdrant.`,
      });
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
    processFile(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d.documentId !== id));
  };

  const totalPages = docs.reduce((sum, d) => sum + (d.pages || 0), 0);
  const totalChunks = docs.reduce((sum, d) => sum + (d.chunks || 0), 0);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflowY: "auto",
        bgcolor: "#fbfbfe",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navigation */}
      <Box
        sx={{
          bgcolor: "#ffffff",
          borderBottom: "1px solid #e4e4e7",
          px: 4,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
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
            <AutoStoriesRoundedIcon sx={{ color: "#ffffff", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize={17} letterSpacing={-0.4} color="#18181b">
              RAG Knowledge Base
            </Typography>
            <Typography fontSize={11.5} color="#71717a">
              Step 1: Upload PDFs into Qdrant Vector DB
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<ChatRoundedIcon />}
          onClick={() => navigate("/chat")}
          sx={{
            bgcolor: "#7c3aed",
            borderRadius: 2.5,
            px: 3,
            py: 1,
            fontWeight: 700,
            fontSize: 14,
            textTransform: "none",
            boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
            "&:hover": { bgcolor: "#6d28d9" },
          }}
        >
          Go to AI Chat ({docs.length} PDFs)
        </Button>
      </Box>

      {/* Main Container */}
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 4, md: 6 } }}>
        {/* Hero Section */}
        <Stack spacing={1.5} alignItems="center" mb={4}>
          <Chip
            icon={<StorageRoundedIcon sx={{ fontSize: 15 }} />}
            label="Qdrant Vector Database Ingestion"
            size="small"
            sx={{
              bgcolor: "#ede9fe",
              color: "#7c3aed",
              fontWeight: 700,
              fontSize: 12,
              "& .MuiChip-icon": { color: "#7c3aed" },
            }}
          />
          <Typography
            variant="h4"
            fontWeight={900}
            textAlign="center"
            letterSpacing={-0.8}
            color="#18181b"
          >
            Add Documents to Your{" "}
            <Box component="span" sx={{ color: "#7c3aed" }}>
              Vector Database
            </Box>
          </Typography>
          <Typography
            color="#71717a"
            textAlign="center"
            maxWidth={540}
            fontSize={15}
            lineHeight={1.6}
          >
            Upload as many PDFs as you need. Each PDF is split into chunks, converted into
            768-dimensional vectors, and stored in Qdrant so you can ask questions across all
            of them together.
          </Typography>
        </Stack>

        {/* Upload Card / Dropzone */}
        <Paper
          elevation={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && document.getElementById("file-input").click()}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "#7c3aed" : "#d4d4d8",
            borderRadius: 4,
            p: { xs: 4, md: 5 },
            textAlign: "center",
            bgcolor: dragging ? "#faf5ff" : "#ffffff",
            transition: "all 0.2s ease",
            cursor: uploading ? "default" : "pointer",
            "&:hover": {
              borderColor: "#7c3aed",
              bgcolor: "#faf5ff",
            },
          }}
        >
          <input
            id="file-input"
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => processFile(e.target.files[0])}
          />

          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "#ede9fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
              color: "#7c3aed",
            }}
          >
            <CloudUploadRoundedIcon sx={{ fontSize: 34 }} />
          </Box>

          <Typography fontWeight={700} fontSize={18} color="#18181b" mb={0.75}>
            {dragging ? "Release to embed PDF into Qdrant" : "Drop a PDF here to index into Qdrant"}
          </Typography>

          <Typography color="#71717a" fontSize={13.5} mb={2.5}>
            PDF text is extracted page-by-page, embedded, and saved as vectors • Max 10 MB
          </Typography>

          <Button
            variant="contained"
            size="large"
            disabled={uploading}
            startIcon={<CloudUploadRoundedIcon />}
            sx={{
              bgcolor: "#7c3aed",
              borderRadius: 2.5,
              px: 3.5,
              py: 1.1,
              fontSize: 14.5,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { bgcolor: "#6d28d9" },
            }}
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById("file-input").click();
            }}
          >
            {uploading ? "Converting to Vectors…" : "Choose PDF File"}
          </Button>
        </Paper>

        {/* Upload progress */}
        {uploading && (
          <Box mt={2.5}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "#ede9fe",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "#7c3aed",
                  borderRadius: 4,
                },
              }}
            />
            <Typography
              variant="caption"
              color="#71717a"
              display="block"
              textAlign="center"
              mt={1}
            >
              Extracting pages • Generating 768-dim vectors • Upserting Points into Qdrant…
            </Typography>
          </Box>
        )}

        {/* Alerts / Status */}
        {status && (
          <Fade in>
            <Alert
              severity={status.type}
              onClose={() => setStatus(null)}
              icon={
                status.type === "success" ? (
                  <CheckCircleRoundedIcon fontSize="inherit" />
                ) : undefined
              }
              sx={{ mt: 2.5, borderRadius: 3 }}
            >
              {status.msg}
            </Alert>
          </Fade>
        )}

        {/* Indexed Vector Database Summary */}
        {docs.length > 0 && (
          <Box mt={5}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: 3,
                bgcolor: "#f5f3ff",
                border: "1px solid #ddd6fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography fontWeight={800} fontSize={16} color="#18181b">
                  Ready to Chat Across All {docs.length} Indexed PDFs
                </Typography>
                <Typography fontSize={13} color="#52525b">
                  Qdrant currently holds <strong>{totalChunks} vector chunks</strong> from{" "}
                  <strong>{totalPages} total pages</strong>. No need to select a file—ask any
                  question and all documents are searched automatically.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<ChatRoundedIcon />}
                onClick={() => navigate("/chat")}
                sx={{
                  bgcolor: "#7c3aed",
                  borderRadius: 2.5,
                  px: 3,
                  py: 1.1,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#6d28d9" },
                }}
              >
                Open AI Chat →
              </Button>
            </Paper>

            <Typography
              fontSize={12}
              fontWeight={700}
              color="#71717a"
              textTransform="uppercase"
              letterSpacing={0.6}
              mb={1.5}
            >
              Sources Stored in Qdrant ({docs.length})
            </Typography>

            <Stack spacing={1}>
              {docs.map((doc) => (
                <Paper
                  key={doc.documentId}
                  elevation={0}
                  sx={{
                    border: "1px solid #e4e4e7",
                    borderRadius: 2.5,
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.75,
                    bgcolor: "#ffffff",
                  }}
                >
                  <DescriptionOutlinedIcon sx={{ color: "#7c3aed", fontSize: 22 }} />

                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} fontSize={14} color="#18181b" noWrap>
                      {doc.fileName}
                    </Typography>
                    <Typography fontSize={12} color="#71717a">
                      {doc.pages} pages • {doc.chunks} vectors stored in Qdrant
                    </Typography>
                  </Box>

                  <Chip
                    label="Indexed in Qdrant"
                    size="small"
                    sx={{
                      bgcolor: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 700,
                      fontSize: 11,
                      height: 22,
                    }}
                  />

                  <Tooltip title="Remove this document's vectors from Qdrant">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDelete(doc.documentId, e)}
                      sx={{
                        color: "#a1a1aa",
                        "&:hover": { color: "#ef4444" },
                      }}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
}
