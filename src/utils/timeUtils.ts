
export function formatDuration(duration: string): string {
  // Convert duration string to seconds
  const durationInSeconds = parseFloat(duration);
  
  if (isNaN(durationInSeconds)) return "0s";
  
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  // Format based on duration length
  if (durationInSeconds < 60) {
    return `${seconds}s`;
  } else if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
