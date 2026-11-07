# Seamless Wraps

Hard wrap your prose however you like,
and choose which wraps Reading view
should join without a space.

With **Strict line breaks** turned on,
Reading view joins hard-wrapped lines
into a single paragraph,
but it always puts a space where each wrap was.
That's right after most words,
but wrong after an em dash or an ellipsis:

```markdown
I love—
love doesn't go far enough—
writing in Obsidian.
```

Without this plugin
that renders as "I love— love doesn't go far enough— writing in Obsidian."
With it, the wraps after the dashes disappear:
"I love—love doesn't go far enough—writing in Obsidian."

This plugin does not modify your notes.
It only changes how Reading view (and PDF export) renders them.

## Rules

Each rule has two JavaScript regular expressions:

- **Line ends with** is tested against the end of the wrapped line.
- **Next line starts with** is tested against the start of the line after it.

When both match,
the wrap is removed along with any spaces around it.
A pattern left empty matches anything,
but each rule needs at least one pattern.
If any enabled rule matches,
the lines are joined.

The default rules:

| Line ends with | Next line starts with |
| -------------- | --------------------- |
| `—\|---`       |                       |
| `…\|\.\.\.`    |                       |

The ASCII forms (`---` and `...`) are included
so the rules work whether or not another plugin
(such as [Replace on Render](https://github.com/ZaneMeyers/obsidian-replace-on-render))
turns them into — and … first.

Rules can be added, edited, disabled,
and deleted in the settings.
Invalid patterns are marked there and ignored.

## What is never joined

- Wraps inside code blocks, inline code, and math.
- Hard line breaks (two trailing spaces or a trailing `\`).
- Separate paragraphs, list items, headings, and table cells.

Formatting doesn't get in the way:
a line ending in `*wait…*` or `[a link—](…)`
is matched on its visible text.

## Requirements

**Settings → Editor → Strict line breaks** must be on.
With it off,
Reading view already renders every wrap as a line break,
so there's no space to remove.

The editor (Source mode and Live Preview) is not affected.
Obsidian Publish does not run community plugins,
so published pages are not affected either.

## Development

```bash
npm install
npm run dev    # watch build
npm run build  # type-check + production build
npm run lint
```
