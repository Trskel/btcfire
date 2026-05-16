Update CHANGELOG.md with recent work. If no changelog exists, bootstrap it from git history.

## Workflow

1. **Read current state**

Run these commands to gather context:

```bash
# Check if CHANGELOG.md exists
[ -f CHANGELOG.md ] && echo "EXISTS" || echo "MISSING"

# Get today's date
date +%Y-%m-%d

# Get all commits on current branch not yet on main, grouped by date
git log main..HEAD --format="%ad %s" --date=short 2>/dev/null || git log --format="%ad %s" --date=short
```

2. **If CHANGELOG.md is MISSING — bootstrap from git history**

Read the full git log grouped by date:

```bash
git log --format="%ad|%s" --date=short --reverse
```

Create `CHANGELOG.md` with this structure:

```markdown
# Changelog

## YYYY-MM-DD

- Commit message one
- Commit message two

## YYYY-MM-DD

- Commit message three
```

Group commits under date headings (most recent date first). Use the commit subject as-is for each bullet. Skip merge commits.

3. **If CHANGELOG.md EXISTS — append new entries**

Read the existing CHANGELOG.md. Identify which commits are not yet reflected (compare the most recent date heading in the changelog against commits on the current branch).

Add a new date heading (today's date) at the top (below the `# Changelog` title) with bullets summarizing the work done. Write bullets as human-readable descriptions of what changed — not raw commit messages. Consolidate related commits into single bullets where appropriate.

If today's date heading already exists, append new bullets to it rather than duplicating the heading.

4. **Present the result**

Show the user the new/updated section of the changelog and confirm it looks right before finishing.

## Rules

- Date headings use `## YYYY-MM-DD` format, most recent first.
- Bullets should be concise, action-oriented (e.g., "Add mobile-first responsive layout to all specs").
- Skip trivial commits (typo fixes, merge commits) unless they're the only work.
- Never remove existing changelog entries.
- Do not commit the changelog — the user will commit it as part of their merge workflow.
