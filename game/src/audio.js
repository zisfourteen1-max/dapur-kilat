// Dapur Kilat — audio: every sound is synthesized with WebAudio.
// No audio files, no network. The context only starts after a user
// gesture, and the music scheduler runs from the game loop.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    musicOn: false,
    sizzleGain: null,
    sizzleNodes: null,
    musicStep: 0,
    nextNoteTime: 0,
  };

  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
    } catch (err) {
      audio.ctx = null;
    }
  };

  audio.setMuted = function setMuted(muted) {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
    if (muted) audio.stopSizzle();
  };

  function tone(freq, seconds, type, volume, when, slideTo) {
    if (!audio.ctx || audio.muted) return;
    const t0 = when || audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noiseBurst(seconds, volume, filterFreq) {
    if (!audio.ctx || audio.muted) return;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * seconds));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 1800;
    const gain = audio.ctx.createGain();
    gain.gain.value = volume || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
  }

  audio.pickup = function pickup() {
    tone(520, 0.09, 'triangle', 0.22);
    tone(780, 0.1, 'triangle', 0.18, audio.ctx ? audio.ctx.currentTime + 0.06 : 0);
  };

  audio.chop = function chop() {
    noiseBurst(0.07, 0.4, 2400);
    tone(180, 0.06, 'square', 0.12);
  };

  audio.place = function place() {
    tone(340, 0.08, 'triangle', 0.2);
    tone(260, 0.1, 'triangle', 0.16, audio.ctx ? audio.ctx.currentTime + 0.05 : 0);
  };

  audio.cookDone = function cookDone() {
    tone(880, 0.12, 'sine', 0.2);
    tone(1174, 0.16, 'sine', 0.2, audio.ctx ? audio.ctx.currentTime + 0.1 : 0);
  };

  audio.serve = function serve() {
    const t = audio.ctx ? audio.ctx.currentTime : 0;
    tone(659, 0.1, 'triangle', 0.22, t);
    tone(880, 0.1, 'triangle', 0.22, t + 0.09);
    tone(1318, 0.18, 'triangle', 0.22, t + 0.18);
  };

  audio.coin = function coin() {
    tone(1567, 0.09, 'square', 0.1);
    tone(2093, 0.14, 'square', 0.1, audio.ctx ? audio.ctx.currentTime + 0.07 : 0);
  };

  audio.error = function error() {
    tone(160, 0.16, 'sawtooth', 0.14, 0, 110);
  };

  audio.lost = function lost() {
    const t = audio.ctx ? audio.ctx.currentTime : 0;
    tone(392, 0.16, 'sine', 0.18, t, 330);
    tone(311, 0.26, 'sine', 0.18, t + 0.15, 262);
  };

  audio.startSizzle = function startSizzle() {
    if (!audio.ctx || audio.muted || audio.sizzleNodes) return;
    const len = audio.ctx.sampleRate;
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;
    const gain = audio.ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
    audio.sizzleNodes = { src, gain };
  };

  audio.stopSizzle = function stopSizzle() {
    if (!audio.sizzleNodes) return;
    try { audio.sizzleNodes.src.stop(); } catch (err) { /* already stopped */ }
    audio.sizzleNodes = null;
  };

  // Cheerful warung loop: a pentatonic melody over a soft bass, 8 steps.
  const MELODY = [523, 587, 659, 784, 880, 784, 659, 587];
  const BASS = [131, 98, 110, 131, 147, 131, 110, 98];
  const STEP_SECONDS = 0.24;

  audio.musicTick = function musicTick() {
    if (!audio.ctx || audio.muted || !audio.musicOn) return;
    const now = audio.ctx.currentTime;
    if (audio.nextNoteTime < now) audio.nextNoteTime = now + 0.05;
    while (audio.nextNoteTime < now + 0.15) {
      const step = audio.musicStep % 8;
      tone(MELODY[step], STEP_SECONDS * 0.9, 'triangle', 0.1, audio.nextNoteTime);
      if (step % 2 === 0) tone(BASS[step], STEP_SECONDS * 1.8, 'sine', 0.14, audio.nextNoteTime);
      audio.musicStep += 1;
      audio.nextNoteTime += STEP_SECONDS;
    }
  };

  audio.startMusic = function startMusic() {
    audio.ensure();
    audio.musicOn = true;
    audio.nextNoteTime = audio.ctx ? audio.ctx.currentTime + 0.05 : 0;
  };

  return audio;
}
