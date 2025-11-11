# Notification Sounds (macOS only)

This directory contains notification sound files for the extension.

## Required Files

Add the following sound files to this directory:

- **complete.wav** - Main completion sound (recommended: pleasant chime or bell)
- **subtle.wav** - Quiet completion sound (recommended: soft click or pop)
- **notification.wav** - General notification sound (recommended: standard beep)

## How to Add Sounds

### Option 1: Use macOS System Sounds

Copy sounds directly from macOS:
```bash
# Navigate to the sounds directory
cd sounds/

# Copy system sounds
cp /System/Library/Sounds/Ping.aiff complete.wav
cp /System/Library/Sounds/Pop.aiff subtle.wav
cp /System/Library/Sounds/Glass.aiff notification.wav
```

Note: AIFF files work with afplay, so conversion to WAV is optional.

### Option 2: Download Free Sounds

Download from these free sources:

1. **Mixkit** - https://mixkit.co/free-sound-effects/
   - Search for "notification" or "bell"
   - No attribution required

2. **Freesound** - https://freesound.org/
   - Search for "notification chime"
   - Check license (most are CC-licensed)

3. **Notification Sounds** - https://notificationsounds.com/
   - Browse notification categories
   - Free downloads

## Sound Specifications

Supported formats (via macOS afplay):
- WAV, AIFF, MP3, M4A

Recommended specifications:
- **Sample Rate**: 44.1kHz
- **Duration**: 0.3-2 seconds
- **Volume**: Pre-normalized (not too loud)

## Fallback

If no sound files are present, the extension will automatically use `/System/Library/Sounds/Ping.aiff` as a fallback.
