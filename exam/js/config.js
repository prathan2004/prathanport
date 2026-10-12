export const DEFAULT_OMR=Object.freeze({fillThreshold:0.58,uncertainThreshold:0.20,darkDelta:40,sampleRadius:0.64,adaptiveBlock:51,adaptiveC:12,minShortSide:650,maxSide:2000,minSharpness:20,minBrightness:65,maxBrightness:250});
export function validateOMR(config) {
  if(!Number.isFinite(config.fillThreshold)||!Number.isFinite(config.uncertainThreshold)||config.fillThreshold<0.35||config.fillThreshold>0.9||config.uncertainThreshold<0.05||config.uncertainThreshold>=config.fillThreshold)throw new Error('ค่าเกณฑ์ OMR ไม่ถูกต้อง');
  return {...DEFAULT_OMR,fillThreshold:config.fillThreshold,uncertainThreshold:config.uncertainThreshold};
}
