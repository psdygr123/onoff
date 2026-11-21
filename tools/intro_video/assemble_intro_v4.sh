#!/bin/bash
# 도입 영상 V4 조립(2026-11-21): Higgsfield Seedance 2.5 1080p 9컷 → 각 컷 0.65배속(minterpolate 프레임 보간) → 1280x720 크로스페이드 0.8초, 마지막 컷 4.5초 연장(느린 줌)
# 컷 순서: 태양, 두 신, 어둠의 군세, 개전, 영웅 등장, 어둠 붙잡기, 낙인, 새벽, 마을. 자막 시간은 games/autelia/js/prologue/intro_timeline.js
# 사용: 1) 원본 클립마다 slow() 로 느리게 만든 뒤 s1.mp4 ~ s9.mp4 로 두고 2) 이 스크립트 실행
slow() { ffmpeg -v error -y -i "$1" -vf "scale=1280:720:flags=lanczos,setpts=PTS/0.65,minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 17 "$2"; }
FG=""
for i in 0 1 2 3 4 5 6 7; do FG="$FG[$i:v]setsar=1,fps=24,format=yuv420p[v$i];"; done
FG="$FG[8:v]setsar=1,fps=24,format=yuv420p,tpad=stop_mode=clone:stop_duration=4.5,zoompan=z='if(gte(on,184),1+0.00045*(on-184),1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,format=yuv420p[v8];"
FG="$FG[v0][v1]xfade=transition=fade:duration=0.8:offset=6.8667[x1];[x1][v2]xfade=transition=fade:duration=0.8:offset=13.7333[x2];[x2][v3]xfade=transition=fade:duration=0.8:offset=20.6[x3];[x3][v4]xfade=transition=fade:duration=0.8:offset=27.4667[x4];[x4][v5]xfade=transition=fade:duration=0.8:offset=34.3333[x5];[x5][v6]xfade=transition=fade:duration=0.8:offset=41.2[x6];[x6][v7]xfade=transition=fade:duration=0.8:offset=48.0667[x7];[x7][v8]xfade=transition=fade:duration=0.8:offset=54.9333[x8];[x8]fade=t=in:st=0:d=0.8,fade=t=out:st=66.1:d=1.0,format=yuv420p[out]"
ffmpeg -y -i s1.mp4 -i s2.mp4 -i s3.mp4 -i s4.mp4 -i s5.mp4 -i s6.mp4 -i s7.mp4 -i s8.mp4 -i s9.mp4 -filter_complex "$FG" -map "[out]" -an -c:v libx264 -profile:v baseline -level 3.1 -preset slow -crf 25 -maxrate 1900k -bufsize 3800k -movflags +faststart intro.mp4
ffmpeg -y -i intro.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 37 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p intro.webm
