// Seek just past zero so browsers display the opening frame before playback.
function ComboVideo({ video, className, title }) {
  const showOpeningFrame = (event) => {
    const player = event.currentTarget;
    if (player.currentTime === 0 && Number.isFinite(player.duration) && player.duration > 0) {
      player.currentTime = Math.min(0.01, player.duration / 2);
    }
  };

  return (
    <video key={video.url} className={className} controls preload="metadata" playsInline onLoadedMetadata={showOpeningFrame} aria-label={`Video of ${title}`}>
      <source src={video.url} type={video.type || undefined} />
      Your browser does not support video playback.
    </video>
  );
}

export default ComboVideo;
