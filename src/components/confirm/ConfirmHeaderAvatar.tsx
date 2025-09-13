import React from 'react';

type Props = {
  name?: string | null;
  imageUrl?: string | null;
  brandPill?: React.ReactNode; // existing Brand pill component
};

export default function ConfirmHeaderAvatar({ name, imageUrl, brandPill }: Props) {
  const imgSrc = imageUrl ?? null;
  
  console.debug('[IMG][CARD][BIND]', { name, url: imgSrc });
  
  return (
    <div
      className="confirm-avatar"
      data-scope="confirm-avatar"
      style={{ position: 'relative', width: 64, height: 64, overflow: 'hidden', borderRadius: 12 }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name ?? 'food'}
          data-test="confirm-food-img"
          onLoad={(e) => console.debug('[IMG][LOAD]', imgSrc, { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onError={() => console.warn('[IMG][ERROR]', imgSrc)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
        />
      ) : (
        <div
          data-test="confirm-food-initials"
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #2ed0ff, #5f60ff)', color: 'white', fontWeight: 700, zIndex: 1
          }}
        >
          {(name ?? 'Food').slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Brand pill should never block image */}
      {brandPill ? (
        <div style={{ position: 'absolute', right: -6, top: -6, zIndex: 2, pointerEvents: 'none' }}>
          {brandPill}
        </div>
      ) : null}
    </div>
  );
}