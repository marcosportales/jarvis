# Research: Echo cancellation so Jarvis doesn't hear its own Reply

Ticket: `.scratch/hands-free/issues/03-echo-cancellation.md` (on `wayfinder/hands-free`).
Researched 2026-10-15 against the Chromium source at tag `152.0.7977.130` (the Chromium inside the installed Electron 44.7.0), PipeWire 1.6.9 source and docs, the W3C Media Capture spec, and Electron's issue tracker.

## Answer in short

On Linux, `getUserMedia({ audio: true })` turns echo cancellation on by default. In current Chromium and Electron, that canceller uses as its reference **all audio the same browser instance plays to the same output device**, and that includes a plain `new Audio(blob)` and Web Audio. It does **not** cancel audio from other processes: other apps, the system, or the Jarvis page in Chrome and the Jarvis App in Electron cancelling each other. So the Reply as Jarvis plays it today is already in the AEC reference, in both Chrome and the Jarvis App, as long as capture and playback happen in the same app and playback goes to the default output.

AEC lowers echo a lot, but it does not guarantee zero residual. This machine has the worst setup for it: a Dell XPS 13 9305 with built-in speakers and a built-in mic a few cm apart. To meet the "never" hard limit, put a guard while Speaking on top of AEC, and keep half duplex as the fallback if hardware tests show leaks.

## The local machine (read-only inspection)

| Fact | Value | How seen |
|---|---|---|
| Hardware | Dell XPS 13 9305 laptop (chassis type 10) | `/sys/class/dmi/id/*` |
| Output | `alsa_output.pci-0000_00_1f.3.analog-stereo`, active port **Speakers** (headphones port "not available", so nothing plugged in) | `pactl list sinks` |
| Input | `alsa_input.pci-0000_00_1f.3.analog-stereo`, active port **Internal Microphone** | `pactl list sources` |
| Sound server | PulseAudio API on PipeWire 1.6.9 | `pactl info` |
| PipeWire echo-cancel | Module **installed** (`/usr/lib/pipewire-0.3/libpipewire-module-echo-cancel.so`, `spa-0.2/aec`, `webrtc-audio-processing-1 1.3`) but **not loaded**; no `~/.config/pipewire/` | `pw-cli ls Module`, `pacman -Q` |
| Electron | 44.7.0, which bundles Chrome/**152.0.7977.130** | `strings` on the binary |
| Chrome | google-chrome 155.0.8059.79 | `pacman -Q` |

## 1. What `echoCancellation: true` cancels in Chromium/Electron today

### On Linux the default is "Chrome-wide" AEC, and it covers HTMLAudioElement and Web Audio

- `getUserMedia({audio:true})` with no constraint sets the mode to `kBrowserDecides`, and audio processing defaults to on for microphone capture. Source: `third_party/blink/renderer/modules/mediastream/media_stream_constraints_util_audio.cc` (`SelectBestEcMode`, `GetDefaultValueForAudioProperties`).
- `kBrowserDecides` maps to `GetPreferredAec()`. That function returns platform AEC if the input device reports the `ECHO_CANCELLER` effect, otherwise **`kChromeWide`** if `IsChromeWideEchoCancellationEnabled()`, otherwise `kPeerConnection`. Source: `third_party/blink/renderer/platform/mediastream/media_stream_audio_processor_options.cc`.
  - The PulseAudio backend never reports `ECHO_CANCELLER`, so Linux has no platform AEC (`media/audio/pulse/audio_manager_pulse.cc`, `GetInputStreamParameters`).
  - `chrome_wide_echo_cancellation_supported = is_win || is_mac || is_linux`, with the comment *"since it requires the audio service to run in a separate process"* (`media/media_options.gni`). `kAudioServiceOutOfProcess` is enabled by default on Linux (`content/public/common/content_features.cc`).
  - `kChromeWideEchoCancellation` is `FEATURE_ENABLED_BY_DEFAULT`, with the comment: *"If echo cancellation for a mic signal is requested, mix and cancel all audio playback going to a specific output device in the audio service."* (`media/base/media_switches.cc`, lines 543–547).
- How it works: `services/audio/output_device_mixer.h` *"Manages mixing and rendering of all audio outputs going to a specific output device… If there is at least one listener connected, the mixer is mixing all the audio output and rendering the mix as a single audio output stream."* The mic's `InputController` taps that mix as its reference (`services/audio/input_controller.cc`, `output_tapper_`, `SetOutputDeviceForAec`). Every renderer output, `<audio>`/`new Audio()` and `AudioContext` alike, plays through an audio-service output stream, so all of them land in the mix.
- The older path, `kPeerConnection`, runs the processor in the renderer *"bound to the WebRTC audio device module"* (`processed_local_audio_source.cc`). There the reference was only RTCPeerConnection playout. That is where the folk wisdom "AEC ignores `<audio>`/Web Audio" comes from. It no longer applies on Linux desktop.

**Conclusion:** the current `new Audio(URL.createObjectURL(blob))` Reply is in the reference. Switching to Web Audio, for example to stream Kokoro, keeps it in the reference. This holds only if:
1. The Reply is played **by the same browser instance that holds the mic**. The audio service is per browser process: the Jarvis App (Electron) and the Jarvis page (Chrome) are separate, and neither cancels the other's audio.
2. Playback goes to the **same output device** the AEC listens to. That is the default device unless `setSinkId`/`AudioContext({sinkId})` or `SetOutputDeviceForAec` changes it. Jarvis uses the default for both today.
3. The mic track is open and processing **while** the Reply plays. Hands-free gives that for free. Today's code opens `getUserMedia` per hold, so it never overlaps.

### What it does not cancel

- Audio from other processes. On Linux, the "system loopback as AEC reference" path that cancels *all* system audio is compiled only for Win/Mac: `system_loopback_as_aec_reference_supported = (is_win || is_mac) && …` (`media/media_options.gni`).
- The spec's new `echoCancellation: "all"` ("MUST attempt to remove all sound being played by the system") and `"remote-only"` ([W3C mediacapture-main](https://w3c.github.io/mediacapture-main/)) are shipped (`GetUserMediaEchoCancellationModes: stable`, `runtime_enabled_features.json5`). On Linux, `"all"` needs platform AEC or system loopback, and neither exists there (`EchoCanceller::IsSystemWideAecAvailable`). So `"all"` is not offered on this machine. Use `true`, or leave it unset.
- Field evidence matches the source. [electron/electron#47043](https://github.com/electron/electron/issues/47043) ("echoCancellation does nothing in Electron but works in Chrome") was resolved as *"Chrome only cancels the system audio that Chrome itself is playing"*. An Electron maintainer confirmed that audio played from Chrome is cancelled and audio from Firefox is not. Electron's `shell/browser/feature_list.cc` (v44.7.0) disables no audio or AEC features.

### Recent changes: Chrome and Electron can differ

- Chromium carries a neural residual-echo estimator behind `kWebRtcAudioNeuralResidualEchoEstimation`. It is `DISABLED_BY_DEFAULT` in source, and it needs Chrome-wide AEC (`media_switches.cc`, `IsAudioProcessMlModelUsageEnabled`). A [webrtcHacks post (2026-10-06)](https://webrtchacks.com/chrome-neural-echo-cancellation/) reports that Google Chrome turns it on by default and delivers the model through Chrome's ML model service. It also reports that Electron and Edge "get nothing". The post measures far-end-only suppression improving from about 19.8 to 27 dB median. This is a secondary source; the part checked against source is the flag and its dependency. **Implication:** residual echo may be noticeably lower on the Jarvis page in Google Chrome than in the Jarvis App, which runs plain AEC3. Test both.

## 2. Linux: PipeWire's `libpipewire-module-echo-cancel`

- It creates a virtual **Echo-Cancel Source** (cleaned mic) and **Echo-Cancel Sink**. Only audio sent *into that sink* is cancelled. With `monitor.mode = true`, it instead *"captures from the monitor ports of the default sink"*, which cancels everything played on the default output, from any app. ([PipeWire docs](https://docs.pipewire.org/page_module_echo_cancel.html); `src/modules/module-echo-cancel.c` header.)
- The backend is `aec/libspa-aec-webrtc`, the same WebRTC APM family. Defaults from `spa/plugins/aec/aec-webrtc.cpp`: `extended_filter`, `delay_agnostic`, `noise_suppression`, `high_pass_filter`, `transient_suppression` and `voice_detection` are on; `gain_control` is off.
- **Can the Jarvis App rely on it?** Not by default. It is not loaded on this machine, and enabling it is a per-user PipeWire config drop-in (`~/.config/pipewire/pipewire.conf.d/*.conf`) plus making the Echo-Cancel Source the default, or picking it by `deviceId`. That is a system change outside the app. It is worth having only if Jarvis must cancel **other apps'** audio (music, video calls), which Chromium cannot do on Linux, or if Chromium AEC proves too weak. If it is used, Chromium would run its own AEC on an already-cleaned signal. Either keep that (and test for artifacts) or request `echoCancellation: false` when the chosen device is the Echo-Cancel Source.

## 3. Speakers vs headphones, and what "good enough" means

- **Headphones** (this laptop's jack, or a headset): acoustic echo is essentially gone. Every option below works, and barge-in is free.
- **Built-in speakers + built-in mic** (the current setup): strongest coupling, plus nonlinear distortion from small speakers at high volume. Linear AEC can't remove the distortion; only the residual suppressor can. So this is the case to design for.
- **Good enough:** the voice detector (whatever ticket chooses it) never opens an Utterance from a Reply alone, across a test set of long Spanish Replies at the Owner's normal and maximum listening volume, including the first ~0.5 s of each Reply (AEC adapts after silence) and the tail after the Reply ends (room reverb). Measure echo on the **processed** track with the actual detector, not by ear. The ticket says residual echo that the detector flags is a failure.

## 4. Fallbacks that don't depend on AEC

| Option | How | Guarantee | Cost |
|---|---|---|---|
| **Half duplex** | Ignore voice detection while Speaking, plus a ~200–400 ms tail after `ended` | Total, by construction | **No barge-in by voice.** Interrupting needs another channel (tap the Orb, a key, or the portal shortcut). Any echo tail past the hold-off still leaks. |
| **Raise the threshold while Speaking** | A higher detector probability or energy, or a longer minimum speech duration, during the Reply | Statistical | Barge-in works only for loud or sustained speech, and the threshold needs tuning per volume and device. A cheap, sharper version uses the fact that Jarvis knows the exact Reply PCM: gate on mic energy exceeding the *expected* echo envelope (Reply envelope × measured coupling) by a margin, a homemade double-talk detector. |
| **Compare with the Reply text** | Transcribe what was heard, drop it if it matches the Reply | Weak | Costs a Whisper call per false trigger, adds latency before the decision, and fuzzy matching fails on partial or garbled echo. It also mixes the Owner's real barge-in with echo in one transcript. **Not recommended.** |

Barge-in summary: AEC is the only option that keeps natural voice barge-in. Even with AEC, the Owner's voice is attenuated while Jarvis talks (double-talk), so detection of the Owner's speech during a Reply is weaker than in silence.

## 5. Ranked for this machine

1. **Chromium's built-in AEC, kept as is** (`echoCancellation` default/`true`, Reply played by the same app to the default device, mic open during the Reply), **plus a Speaking-aware gate**: a stricter detector threshold or minimum duration while Speaking, and a short hold-off right after the Reply starts and ends. This keeps voice barge-in, needs no system config, and works the same in Chrome and the Jarvis App.
2. **Half duplex as the guaranteed fallback.** Use it if hardware tests show any Reply-triggered Utterance on speakers that the gate can't stop, or offer it as the mode for speakers with full duplex on headphones. The interrupt comes from tapping the Orb or a key instead of the voice.
3. **PipeWire echo-cancel (`monitor.mode`)** only if Jarvis must also ignore *other apps'* audio, or if (1) fails and barge-in is still wanted. It is an opt-in Owner setup step, not something the app can count on.
4. **Comparing with the Reply text**: rejected for the reasons above.

Architectural constraint whichever option wins: **the process that listens must be the process that plays the Reply.** If the Jarvis App ever plays a Reply while the Jarvis page is listening, or the reverse, AEC won't help. That needs a "one hearing client at a time" rule, or half duplex across clients.

## 6. What must be tested on real hardware

1. **Leak test on speakers, Jarvis App (Electron 44 / plain AEC3):** play 20+ real Kokoro Spanish Replies at normal and max volume with the mic open in the hands-free shape. Count detector triggers on the processed track. Check the first 500 ms and the tail separately.
2. **The same on the Jarvis page in Google Chrome 155**, to see whether the neural residual estimator makes a measurable difference. Check `chrome://webrtc-internals` and the audio-service logs to confirm `aec_type=ChromeWideAEC`.
3. **Barge-in under double talk:** the Owner speaks over a Reply at normal voice. Does the detector fire, and how quickly? Does Whisper understand the processed audio?
4. **Gate tuning:** what Speaking-time threshold or minimum duration gives zero false triggers but still catches barge-in? Is the expected-echo-envelope gate better than a fixed threshold?
5. **Headphones:** confirm zero triggers with any setting, as the full-duplex baseline.
6. **Device changes mid-Reply:** headphones plugged or unplugged, or the default sink switched. Does the AEC reference follow (the OutputDeviceMixer is rebuilt on device change)?
7. **Optional:** load `libpipewire-module-echo-cancel` with `monitor.mode = true` temporarily (an Owner decision, since it changes config) and compare leak and barge-in numbers, with Chromium AEC on and off on top.

## Sources

- Chromium `152.0.7977.130`: [media/base/media_switches.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/media/base/media_switches.cc), [media/media_options.gni](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/media/media_options.gni), [content/public/common/content_features.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/content/public/common/content_features.cc), [services/audio/output_device_mixer.h](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/services/audio/output_device_mixer.h), [services/audio/output_device_mixer_manager.h](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/services/audio/output_device_mixer_manager.h), [services/audio/input_controller.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/services/audio/input_controller.cc), [blink media_stream_audio_processor_options.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/third_party/blink/renderer/platform/mediastream/media_stream_audio_processor_options.cc), [blink media_stream_constraints_util_audio.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/third_party/blink/renderer/modules/mediastream/media_stream_constraints_util_audio.cc), [blink processed_local_audio_source.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/third_party/blink/renderer/modules/mediastream/processed_local_audio_source.cc), [media/audio/pulse/audio_manager_pulse.cc](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/media/audio/pulse/audio_manager_pulse.cc), [runtime_enabled_features.json5](https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.130/third_party/blink/renderer/platform/runtime_enabled_features.json5)
- W3C [Media Capture and Streams, `echoCancellation`](https://w3c.github.io/mediacapture-main/)
- Electron: [issue #47043](https://github.com/electron/electron/issues/47043), [shell/browser/feature_list.cc @ v44.7.0](https://github.com/electron/electron/blob/v44.7.0/shell/browser/feature_list.cc)
- PipeWire: [module-echo-cancel docs](https://docs.pipewire.org/page_module_echo_cancel.html), [module-echo-cancel.c @ 1.6.9](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/1.6.9/src/modules/module-echo-cancel.c), [aec-webrtc.cpp @ 1.6.9](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/1.6.9/spa/plugins/aec/aec-webrtc.cpp)
- Secondary: [webrtcHacks, "Google Chrome downloads a new neural AEC…" (2026-10-06)](https://webrtchacks.com/chrome-neural-echo-cancellation/)
