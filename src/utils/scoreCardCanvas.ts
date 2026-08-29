import { GameResult } from '../types';
import { COUNTRIES } from '../data/countries';
import { getDailyStreak } from './storage';
import { getPublicHost } from './domain';

/**
 * Draws a high-resolution, pixel-perfect share card onto an off-screen HTML5 Canvas.
 * This guarantees 100% reliable image generation without CORS, font loading or DOM cloning errors.
 */
export async function generateScoreCardCanvas(result: GameResult): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const streak = getDailyStreak();
  const activeCountry =
    COUNTRIES.find((c) => c.code === (result.countryCode || 'GLOBAL')) || COUNTRIES[0];
  const isFocusedChallenge = result.challengeType === 'artist' || result.challengeType === 'genre';
  const correctCount = result.rounds.filter((r) => r.isCorrect).length;
  const timeFormatted = `${Math.floor(result.durationSeconds / 60)}:${String(
    result.durationSeconds % 60
  ).padStart(2, '0')}`;
  const host = getPublicHost();
  const nickname = (result.nickname || 'Music Legend').trim();

  // 1. Dark Base Background
  ctx.fillStyle = '#090d0b';
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Gradient Glows (Top Right Green & Bottom Left Amber)
  const glow1 = ctx.createRadialGradient(width - 150, 150, 20, width - 150, 150, 480);
  glow1.addColorStop(0, 'rgba(0, 230, 118, 0.28)');
  glow1.addColorStop(0.5, 'rgba(0, 230, 118, 0.08)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(150, height - 150, 20, 150, height - 150, 480);
  glow2.addColorStop(0, 'rgba(255, 179, 0, 0.22)');
  glow2.addColorStop(0.5, 'rgba(255, 179, 0, 0.06)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Decorative Rounded Frame & Border
  const pad = 48;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const radius = 36;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, cardW, cardH, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Subtle inner panel fill
  ctx.fillStyle = 'rgba(16, 24, 20, 0.7)';
  ctx.fill();
  ctx.restore();

  // 4. Header Bar: Logo & Challenge Tag
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Logo Icon & Text
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🎵 Song Guess Game', pad + 40, pad + 65);

  const contextBadgeLabel = isFocusedChallenge
    ? `${result.challengeType === 'artist' ? 'Artist' : 'Genre'}  ${result.collectionTitle || 'Challenge'}`
    : `${activeCountry.flag}  ${activeCountry.name}`;
  const countryBadgeText =
    contextBadgeLabel.length > 34 ? `${contextBadgeLabel.slice(0, 31)}...` : contextBadgeLabel;
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  const badgeMetrics = ctx.measureText(countryBadgeText);
  const badgeW = badgeMetrics.width + 48;
  const badgeH = 52;
  const badgeX = width - pad - 40 - badgeW;
  const badgeY = pad + 40;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 26);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(countryBadgeText, badgeX + 24, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // 5. Center Section: Mode Tag & Player Nickname
  const centerY = 240;
  ctx.textAlign = 'center';

  const modeLabel = (
    result.mode === 'daily' ? 'DAILY 5 CHALLENGE' : result.collectionTitle || 'MUSIC QUIZ'
  ).toUpperCase();
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#00e676';
  ctx.fillText(modeLabel, width / 2, centerY);

  ctx.font = '900 58px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nickname, width / 2, centerY + 65);

  // 6. Giant Score Box with Glowing Border
  const scoreBoxW = 460;
  const scoreBoxH = 130;
  const scoreBoxX = (width - scoreBoxW) / 2;
  const scoreBoxY = centerY + 120;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 28);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeStyle = 'rgba(0, 230, 118, 0.45)';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  // Score Number
  ctx.font = '900 76px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#00e676';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${result.totalPoints}`, width / 2 - 38, scoreBoxY + scoreBoxH / 2);

  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('PTS', width / 2 + 115, scoreBoxY + scoreBoxH / 2 + 2);
  ctx.restore();

  // 7. 5 Round Result Tiles
  const tileCount = result.rounds.length || 5;
  const tileSize = 92;
  const tileGap = 24;
  const tilesTotalW = tileCount * tileSize + (tileCount - 1) * tileGap;
  const startTileX = (width - tilesTotalW) / 2;
  const tilesY = scoreBoxY + scoreBoxH + 60;

  result.rounds.forEach((round, i) => {
    const tx = startTileX + i * (tileSize + tileGap);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tx, tilesY, tileSize, tileSize, 22);

    if (round.isCorrect) {
      ctx.fillStyle = '#00e676';
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = '900 48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', tx + tileSize / 2, tilesY + tileSize / 2 + 2);
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 44px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', tx + tileSize / 2, tilesY + tileSize / 2 + 1);
    }
    ctx.restore();
  });

  // 8. 3 Stat Pill Containers (Accuracy, Time, Streak)
  const statBoxY = tilesY + tileSize + 60;
  const statBoxH = 110;
  const statColW = (cardW - 80 - 32) / 3;
  const statStartX = pad + 40;

  const stats = [
    { label: 'ACCURACY', value: `${correctCount}/${result.rounds.length}`, color: '#ffffff' },
    { label: 'TIME', value: timeFormatted, color: '#ffffff' },
    { label: 'STREAK', value: `🔥 ${streak.currentStreak} Days`, color: '#ffb300' }
  ];

  stats.forEach((st, idx) => {
    const sx = statStartX + idx * (statColW + 16);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sx, statBoxY, statColW, statBoxH, 20);
    ctx.fillStyle = idx === 2 ? 'rgba(255, 179, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = idx === 2 ? 'rgba(255, 179, 0, 0.35)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = idx === 2 ? 'rgba(255, 179, 0, 0.8)' : 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(st.label, sx + statColW / 2, statBoxY + 20);

    ctx.font = '900 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = st.color;
    ctx.fillText(st.value, sx + statColW / 2, statBoxY + 54);
    ctx.restore();
  });

  // 9. Footer: Play URL & Verified Marker
  const footerY = height - pad - 42;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`Play the daily music quiz at  ${host}`, width / 2, footerY);

  return canvas;
}

/**
 * Generates PNG data URL from score card.
 */
export async function generateScoreCardDataUrl(result: GameResult): Promise<string> {
  const canvas = await generateScoreCardCanvas(result);
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Generates PNG Blob from score card.
 */
export async function generateScoreCardBlob(result: GameResult): Promise<Blob> {
  const canvas = await generateScoreCardCanvas(result);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create score card image blob'));
    }, 'image/png', 1.0);
  });
}

/**
 * Directly downloads the score card image to user's device.
 */
export async function downloadScoreCardImage(result: GameResult): Promise<boolean> {
  try {
    const blob = await generateScoreCardBlob(result);
    const nickname = (result.nickname || 'player').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `song-guess-score-${nickname}-${Date.now()}.png`;
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) document.body.removeChild(a);
    }, 1000);
    return true;
  } catch (err) {
    console.error('Download score card error:', err);
    return false;
  }
}

/**
 * Copies the score card PNG image to clipboard for direct paste in WhatsApp/Discord/Slack/etc.
 */
export async function copyScoreCardImageToClipboard(result: GameResult): Promise<boolean> {
  try {
    const blob = await generateScoreCardBlob(result);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Copy score card image error:', err);
    return false;
  }
}
