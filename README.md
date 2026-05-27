# uid13/skills

Agent skills published by uid13.

## music

`music` is a Codex-compatible skill for searching, playing, and controlling online music from an agent chat. It uses Node.js to search for songs via `yt-dlp`, and `mpv` to play streams in the background.

The skill does not download songs. Songs are played via YouTube video page URLs passed directly to `mpv`, which internally uses its `ytdl-hook` to resolve a fresh audio stream at playback time. This avoids temporary stream URL expiry and YouTube bot detection issues.

**Key features:**
- Cross-platform: Windows / macOS / Linux
- `--outfile` async mode for non-blocking playback in AI agent shells
- Persistent executable path cache to avoid repeated PATH scans
- Optional `MUSIC_SKIP_DEPS=1` to skip dependency checks when yt-dlp/mpv are known to be installed

## Install

Install with GitHub CLI:

```bash
gh skill install uid13/skills
```

Install with skills.sh:

```bash
npx skills add uid13/skills
```

Pin a specific release:

```bash
gh skill install uid13/skills music --pin v1.2.0
```

## Requirements

- Node.js
- `mpv`
- `yt-dlp`

On Windows, one possible install command is:

```bash
winget install yt-dlp mpv
```

## Usage

Play a single song (async `--outfile` mode, recommended for AI agent shells):

```bash
# Windows (pwsh)
Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","Numb","--outfile","$env:TEMP\music_out.json" -WindowStyle Hidden -PassThru

# Linux / macOS
node "$skillDir/scripts/music.js" play "Numb" --outfile "/tmp/music_out.json" &
```

After running the command, wait ~10 seconds then read the output file:

```bash
# Windows
Get-Content "$env:TEMP\music_out.json"

# Linux / macOS
cat /tmp/music_out.json
```

Play songs by an artist:

```bash
# Windows (pwsh)
Start-Process node -ArgumentList "$skillDir/scripts/music.js","play","周杰伦","--artist","--count","5","--outfile","$env:TEMP\music_out.json" -WindowStyle Hidden -PassThru

# Linux / macOS
node "$skillDir/scripts/music.js" play "周杰伦" --artist --count 5 --outfile "/tmp/music_out.json" &
```

Playback controls (these commands return quickly, no `--outfile` needed):

```bash
node "$skillDir/scripts/music.js" pause
node "$skillDir/scripts/music.js" resume
node "$skillDir/scripts/music.js" next
node "$skillDir/scripts/music.js" stop
node "$skillDir/scripts/music.js" status
```

## Links

- Repository: https://github.com/uid13/skills
- skills.sh: https://www.skills.sh/uid13/skills
- Music skill: https://www.skills.sh/uid13/skills/music

## License

MIT
