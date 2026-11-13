---
name: clean-code-and-design
description: >-
  Enforces clean UI/UX design, modular code structure, DRY principles (no repeated code),
  and strict use of built-in language and framework components (such as Material UI in React
  and standard library / Pydantic in Python). Activate whenever designing UI, writing new
  features, or refactoring frontend and backend code.
---

# Clean Code Structure, UI Design & Built-In Component Standards

Follow these architectural and design principles whenever creating, updating, or reviewing code in any language or framework.

---

## 1. Avoid Repeated Code (DRY Principle)

1. **Extract Reusable UI Components**:
   - If a UI pattern (header bar, card, alert banner, avatar badge, empty state, loading indicator) appears in more than one place, extract it into `src/components/` as a shared component with props.
   - Never copy-paste the same JSX/HTML block across multiple pages.
2. **Centralize API & Business Logic**:
   - Keep all HTTP/API calls in a single module (e.g., `src/api.js` or `src/services/`).
   - Extract repeated state logic (timers, file validation, polling) into custom hooks (`src/hooks/`) or shared utilities (`src/utils/`).
3. **Single Source of Truth for Constants & Config**:
   - Store colors, spacing, theme settings, and environment variables in a central theme or config file (`main.jsx` theme, `config.py`).

---

## 2. Use Built-In Language & Framework Components First

Always prefer built-in language features and installed UI/framework components over custom hand-rolled implementations:

### Frontend (React / Material UI / JavaScript)
- **Material UI (`@mui/material`)**:
  - Use built-in MUI layout and surface components (`Box`, `Container`, `Stack`, `Grid`, `Paper`, `Card`, `AppBar`, `Toolbar`, `Divider`) instead of raw `<div>` tags with custom CSS files.
  - Use MUI feedback & input components (`Button`, `IconButton`, `TextField`, `Chip`, `Alert`, `LinearProgress`, `CircularProgress`, `Collapse`, `Tooltip`, `Fade`, `Avatar`) with theme props (`color="primary"`, `variant="contained"`).
  - Define shared colors, typography, and border-radius once in `createTheme()` inside `main.jsx` and reference theme tokens (`bgcolor: "background.paper"`, `color: "primary.main"`, `color: "text.secondary"`) rather than hardcoding hex colors repeatedly.
- **JavaScript / ES6+ Built-ins**:
  - Use native array, string, and object methods (`map`, `filter`, `reduce`, `find`, `some`, `Intl`, `URLSearchParams`, `structuredClone`, `crypto.randomUUID()`).
- **React Built-ins**:
  - Use `useState`, `useEffect`, `useCallback`, `useMemo`, and `useRef` appropriately.

### Backend (Python / FastAPI / Node.js)
- **Python Standard Library**:
  - Use `pathlib.Path` for file paths, `datetime.now(timezone.utc)` for timestamps, `uuid.uuid4()` for IDs, `typing` / type hints, `dataclasses`, `collections`, and `functools`.
- **FastAPI & Pydantic Built-ins**:
  - Use Pydantic `BaseModel` and `Field` for request/response validation instead of manual `if` checks.
  - Use FastAPI `HTTPException`, `Depends`, `UploadFile`, `File`, and `CORSMiddleware`.

---

## 3. Clean Project & Code Structure

Organize code by clear responsibility so every file stays small, readable, and easy to maintain:

```text
frontend/src/
├── components/       # Shared, reusable UI components (Navbar, SourceCard, EmptyState)
├── pages/            # Route-level page views (UploadPage, ChatPage)
├── hooks/            # Custom React hooks (useElapsedTimer, useDocuments)
├── api.js            # Centralized API client functions
├── theme.js          # Centralized MUI theme configuration
├── App.jsx           # Router definitions only
└── main.jsx          # App entry point and ThemeProvider

backend/app/
├── config.py         # Environment variables and constants
├── schemas.py        # Pydantic request/response models
├── extract.py        # Document parsing logic
├── chunk.py          # Text chunking logic
├── providers.py      # AI model integrations (Ollama / Gemini)
├── store.py          # Vector database operations (Qdrant)
└── main.py           # FastAPI routes and middleware
```

---

## 4. UI/UX Design Standards

1. **Visual Hierarchy & Consistency**:
   - Maintain consistent padding, border-radius, and elevation across all cards, buttons, and inputs via the central theme.
   - Use clear typography hierarchy (`h4`/`h5` for titles, `subtitle1`/`body1` for content, `caption` for metadata).
2. **Responsive & Full-Viewport Layouts**:
   - Ensure pages adapt cleanly across mobile (`xs`), tablet (`sm`), and desktop (`md`/`lg`) breakpoints.
3. **Clear Interactive States**:
   - Every action (uploading, indexing, searching, deleting) must show immediate visual feedback (progress bars, disabled states during submission, clear error/success alerts).

