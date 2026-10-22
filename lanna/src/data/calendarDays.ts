// Verified against the image of RMUTL 2569, PDF page 24, October table.
// Explicit daily records: no extrapolation to adjacent months or lunar systems.
// Tuple fields: civil day, Lanna month, phase (waxing=1 / waning=0), lunar day.
const octoberRows = [
 [1,12,0,5],[2,12,0,6],[3,12,0,7],[4,12,0,8],[5,12,0,9],
 [6,12,0,10],[7,12,0,11],[8,12,0,12],[9,12,0,13],[10,12,0,14],[11,12,0,15],
 [12,1,1,1],[13,1,1,2],[14,1,1,3],[15,1,1,4],[16,1,1,5],
 [17,1,1,6],[18,1,1,7],[19,1,1,8],[20,1,1,9],[21,1,1,10],
 [22,1,1,11],[23,1,1,12],[24,1,1,13],[25,1,1,14],[26,1,1,15],
 [27,1,0,1],[28,1,0,2],[29,1,0,3],[30,1,0,4],[31,1,0,5],
] as const;
export const calendarDays = octoberRows.map(([civilDay,month,phase,lunarDay])=>({
 isoDate:`2026-10-${String(civilDay).padStart(2,'0')}`,
 month, phase:phase===1?'waxing' as const:'waning' as const, lunarDay,
 chulaSakarat:1388, monthOccurrence:'normal' as const, system:'pak-lem-chiang-mai' as const,
 sourceId:'rmutl-2569',sourcePage:24,verificationStatus:'verified' as const,
}));
