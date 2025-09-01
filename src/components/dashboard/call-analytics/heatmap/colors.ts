
export const getIntensityColor = (intensity: number): string => {
  // Ultra-low activity - elegant periwinkle base
  if (intensity <= 5) return "rgba(132, 169, 255, 0.08)";      // Subtle periwinkle base
  if (intensity <= 15) return "rgba(132, 169, 255, 0.15)";     // Light periwinkle
  if (intensity <= 25) return "rgba(132, 169, 255, 0.25)";     // Medium-light periwinkle
  if (intensity <= 35) return "rgba(132, 169, 255, 0.35)";     // Enhanced medium periwinkle
  
  // Medium activity - refined periwinkle progression
  if (intensity <= 40) return "rgba(132, 169, 255, 0.45)";     // Medium periwinkle
  
  // High activity - sophisticated periwinkle intensities
  if (intensity <= 50) return "rgba(132, 169, 255, 0.60)";     // Bright periwinkle
  if (intensity <= 60) return "rgba(132, 169, 255, 0.75)";     // Strong periwinkle
  if (intensity <= 70) return "rgba(132, 169, 255, 0.85)";     // Very strong periwinkle
  if (intensity <= 85) return "rgba(132, 169, 255, 0.95)";     // Nearly full periwinkle
  return "rgba(115, 150, 255, 1)";                             // Deep periwinkle for peak activity
};
