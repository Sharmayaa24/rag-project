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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
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
          msg: "Cannot connect to backend server on port 8000.",
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
      setProgress((p) => Math.min(p + 4, 92));
    }, 280);
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
        msg: `"${doc.fileName}" is ready.`,
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

      <Container maxWidth="sm" sx={{ flex: 1, py: { xs: 5, md: 7 } }}>
        <Stack spacing={1} alignItems="center" mb={4.5}>
          <Typography variant="h4" textAlign="center">
            Documents
          </Typography>
          <Typography color="text.secondary" textAlign="center" maxWidth={420} fontSize={15}>
            Add PDF files to your workspace to ask questions and extract insights.
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
            border: "1.5px dashed",
            borderColor: dragging ? "#0071E3" : "#D2D2D7",
            borderRadius: "20px",
            p: { xs: 4, md: 5 },
            textAlign: "center",
            bgcolor: dragging ? "#E8F2FF" : "#FFFFFF",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
            transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
            cursor: uploading ? "default" : "pointer",
            "&:hover": {
              borderColor: "#0071E3",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
              transform: "translateY(-1px)",
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

          <Avatar
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              bgcolor: "#E8F2FF",
              color: "#0071E3",
              mx: "auto",
              mb: 2,
            }}
          >
            <CloudUploadRoundedIcon sx={{ fontSize: 28 }} />
          </Avatar>

          <Typography variant="h6" mb={0.5}>
            {dragging ? "Drop PDF to Upload" : "Drag and drop a PDF"}
          </Typography>

          <Typography color="text.secondary" fontSize={13.5} mb={2.75}>
            Up to 10 MB per document
          </Typography>

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
            {uploading ? "Uploading…" : "Choose File"}
          </Button>
        </Paper>

        {uploading && (
          <Paper
            variant="outlined"
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: "16px",
              bgcolor: "#FFFFFF",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                Processing document…
              </Typography>
              <Typography variant="caption" fontWeight={600} color="primary.main">
                {progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 980,
                bgcolor: "#F5F5F7",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 980,
                  bgcolor: "#0071E3",
                },
              }}
            />
          </Paper>
        )}

        {status && (
          <Fade in>
            <Alert
              severity={status.type}
              onClose={() => setStatus(null)}
              icon={status.type === "success" ? <CheckCircleRoundedIcon fontSize="inherit" /> : undefined}
              sx={{ mt: 2.5, borderRadius: "14px" }}
            >
              {status.msg}
            </Alert>
          </Fade>
        )}

        {docs.length > 0 && (
          <Box mt={4.5}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1.25,
                px: 0.5,
                fontWeight: 600,
                color: "#86868B",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Library
            </Typography>

            <Stack spacing={1.25}>
              {docs.map((doc) => (
                <Paper
                  key={doc.documentId}
                  variant="outlined"
                  sx={{
                    borderRadius: "16px",
                    px: 2,
                    py: 1.5,
                    bgcolor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
                    "&:hover": {
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
                    },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "#E8F2FF",
                      color: "#0071E3",
                    }}
                  >
                    <DescriptionOutlinedIcon sx={{ fontSize: 19 }} />
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} fontSize={14.5} color="text.primary" noWrap>
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
                      fontSize: 11,
                      height: 22,
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
              ))}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
}
