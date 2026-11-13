# Workspace Rules

## Strict Git & GitHub Security Rules

1. **Single-Repository Lock (Strictly Enforced)**:
   - Only operate on this workspace's Git repository (`e:\Rag`) connected to `https://github.com/Sharmayaa24/rag-project.git`.
   - **NEVER** access, read, modify, pull from, or push to any other repository or remote URL.
   - Before any remote Git command, verify that `origin` is strictly `https://github.com/Sharmayaa24/rag-project.git`.

2. **Always Ask Permission Before Any Git Action**:
   - **NEVER** run `git pull`, `git fetch`, `git commit`, `git push`, `git checkout -b`, `git branch`, `git merge`, `git reset`, `git stash`, or `git remote` without asking the user for permission first.
   - Before performing any Git operation, use `ask_question` to show the user:
     - What action is about to run (e.g., pull, commit, create branch, push, merge)
     - Which branch is targeted (`Current branch` vs `New / another branch`)
     - The proposed branch name and commit message (when committing/pushing)
   - Wait for the user's explicit confirmation before running the command.

## Git Push Workflow (`push code`)

Whenever the user asks to push code (e.g., says "push code", "push to github", or similar):

1. **Inspect Changes (Read-Only)**:
   Check `git status` and `git diff` to see what files changed and prepare a proposed branch name and commit message.
2. **Ask Permission & Branch Choice (`ask_question`)**:
   Ask the user for permission to proceed and whether to push to:
   - `Current branch`
   - `Create a new branch (auto-named based on changes)`
   - `Cancel (do not run Git commands)`
3. **Execute Only After Approval**:
   - If "New branch" is approved: run `git checkout -b <branch-name>`.
   - Stage changes (`git add .`), ensuring `.env`, `.venv/`, `node_modules/`, and `qdrant_data/` remain ignored.
   - Commit (`git commit -m "<message>"`) and push (`git push -u origin <branch-name>`) strictly to `https://github.com/Sharmayaa24/rag-project.git`.
4. **Ask to Merge into `main` (After Pushing a New Branch)**:
   - Immediately after pushing a new branch, use `ask_question` to ask the user:
     - `Yes, merge <branch-name> into main and push main`
     - `No, keep on <branch-name> for now`
   - If the user approves merging into `main`:
     - Run `git checkout main`, `git pull origin main`, and `git merge <branch-name>`.
     - **If merge succeeds cleanly**: run `git push origin main` and report success.
     - **If merge conflicts occur**: DO NOT auto-resolve or force-push. Immediately run `git diff --name-only --diff-filter=U` to list the conflicted files, display the exact conflict blocks (`<<<<<<<`, `=======`, `>>>>>>>`) with clickable file links so the user can resolve them, and wait for the user's instructions.

## Git Pull Workflow (`pull code`)

Whenever the user asks to pull code (e.g., says "pull code", "git pull", or similar):

1. **Inspect Local State (Read-Only)**:
   Check `git status` and current branch name to see if there are any uncommitted local changes that could conflict.
2. **Ask Permission & Branch Choice (`ask_question`)**:
   Ask the user for permission to pull and which branch to pull from:
   - `Pull into current branch (origin/<current-branch>)`
   - `Switch/pull from another branch`
   - `Cancel (do not run Git commands)`
3. **Execute Only After Approval**:
   - Verify `origin` is `https://github.com/Sharmayaa24/rag-project.git`.
   - Run `git pull origin <branch-name>`.
   - **If pull/merge conflicts occur**: Show the conflicted files and conflict lines clearly so the user can resolve them.
