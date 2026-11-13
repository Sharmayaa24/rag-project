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
  Avatar,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import Navbar from "../components/Navbar";
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
    <Box sx={{ width: "100vw", height: "100vh", overflowY: "auto", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Navbar
        icon={<AutoStoriesRoundedIcon sx={{ fontSize: 20 }} />}
        title="RAG Knowledge Base"
        subtitle="Step 1: Upload PDFs into Qdrant Vector DB"
        actions={
          <Button variant="contained" color="primary" startIcon={<ChatRoundedIcon />} onClick={() => navigate("/chat")}>
            Go to AI Chat ({docs.length} PDFs)
          </Button>
        }
      />

      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 4, md: 6 } }}>
        <Stack spacing={1.5} alignItems="center" mb={4}>
          <Chip
            icon={<StorageRoundedIcon sx={{ fontSize: 15 }} />}
            label="Qdrant Vector Database Ingestion"
            size="small"
            sx={{ bgcolor: "primary.light", color: "primary.main", "& .MuiChip-icon": { color: "primary.main" } }}
          />
          <Typography variant="h4" textAlign="center" color="text.primary">
            Add Documents to Your{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              Vector Database
            </Box>
          </Typography>
          <Typography color="text.secondary" textAlign="center" maxWidth={540} fontSize={15} lineHeight={1.6}>
            Upload as many PDFs as you need. Each PDF is split into chunks, converted into
            768-dimensional vectors, and stored in Qdrant so you can ask questions across all
            of them together.
          </Typography>
        </Stack>

        <Paper
          variant="outlined"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && document.getElementById("file-input").click()}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "divider",
            borderRadius: 4,
            p: { xs: 4, md: 5 },
            textAlign: "center",
            bgcolor: dragging ? "primary.light" : "background.paper",
            transition: "all 0.2s ease",
            cursor: uploading ? "default" : "pointer",
            "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
          }}
        >
          <input
            id="file-input"
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => processFile(e.target.files[0])}
          />

          <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 2 }}>
            <CloudUploadRoundedIcon sx={{ fontSize: 34 }} />
          </Avatar>

          <Typography variant="h6" color="text.primary" mb={0.75}>
            {dragging ? "Release to embed PDF into Qdrant" : "Drop a PDF here to index into Qdrant"}
          </Typography>

          <Typography color="text.secondary" fontSize={13.5} mb={2.5}>
            PDF text is extracted page-by-page, embedded, and saved as vectors • Max 10 MB
          </Typography>

          <Button
            variant="contained"
            size="large"
            disabled={uploading}
            startIcon={<CloudUploadRoundedIcon />}
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById("file-input").click();
            }}
          >
            {uploading ? "Converting to Vectors…" : "Choose PDF File"}
          </Button>
        </Paper>

        {uploading && (
          <Box mt={2.5}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1}>
              Extracting pages • Generating 768-dim vectors • Upserting Points into Qdrant…
            </Typography>
          </Box>
        )}

        {status && (
          <Fade in>
            <Alert
              severity={status.type}
              onClose={() => setStatus(null)}
              icon={status.type === "success" ? <CheckCircleRoundedIcon fontSize="inherit" /> : undefined}
              sx={{ mt: 2.5, borderRadius: 3 }}
            >
              {status.msg}
            </Alert>
          </Fade>
        )}

        {docs.length > 0 && (
          <Box mt={5}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: 3,
                bgcolor: "primary.light",
                borderColor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                  Ready to Chat Across All {docs.length} Indexed PDFs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Qdrant currently holds <strong>{totalChunks} vector chunks</strong> from{" "}
                  <strong>{totalPages} total pages</strong>. Ask any question and all documents
                  are searched automatically.
                </Typography>
              </Box>
              <Button variant="contained" size="large" startIcon={<ChatRoundedIcon />} onClick={() => navigate("/chat")}>
                Open AI Chat →
              </Button>
            </Paper>

            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" mb={1.5}>
              Sources Stored in Qdrant ({docs.length})
            </Typography>

            <Stack spacing={1}>
              {docs.map((doc) => (
                <Paper
                  key={doc.documentId}
                  variant="outlined"
                  sx={{ borderRadius: 2.5, px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.75 }}
                >
                  <DescriptionOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} fontSize={14} color="text.primary" noWrap>
                      {doc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.pages} pages • {doc.chunks} vectors stored in Qdrant
                    </Typography>
                  </Box>
                  <Chip
                    label="Indexed in Qdrant"
                    size="small"
                    sx={{ bgcolor: "secondary.light", color: "secondary.dark", fontSize: 11, height: 22 }}
                  />
                  <Tooltip title="Remove this document's vectors from Qdrant">
                    <IconButton size="small" color="error" onClick={(e) => handleDelete(doc.documentId, e)}>
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
