export class Camera {
  constructor(video){this.video=video;this.stream=null;this.active=false;}
  async start(){
    if(!window.isSecureContext)throw new Error('กล้องต้องเปิดผ่าน HTTPS หรือ localhost');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('browser นี้ไม่รองรับกล้อง กรุณาอัปโหลดภาพแทน');
    this.active=true;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
      if(!this.active){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.video.srcObject=stream;await this.video.play();
    }catch(error){this.stop();throw new Error(error.name==='NotAllowedError'?'ไม่ได้รับอนุญาตให้เปิดกล้อง กรุณาอนุญาตใน browser หรืออัปโหลดภาพ':'เปิดกล้องไม่ได้ กรุณาปิดแอปที่ใช้กล้องหรืออัปโหลดภาพ');}
  }
  capture(){
    if(!this.video.videoWidth)throw new Error('รอให้ภาพกล้องพร้อมก่อนถ่าย');
    const factor=Math.min(1,2000/Math.max(this.video.videoWidth,this.video.videoHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(this.video.videoWidth*factor);canvas.height=Math.round(this.video.videoHeight*factor);canvas.getContext('2d').drawImage(this.video,0,0,canvas.width,canvas.height);return canvas;
  }
  stop(){this.active=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;}
}
