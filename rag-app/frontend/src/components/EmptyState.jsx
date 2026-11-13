import { Box, Avatar, Typography } from "@mui/material";

export default function EmptyState({ icon, title, description, children }) {
  return (
    <Box sx={{ my: "auto", textAlign: "center", py: 5, px: 2 }}>
      <Avatar
        sx={{
          width: 64,
          height: 64,
          bgcolor: "primary.light",
          color: "primary.main",
          mx: "auto",
          mb: 2.5,
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="h5" color="text.primary" mb={1}>
        {title}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        maxWidth={540}
        mx="auto"
        mb={children ? 3.5 : 0}
        lineHeight={1.6}
      >
        {description}
      </Typography>
      {children}
    </Box>
  );
}

