const fs=require('fs');
const html=fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html','utf8');
const lines=html.split('\n');
let oi=-1,ci=-1;
for(let i=0;i<lines.length;i++){ if(/<script[^>]*>/.test(lines[i])&&!/<script[^>]+src=/.test(lines[i])){oi=i;break;} }
for(let i=oi+1;i<lines.length;i++){ if(/<\/script>/.test(lines[i])){ci=i;break;} }
fs.writeFileSync('D:/workbuddyProjects/工作台3/_tools/_app_inline.js',lines.slice(oi+1,ci).join('\n'));
console.log('extracted lines',oi+1,'-',ci,'bytes',lines.slice(oi+1,ci).join('\n').length);
