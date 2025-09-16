export function riskForDose({ recentMisses = 0, hour = 8, isWeekend = false }) {
  let r = 0.1;
  if (recentMisses > 0) r += 0.3;
  if (isWeekend) r += 0.2;
  if (hour >= 20) r += 0.2;
  return Math.min(1, r);
}
export function labelFromRisk(r){ return r >= 0.7 ? 'High' : r >= 0.4 ? 'Med' : 'Low'; }
