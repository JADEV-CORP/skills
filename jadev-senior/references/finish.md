# Finish

Land the work and leave the machine and the repo as clean as you found them.

## Before handing over

1. Run both review passes (`references/review.md`) on the whole branch diff against its base.
2. Run full verification (`references/verify.md`) on the final commit.
3. Ask the user how to land it: open a pull request, merge locally, or keep the branch for later. Do not commit, push or merge without their go unless the approved plan covers that step.
4. Write the pull request with the repo's template. Link pipelines and work items with descriptive text.

## Clean up

Check first with `git status --short` and `git status --ignored`. Remove only what you created and what can be rebuilt.

- **Build output:** .NET `bin/`, `obj/`, `TestResults/`. TypeScript `dist/`, `build/`, `coverage/`, `.turbo/`, `.next/`. Python `__pycache__/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `build/`, `dist/`, `*.egg-info/`.
- Delete those folders by name. Avoid `git clean -fdX` or `-fdx` as a shortcut: ignored files include local `.env` files, certificates and other things nobody can rebuild.
- **Temporary code:** debug logging, flags turned on for testing, scratch files, test data you inserted.
- **Worktrees:** `git worktree list`. Remove the ones that will not be used again with `git worktree remove <path>`, then `git worktree prune`. Ask first when a worktree has uncommitted work.
- **Branches:** delete local branches only when merged (`git branch --merged <base>`). Remove remote branches after merge if the platform does not do it.
- **Processes:** stop dev servers, containers (`docker ps`), port forwards and watchers you started.
- **Dependencies:** keep `node_modules` and virtual environments in the working copy unless the user asks, since rebuilding them costs time. Remove the ones you created in temporary folders.

## Handover

Use the report block from `SKILL.md`. Add the pull request link, follow-ups with an owner where known, and every point you could not verify.
