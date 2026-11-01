# free247editor

![License](https://img.shields.io/github/license/riecodes/free247editor?style=flat-square&color=green) ![Agent Skills](https://img.shields.io/badge/Agent-Skills-8A2BE2?style=flat-square) ![Claude Code](https://img.shields.io/badge/Claude%20Code-ready-D97757?style=flat-square&logo=anthropic&logoColor=white) ![Price](https://img.shields.io/badge/price-free-brightgreen?style=flat-square)

A free, open-source personal video editor that runs inside your AI coding agent: Claude Code,
Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot, Windsurf, and others that support
[Agent Skills](https://agentskills.io).

Drop in a raw video and say **"edit this"**. You get back a cut, captioned edit with motion
graphics, zoom-ins, and sound. Then give notes in plain words (English, Tagalog, Taglish),
the way you would to a human editor. Lasting notes become rules it follows on every
future edit, so it learns your style.

## Setup (once)

### One prompt

Open your agent in any folder (for example `claude` or `codex` in a terminal, or a new chat
in Cursor or Antigravity) and paste:

```text
Set up free247editor for me. Clone https://github.com/riecodes/free247editor.git into my
Documents folder (install Git first if it is missing, after asking me). Then follow the
"start" steps in its skill, .agents/skills/free247editor/SKILL.md: run node setup.mjs from
that folder, install anything it reports missing after asking me, help me choose free
transcription (a Groq key, which you get for me if you have browser tools such as Claude in
Chrome, or local faster-whisper), open the test video, and walk me through style setup. When
you finish, tell me the full path of the inbox folder and remind me to open my agent in the
free247editor folder from now on.
```

From then on, open your agent in the `free247editor` folder so it finds the skill. The
Claude desktop app works too: in its Code tab, pick Local and the folder.

### Step by step

1. **Get it.** `git clone https://github.com/riecodes/free247editor.git`, or use
   *Code > Download ZIP* on GitHub and unzip it.
2. **Open the folder in your agent.** In a terminal: `cd free247editor` then `claude` or
   `codex`. In Cursor, Antigravity, or Windsurf, open the folder as the workspace.
3. **Type `start`.** The agent checks your computer, installs what is missing (with your OK),
   renders a test video, and asks a few questions about your style.

## Editing

1. Put a raw video in the `inbox` folder, or drag it into the agent's chat.
2. Say **"edit this"**.
3. Watch the draft from `outbox`, say what to change, and repeat until you say "final".

Plain words are enough; every agent picks the skill from its description. You can also call
it by name: `/free247editor` in Claude Code and Cursor, `$free247editor` in Codex.

Vertical 9:16 for Reels, TikTok, and Shorts by default. Ask for a horizontal version for
YouTube and it gets its own framing and text placement.

## What it does

| | |
| --- | --- |
| Cuts | Removes dead air, breaths, false starts, and retakes |
| Captions | Word by word, bold key words, key-word pills, or subtitles, in your position and colors |
| Hook | Big text in the first 3 seconds, if you want it |
| Motion graphics | Animated cards, pop-up clips, and overlays (HyperFrames + GSAP) |
| Camera | Zoom-ins and reframing that keep your face clear |
| Color | Natural, warm, cool, black and white, or orange and teal |
| Sound | Sound effects and a music bed from files you put in `my-sounds` |
| Learning | Your notes are saved as rules in `my-rules.md` and applied every time |

## What you need

- **An AI coding agent that can run terminal commands**, such as Claude Code (paid Claude
  plan; Pro works, Max is better if you edit often), Codex, Cursor, Antigravity, Gemini CLI,
  GitHub Copilot agent mode, or Windsurf. Editing uses a lot of usage. Codex blocks internet
  in its sandbox by default, so approve network access when setup or transcription asks.
- **Node.js 22+, Git, FFmpeg, and Chrome.** Setup tells you what is missing and the agent can
  install it for you.
- **Transcription, free either way:** a free [Groq](https://console.groq.com/keys) key
  (fast, best for Taglish), or [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
  on your own computer (`pip install faster-whisper`, needs Python).
- About 1 GB of disk space.

Tested on Windows 11 with Claude Code (setup, test render, transcription, and the cutting
tools). The other agents read the same standard files but are not tested yet. The editing
engine is cross-platform, so macOS and Linux should work, but they are not tested yet either.

## Costs

The software is free. You pay only for your agent's plan. Groq's free tier covers normal
use. The agent will never call a paid service (ElevenLabs, Kie.ai, or others) without asking.

## How each agent finds it

The whole editor is one skill, `.agents/skills/free247editor/SKILL.md`, in the shared
Agent Skills folder that Codex, Cursor, Antigravity, Gemini CLI, GitHub Copilot, Windsurf,
and OpenCode read. Claude Code reads skills only from `.claude/skills/`, so a short copy
there points to the same file. `AGENTS.md`, which `CLAUDE.md` imports, tells every agent to
use the skill. Edit only `.agents/skills/free247editor/SKILL.md`; if you change its
description, copy the new one into `.claude/skills/free247editor/SKILL.md` too.

## Not included

- An exported CapCut project. You get the MP4 plus the editable HyperFrames project in
  `kit/video-projects/<name>`; open it in HyperFrames Studio with `npx hyperframes preview`.
- Stock music or footage. Bring your own into `my-sounds` and `inbox`.
- Posting. It never uploads your videos anywhere.

## Folders

```
free247editor/
  .agents/skills/    the free247editor skill: how your agent runs the editor
  .claude/skills/    pointer to that skill for Claude Code
  AGENTS.md          tells every agent to use the skill (CLAUDE.md imports it)
  setup.mjs          one-time setup (safe to re-run)
  tools/             free transcription and CapCut project export
  inbox/             your raw videos
  outbox/            drafts and finals
  my-style.md        your style (created at setup, stays private)
  my-rules.md        rules learned from your notes (stays private)
  my-sounds/         your music and sound effects
  kit/               the editing engine (installed by setup)
```

Your footage, renders, style, rules, and key are in `.gitignore` and never leave your computer.

## Updating the engine

Setup installs a pinned version of the engine. To move to a newer one, change `KIT_COMMIT` in
`setup.mjs`, move any projects you want to keep out of `kit/video-projects`, delete `kit/`, and
type `start` again. Your style, rules, inbox, and outbox are untouched.

## Credits

The editing engine is [Herk Edit Kit](https://github.com/nateherkai/herk-edit-kit) by
Nate Herk (MIT), built on [HyperFrames](https://github.com/heygen-com/hyperframes) and
[GSAP](https://gsap.com/). Setup downloads it from its own repository; it is not copied
here. The AI Automation Society brand assets inside that kit belong to their owner and are
not licensed for reuse.

free247editor is not affiliated with Nate Herk, HeyGen, or any of the AI agent makers.

## License

MIT. See [LICENSE](LICENSE).
