const STICKERS = [
  { src: '/sticker%204.png', top: '6%', left: '4%', size: 52, delay: 0, duration: 9 },
  { src: '/sticker%205.png', top: '14%', right: '6%', size: 48, delay: 1.2, duration: 8 },
  { src: '/sticker%206.png', top: '38%', left: '2%', size: 44, delay: 0.6, duration: 10 },
  { src: '/sticker%207.png', top: '52%', right: '4%', size: 50, delay: 2, duration: 7.5 },
  { src: '/sticker%209.png', top: '72%', left: '8%', size: 46, delay: 1.5, duration: 9.5 },
  { src: '/sticker%2010.png', top: '78%', right: '10%', size: 42, delay: 0.3, duration: 8.5 },
  { src: '/sticker%2011.png', top: '28%', left: '72%', size: 40, delay: 2.5, duration: 11 },
  { src: '/sticket%201%20.png', top: '62%', left: '68%', size: 48, delay: 1.8, duration: 10 },
] as const;

export function LoginFloatingStickers() {
  return (
    <div className="login-stickers pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {STICKERS.map((sticker) => (
        <img
          key={sticker.src}
          src={sticker.src}
          alt=""
          className="login-sticker"
          loading="eager"
          decoding="async"
          style={{
            top: sticker.top,
            left: 'left' in sticker ? sticker.left : undefined,
            right: 'right' in sticker ? sticker.right : undefined,
            width: sticker.size,
            height: sticker.size,
            animationDelay: `${sticker.delay}s`,
            animationDuration: `${sticker.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
