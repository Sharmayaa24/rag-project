# Workspace Rules

## Git Push Workflow (`push code`)

Whenever the user asks to push code (e.g., says "push code", "push to github", or similar):

1. **Ask Branch Choice First**:
   Always ask the user whether to push to the **current branch** or create a **new branch** (using `ask_question` with options: `Current branch` vs `Create a new branch (auto-named based on changes)`).
2. **Analyze Changes Automatically**:
   Inspect `git status` and `git diff` to understand all modified and added files.
3. **Auto-Create Branch (if "New branch" selected)**:
   Automatically generate a descriptive, kebab-case branch name based on the changes (e.g., `feat/multi-pdf-rag-ui`, `fix/qdrant-search`) and run `git checkout -b <branch-name>`.
4. **Auto-Generate Commit Message & Push**:
   - Stage changes (`git add .`), making sure `.env`, `.venv/`, `node_modules/`, and `qdrant_data/` are ignored.
   - Automatically craft a clear, descriptive commit message summarizing the changes (`git commit -m "<message>"`).
   - Push the branch to the remote repository (`git push -u origin <branch-name>`).
   - If `origin` remote is not yet configured, ask the user for the GitHub repository URL once and set it via `git remote add origin <url>`.

