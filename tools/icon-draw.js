// Рисование иконки GOD OF BACK2U на canvas (запускать в странице игры, где загружен шрифт Russo One).
// drawIcon(размер, упрощённо) → canvas
window.drawIcon = (S,small)=>{const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');const s=S/256;x.scale(s,s);
const rr=(X,Y,W,H,R)=>{x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();};
const m=small?6:10;rr(m,m,256-2*m,256-2*m,small?44:54);x.save();x.clip();
let g=x.createRadialGradient(128,92,8,128,128,190);g.addColorStop(0,'#ff5a3c');g.addColorStop(.42,'#b3121f');g.addColorStop(1,'#1a0205');x.fillStyle=g;x.fillRect(0,0,256,256);
if(!small){x.strokeStyle='rgba(0,0,0,.28)';x.lineWidth=1.6;for(let r=34;r<170;r+=7){x.beginPath();x.arc(128,112,r,0,Math.PI*2);x.stroke();}
 const sh=x.createLinearGradient(0,0,256,256);sh.addColorStop(0,'rgba(255,255,255,.18)');sh.addColorStop(.5,'rgba(255,255,255,0)');x.fillStyle=sh;x.beginPath();x.moveTo(0,0);x.lineTo(256,0);x.lineTo(0,256);x.fill();}
const cy=small?128:112;const gl=x.createRadialGradient(128,cy,4,128,cy,small?90:80);gl.addColorStop(0,'rgba(255,230,180,.85)');gl.addColorStop(.5,'rgba(255,120,60,.25)');gl.addColorStop(1,'rgba(255,60,40,0)');x.fillStyle=gl;x.fillRect(0,0,256,256);
const K=small?1.18:1;
// бита
x.save();x.translate(128,cy);x.rotate(-Math.PI/4);x.scale(K,K);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=10;x.shadowOffsetY=4;
const L=-104,Rr=104;x.beginPath();x.moveTo(L,-6);x.lineTo(-10,-9);x.quadraticCurveTo(40,-21,Rr-8,-20);x.quadraticCurveTo(Rr+4,-20,Rr+4,0);x.quadraticCurveTo(Rr+4,20,Rr-8,20);x.quadraticCurveTo(40,21,-10,9);x.lineTo(L,6);x.closePath();
let wg=x.createLinearGradient(0,-20,0,20);wg.addColorStop(0,'#f6dca4');wg.addColorStop(.5,'#d9a75c');wg.addColorStop(1,'#8d5a24');x.fillStyle=wg;x.fill();x.shadowColor='transparent';x.lineWidth=small?4:3;x.strokeStyle='#2a1206';x.stroke();
x.fillStyle='#ff5a2a';x.fillRect(58,-21,13,42);x.fillStyle='#1a5fd8';x.fillRect(L+4,-8,46,16);if(!small){x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;for(let i=0;i<5;i++){x.beginPath();x.moveTo(L+8+i*9,-8);x.lineTo(L+14+i*9,8);x.stroke();}x.fillStyle='#2a1206';x.font='bold 15px "Russo One"';x.textAlign='center';x.textBaseline='middle';x.fillText('808',28,1);}
x.beginPath();x.ellipse(L,0,5,8,0,0,Math.PI*2);x.fillStyle='#8d5a24';x.fill();x.stroke();x.restore();
// микрофон
x.save();x.translate(128,cy);x.rotate(-Math.PI/4);x.translate(0,22);x.scale(K,K);x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=10;x.shadowOffsetY=4;
x.beginPath();x.moveTo(-14,-34);x.lineTo(14,-34);x.lineTo(8,92);x.quadraticCurveTo(0,100,-8,92);x.closePath();let mg=x.createLinearGradient(-14,0,14,0);mg.addColorStop(0,'#16181e');mg.addColorStop(.45,'#5a606e');mg.addColorStop(1,'#101216');x.fillStyle=mg;x.fill();x.shadowColor='transparent';x.lineWidth=small?4:3;x.strokeStyle='#050608';x.stroke();
x.fillStyle='#49e0ff';x.fillRect(-15,-40,30,8);
x.beginPath();x.arc(0,-66,32,0,Math.PI*2);let hg=x.createRadialGradient(-10,-78,4,0,-66,34);hg.addColorStop(0,'#ffffff');hg.addColorStop(.45,'#c8ccd6');hg.addColorStop(1,'#5f6573');x.fillStyle=hg;x.fill();x.stroke();
if(!small){x.save();x.beginPath();x.arc(0,-66,30,0,Math.PI*2);x.clip();x.strokeStyle='rgba(30,34,44,.55)';x.lineWidth=1.4;for(let i=-34;i<34;i+=6){x.beginPath();x.moveTo(i,-100);x.lineTo(i,-30);x.stroke();x.beginPath();x.moveTo(-34,-66+i);x.lineTo(34,-66+i);x.stroke();}x.restore();x.beginPath();x.arc(0,-66,32,0,Math.PI*2);x.stroke();}
x.restore();
if(!small){x.textAlign='center';x.textBaseline='alphabetic';x.font='64px "Russo One"';x.lineJoin='round';x.lineWidth=12;x.strokeStyle='#14020a';x.strokeText('B2U',128,232);let tg=x.createLinearGradient(0,186,0,234);tg.addColorStop(0,'#ffffff');tg.addColorStop(1,'#ffd0c4');x.fillStyle=tg;x.shadowColor='rgba(255,60,40,.9)';x.shadowBlur=16;x.fillText('B2U',128,232);x.shadowBlur=0;}
x.restore();rr(m,m,256-2*m,256-2*m,small?44:54);x.lineWidth=small?6:4;x.strokeStyle='rgba(255,255,255,.22)';x.stroke();
return c;};
