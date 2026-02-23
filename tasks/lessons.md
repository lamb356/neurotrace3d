# Lessons Learned

## Windows/Git Bash
- Never use cat heredoc for markdown files — use Node.js fs.writeFileSync()
- Shell heredocs + backticks/quotes = escaping nightmare on Windows

## NeuroMorpho.org API
- Archive name from API is mixed case, dableFiles path requires lowercase
- Always .toLowerCase() the archive before constructing SWC URLs
- POST search is more reliable than GET with Lucene syntax

## Vercel Monorepo
- Set rootDirectory to apps/web in project settings
- buildCommand: cd ../.. && pnpm build
- Framework: nextjs

## Context Management
- Skip scouting after first session — you already know the codebase
- If something fails for 5+ minutes, stop and try a different approach
- Don't waste context on agent report file I/O struggles
