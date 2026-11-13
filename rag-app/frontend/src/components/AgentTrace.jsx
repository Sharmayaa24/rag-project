import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Collapse,
  ListItemButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
} from "@mui/material";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export function AgentTraceCard({ trace }) {
  const [open, setOpen] = useState(false);
  if (!trace || trace.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", mb: 1 }}>
      <ListItemButton
        dense
        onClick={() => setOpen((o) => !o)}
        sx={{
          gap: 1,
          px: 1.75,
          py: 0.75,
          bgcolor: open ? "primary.light" : "background.paper",
        }}
      >
        <HubRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={600} color="text.primary" flex={1}>
          A2A Agent Collaboration ({trace.length} handoffs)
        </Typography>
        <Chip
          label="A2A/1.0"
          size="small"
          sx={{ height: 18, fontSize: 10, bgcolor: "primary.light", color: "primary.main" }}
        />
        {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
      </ListItemButton>

      <Collapse in={open}>
        <Stack
          spacing={1}
          sx={{ px: 2, py: 1.5, bgcolor: "background.default", borderTop: 1, borderColor: "divider" }}
        >
          {trace.map((step, idx) => (
            <Box
              key={idx}
              sx={{
                p: 1.25,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" mb={0.5}>
                <Typography variant="caption" fontWeight={700} color="primary.main">
                  {step.from}
                </Typography>
                <ArrowForwardRoundedIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                <Typography variant="caption" fontWeight={700} color="text.primary">
                  {step.to}
                </Typography>
                <Chip
                  icon={<BuildCircleOutlinedIcon sx={{ fontSize: 12 }} />}
                  label={step.tool}
                  size="small"
                  sx={{ height: 18, fontSize: 10, ml: "auto" }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                  {step.durationMs}ms
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                {step.summary}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

export function AgentCardDialog({ open, onClose, card }) {
  if (!card) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HubRoundedIcon color="primary" />
          <Typography variant="h6">{card.name}</Typography>
          <Chip label={card.protocol} size="small" color="primary" />
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {card.description}
        </Typography>

        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
          Registered Peer Agents ({card.agents?.length || 0})
        </Typography>
        <Stack spacing={1} mt={1} mb={2.5}>
          {card.agents?.map((a) => (
            <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {a.name}
                </Typography>
                <Chip label={a.id} size="small" sx={{ height: 20, fontSize: 10.5 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {a.role}
              </Typography>
            </Paper>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
          Connected Agent Tools ({card.skills?.length || 0})
        </Typography>
        <Stack spacing={1} mt={1}>
          {card.skills?.map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.25}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {s.name}
                </Typography>
                <Chip
                  label={s.id}
                  size="small"
                  sx={{ height: 20, fontSize: 10.5, bgcolor: "secondary.light", color: "secondary.dark" }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {s.description}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

