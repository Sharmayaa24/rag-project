import { AppBar, Toolbar, Box, Typography, Avatar, Stack } from "@mui/material";

export default function Navbar({ icon, title, subtitle, actions }) {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "saturate(180%) blur(20px)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 4 }, py: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: "0 2px 8px rgba(0, 113, 227, 0.28)",
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && <Stack direction="row" spacing={1.5} alignItems="center">{actions}</Stack>}
      </Toolbar>
    </AppBar>
  );
}
