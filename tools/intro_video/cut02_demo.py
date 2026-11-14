import sys, subprocess, numpy as np, cv2, math
from PIL import Image, ImageDraw, ImageFont
SRC='/tmp/claude-0/intro/keyframes/02_light_and_darkness.png'
W,H,FPS,DUR=1280,720,30,9.0
mode=sys.argv[1]  # 'frames' or 'render'
OUT=sys.argv[2]
img=cv2.cvtColor(cv2.imread(SRC),cv2.COLOR_BGR2RGB).astype(np.float32)/255
sh,sw=img.shape[:2]
rng=np.random.default_rng(7)
# 따뜻한 색 변환본: 밝기 구조는 유지하고 남색을 호박색·금빛으로
L=(0.299*img[...,0]+0.587*img[...,1]+0.114*img[...,2])
Lg=np.clip(L,0,1)**0.50
lo=np.array([0.38,0.22,0.09]); mid=np.array([0.90,0.60,0.26]); hi=np.array([1.0,0.90,0.62])
t1=np.clip(Lg*2,0,1)[...,None]; t2=np.clip(Lg*2-1,0,1)[...,None]
warm=lo*(1-t1)+mid*t1; warm=warm*(1-t2)+hi*t2
warm=warm*0.75+img*0.25*np.array([1.1,1.0,0.8])   # 원본 질감·색 약간 유지
warm=np.clip(warm,0,1).astype(np.float32)
# 하늘 영역(위 68%) 변위용 잡음
def smooth_noise(seed,gw=10,gh=6):
    r=np.random.default_rng(seed).standard_normal((gh,gw)).astype(np.float32)
    return cv2.resize(r,(sw,sh),interpolation=cv2.INTER_CUBIC)
nx1,nx2,ny1,ny2=[smooth_noise(s) for s in (1,2,3,4)]
yy,xx=np.mgrid[0:sh,0:sw].astype(np.float32)
sky=np.clip((0.70-yy/sh)/0.12,0,1)                    # 하늘만 움직이고 땅은 고정
edge_n=cv2.resize(np.random.default_rng(11).standard_normal((9,16)).astype(np.float32),(sw,sh),interpolation=cv2.INTER_CUBIC)
thread_x=832.0
# 자막
def subtitle_rgba(lines,size=34):
    font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc',size,index=1) if False else ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc',size)
    im=Image.new('RGBA',(W,170),(0,0,0,0)); d=ImageDraw.Draw(im)
    y=170-len(lines)*(size+14)-20
    for ln in lines:
        w=d.textlength(ln,font=font); x=(W-w)/2
        for dx,dy in [(-2,0),(2,0),(0,-2),(0,2),(-2,-2),(2,2),(-2,2),(2,-2),(0,3),(3,3)]:
            d.text((x+dx,y+dy),ln,font=font,fill=(20,12,5,235))
        d.text((x,y),ln,font=font,fill=(255,246,225,255)); y+=size+14
    a=np.array(im).astype(np.float32)/255; return a
SUB=subtitle_rgba(['그러나 빛과 어둠의 대전쟁이 일어났고,','마침내 빛의 신이 승리를 거두었다.'])
motes=[dict(x=rng.uniform(0,W),y=rng.uniform(0,H),s=rng.uniform(0.8,2.6),v=rng.uniform(6,22),ph=rng.uniform(0,6.28),sw=rng.uniform(8,26)) for _ in range(85)]
ease=lambda x: x*x*(3-2*x)
def frame(t):
    u=t/DUR
    # 카메라: 천천히 다가가며 왼쪽 위(해) 쪽으로 약간 이동
    z=1.0+0.07*ease(min(1,t/DUR)); cx=sw/2-18*ease(u)*1.0; cy=sh/2+6*ease(u)
    # 중앙 금실 빛 맥동 + 구름 변위
    base=img.copy()
    pulse=0.55+0.45*math.sin(t*1.7)
    g=np.exp(-((xx-thread_x)/(10+8*pulse))**2)*np.clip((680-yy)/680,0,1)**0.7
    # 승리 진행도(1.4s~7.0s)
    p=ease(np.clip((t-1.4)/5.6,0,1))
    front=-0.25*sw+p*1.5*sw+ 70*edge_n
    m=np.clip((front-xx)/(190+60*(1-p))+0.0,0,1)           # 왼쪽(밝음) → 오른쪽 순서로 따뜻해짐
    m=m*np.clip(0.35+sky*0.65+ (1-sky)*0.35,0,1)
    # 구름 변위(하늘만, 천천히 흐름)
    a=t*0.35
    dxm=(nx1*math.cos(a)+nx2*math.sin(a))*5.5*sky; dym=(ny1*math.cos(a)+ny2*math.sin(a))*3.0*sky
    mapx=(xx+dxm).astype(np.float32); mapy=(yy+dym).astype(np.float32)
    mix=img*(1-m[...,None])+warm*m[...,None]
    mix=cv2.remap(mix,mapx,mapy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
    # 진행하는 빛 띠(섬광 아님: 최대 0.22)
    band=np.exp(-((xx-(front-60))/130)**2)*np.clip(1-yy/sh*0.9,0,1)*0.22*math.sin(math.pi*min(1,max(0,(t-1.4)/5.6)))
    mix=mix+band[...,None]*np.array([1.0,0.78,0.42])
    mix=mix+(g*(0.16+0.24*pulse*(1-0.5*p)))[...,None]*np.array([1.0,0.85,0.5])
    mix=np.clip(mix,0,1)
    M=np.array([[z*W/sw,0,W/2-z*W/sw*cx],[0,z*H/sh,H/2-z*H/sh*cy]],np.float32)
    out=cv2.warpAffine(mix,M,(W,H),flags=cv2.INTER_AREA if z<1 else cv2.INTER_LINEAR)
    # 금빛 입자
    layer=np.zeros((H,W,3),np.float32)
    for mo in motes:
        x=(mo['x']+math.sin(t*0.6+mo['ph'])*mo['sw'])%W; y=(mo['y']-mo['v']*t)%H
        tw=0.45+0.55*math.sin(t*2.1+mo['ph']*2); r=mo['s']
        a=tw*(0.25+0.75*min(1,t/2.5))*(0.35+0.65*p)
        cv2.circle(layer,(int(x),int(y)),max(1,int(r+1.5)),(1.0*a*0.35,0.8*a*0.35,0.45*a*0.35),-1,cv2.LINE_AA)
        cv2.circle(layer,(int(x),int(y)),max(1,int(r*0.7)),(1.0*a,0.88*a,0.55*a),-1,cv2.LINE_AA)
    layer=cv2.GaussianBlur(layer,(0,0),1.1)
    out=np.clip(out+layer*0.9,0,1)
    # 자막(0.9s 페이드 인, 끝 0.6s 전까지 유지)
    sa=np.clip((t-0.9)/0.8,0,1)
    if sa>0:
        y0=H-170; sub=SUB; al=sub[...,3:4]*sa
        out[y0:H]=out[y0:H]*(1-al)+sub[...,:3]*al
    # 시작 페이드 인
    fi=np.clip(t/0.7,0,1); out=out*fi
    return (out*255+0.5).astype(np.uint8)
if mode=='frames':
    import os; os.makedirs(OUT,exist_ok=True)
    for t in map(float,sys.argv[3:]):
        cv2.imwrite(f'{OUT}/f_{t:.1f}.png',cv2.cvtColor(frame(t),cv2.COLOR_RGB2BGR))
else:
    tmp=OUT+'.tmp.mp4'
    pr=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',tmp],stdin=subprocess.PIPE)
    for i in range(int(DUR*FPS)):
        pr.stdin.write(frame(i/FPS).tobytes())
    pr.stdin.close(); rc=pr.wait()
    if rc==0:
        import os; os.rename(tmp,OUT); print('ok',OUT)
