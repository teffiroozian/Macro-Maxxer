## Small-change behavior

For simple, narrowly scoped UI or styling changes:

- Make the smallest relevant edit.
- Do not run tests, builds, linters, formatters, or Git commands unless requested.
- Do not inspect unrelated files.
- Stop after making the change and summarize what changed.

## Development server protection

Do not stop, restart, kill, or replace the existing development server or terminal process.

- Assume `npm run dev` may already be running in a separate terminal.
- Do not run commands such as `pkill`, `kill`, `killall`, `lsof ... | xargs kill`, or anything that terminates the process using port 3000.
- Do not automatically start another development server.
- Make code changes and run non-destructive checks only.
- If testing requires the server and it is unavailable, report that instead of modifying terminal processes.
- Leave all user-started terminal sessions and background processes untouched.
