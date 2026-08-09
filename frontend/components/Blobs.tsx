export function Blobs() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="blob animate-blob-pulse"
        style={{ background: '#DB4A2B', top: '-20vw', left: '-10vw' }}
      />
      <div
        className="blob animate-blob-pulse"
        style={{ background: '#F8A348', bottom: '-25vw', right: '-15vw', animationDelay: '4s' }}
      />
      <div
        className="blob animate-blob-pulse"
        style={{ background: '#FF89A9', top: '20vh', right: '20vw', width: '30vw', height: '30vw', animationDelay: '7s', opacity: 0.5 }}
      />
    </div>
  );
}
