# uid13/skills

Agent skills published by uid13.

## music

`music` is a Codex-compatible skill for searching, playing, and controlling online music from an agent chat. It uses Node.js to search for songs, `yt-dlp` to inspect candidates, and `mpv` to play streams in the background.

The skill does not download songs. Single-track playback prefers passing the video page URL to `mpv`, so mpv's `ytdl-hook` resolves a fresh audio stream when playback starts. Artist playlists still pre-resolve playable audio URLs before passing them to `mpv`.

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
gh skill install uid13/skills music --pin v1.0.0
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

Play a single song:

```bash
node "$skillDir/scripts/music.js" play "Numb"
node "$skillDir/scripts/music.js" play "孤勇者"
```

Play songs by an artist:

```bash
node "$skillDir/scripts/music.js" play "周杰伦" --artist --count 5
```

Playback controls:

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
