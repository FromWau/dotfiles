---
name: video-analysis
description: Analyze a video (usually YouTube) by combining a timestamped transcript with frames pulled at the moments that matter, then produce a structured breakdown (summary, key ideas, what is shown on screen, takeaways). Use whenever the user wants to "analyze / summarize / break down / take notes on a video", pastes a youtube.com or youtu.be link, points at a transcript file, asks "what does this video say about X", or wants a video's ideas folded into a skill, doc, or notes. Also covers the tooling (yt-dlp download, ffmpeg frame extraction into labelled grids) and its limits (no audio transcription). Load even if the user only asks "can you analyze a video?".
---

# Video Analysis

Claude can't play video, but it can read images and text. A video is analyzed as **transcript (what is said) + sampled frames (what is shown)**, with the transcript deciding *where* to sample. Blind every-N-seconds sampling costs more and misses the moments that matter.

Work in the session scratchpad directory, never in the user's project.

## 1. Get the inputs

Two supported entry points:

- **The user gives a transcript file path.** Read it. Look inside it for the video URL (often a trailing `link: https://...` line). If there's no URL in the file, ask for it.
- **The user gives nothing yet, or only a link.** Ask for everything in one message:
  1. the path to the timestamped transcript file
  2. the video URL
  3. optional: the start and end timestamps of any sponsor segment, so it can be cut before analysis

Whenever you have to ask for something anyway, include the sponsor question (3) in the same message. Don't send a separate round trip just for it; if nothing else needs asking, detect the sponsor segment yourself (step 3).

  If they have no transcript, offer to fetch YouTube's own captions instead (auto-generated ones are rougher and some videos have none):
  ```bash
  yt-dlp --no-progress --skip-download --write-subs --write-auto-subs --sub-langs en --convert-subs srt -o 'subs.%(ext)s' '<url>'
  ```
  This fallback is unreliable: YouTube often answers the subtitle request with `HTTP Error 429: Too Many Requests` even when the video itself downloads fine. Use a single language (`en`, not `en.*`, which also pulls every auto-translated track). If it still fails, don't retry in a loop; ask the user to copy the transcript from YouTube ("...more" → "Show transcript") into a file.

Also find out the **goal** (summary, notes, extract code/commands, answer specific questions, compare against a skill). If the user didn't say, default to the structured breakdown in step 5 and don't block on asking.

Transcript format is usually YouTube's copy-paste: a `M:SS` line followed by a text line. Treat any `H:MM:SS` / `M:SS` line as a timestamp.

## 2. Check tools and fetch metadata

```bash
for t in ffmpeg ffprobe yt-dlp; do command -v "$t" >/dev/null || echo "missing: $t"; done
yt-dlp --print title --print channel --print duration_string '<url>'
```
If `yt-dlp` is missing, ask the user to install it (`pacman -S yt-dlp` on Arch). If the video is a talking head or podcast, the transcript alone is enough: skip steps 3 and 4.

## 3. Read the transcript and pick timestamps

**Cut the sponsor segment first.** It's an ad and only bloats the analysis. Use the user's timestamps if given; otherwise find it from explicit sponsor cues ("sponsor of today's video", "brought to you by", "thanks to X for sponsoring", a promo or discount code), including the segue sentence that leads into it (e.g. "But before you can create a product, you need a landing page..."). The segment ends where the video's own topic resumes. A mention of a link in the description is not a sponsor cue by itself: creators also point there for the repo, source files, or further reading, and those are worth keeping in the report as resources. Drop those lines from the transcript before outlining, sample no frames inside the range, and leave it out of the report entirely: no summary, no "skipped" note. Cut only the transcript, not the video file: removing a segment from the video (e.g. `yt-dlp --sponsorblock-remove`) shifts every later timestamp out of sync with the transcript.

Then read the remaining transcript and build an outline of sections. Choose timestamps where the **visual carries meaning**: deictic cues ("this card", "look at this", "compare these", "watch what happens"), before/after pairs, demos, slides, diagrams, code, and the final result. Aim for roughly 3 frames per minute; more for dense visual segments, none for talking-head stretches.

For before/after and "watch what happens" cues, sample **both states**. The after usually appears 3 to 8 s after the spoken cue, so a frame at the cue alone tends to catch only the before.

## 4. Download and extract frames

Video-only is enough since the transcript covers the audio; `--no-progress` keeps the output short:
```bash
cd <scratchpad> && yt-dlp --no-progress --no-playlist -f 'bv*[height<=1080][ext=mp4]/bv*[height<=1080]' -o 'video.%(ext)s' '<url>'
```
Then tile frames into labelled 2×2 grids with the bundled script (4 frames per image read = 4× fewer reads):
```bash
~/.claude/skills/video-analysis/scripts/frame-grids <scratchpad>/video.mp4 <scratchpad>/out 0:37 1:03 1:14 1:22 ...
```
Read every `out/grids/g*.png`. Each tile is stamped with its timestamp.

**Transcript timestamps lead or lag the visual.** If a frame shows the presenter's face or a transition instead of the thing being discussed, re-run for that moment at ±2 to 3 s. For a single important frame at full resolution:
```bash
ffmpeg -loglevel error -y -ss 3:25 -i video.mp4 -frames:v 1 frame.png
```

## 5. Report

Default structure, adjusted to the goal:

```markdown
# "<title>" by <channel> (<duration>)

**Core thesis:** one or two sentences.

## 1. <section> (<start> to <end>)
- key points, tied to what the frames show, with timestamps
...

## <goal-specific part>
e.g. takeaways, extracted code, answers, or a gap table against an existing skill
```

Rules:
- Cite timestamps so the user can jump to the moment.
- Say what the frames showed that the transcript alone doesn't (layouts, colors, the before/after difference).
- Don't claim to have seen moments you didn't sample; say "not sampled" when relevant.
- If the video points to its own resources (repo, source/Figma files, docs), list them under a short **Resources** heading. Sponsor links never go there.
- When comparing against a skill, load that skill first and present a table of what the video adds or contradicts, then offer to patch it.

## 6. Clean up

Once the report is delivered and any follow-up work that needs the frames (e.g. patching a skill) is done, delete the raw inputs. The user wants them gone by default; the report is the artifact, not the source files:
- the downloaded video, subtitles, and the `frames/` and `grids/` output in the scratchpad
- the raw transcript file the user provided (look at the path first and delete only that one file, never its directory)

Name each deleted path in the final message. If the user asks to keep something (e.g. "I still need the transcript"), skip that item.

## Limits to state when relevant

- No audio transcription tool is assumed; the transcript (user-provided or YouTube captions) is the only speech source. Whisper via `uv` is an option if the user wants it.
- Only sampled frames are seen; fast events between samples can be missed.
- Age-restricted, private, or members-only videos may fail to download with yt-dlp.
