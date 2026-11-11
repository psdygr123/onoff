import sys, numpy as np, cv2
from PIL import Image
G='./'  # games/autelia 에서 실행
def hsvof(im):
    h=cv2.cvtColor(im,cv2.COLOR_RGB2HSV).astype(float);return np.dstack([h[...,0]*2,h[...,1]/255,h[...,2]/255])
def fix(img,mask,ears,out,skin_pts,hair_pts,eyes=()):
    im=np.array(Image.open(G+img).convert('RGB'));m=np.array(Image.open(G+mask).convert('L'))
    hv=hsvof(im)
    def cen(pts):
        return np.mean([hv[y-2:y+3,x-2:x+3].reshape(-1,3).mean(0) for x,y in pts],axis=0)
    sk,hr=cen(skin_pts),cen(hair_pts)
    w=np.array([1/30,1,1.2])
    def d(c):
        dh=np.abs(hv[...,0]-c[0]);dh=np.minimum(dh,360-dh)
        return np.sqrt(((dh*w[0])**2)+((hv[...,1]-c[1])*w[1])**2+(((hv[...,2]-c[2])*w[2])**2))
    isskin=d(sk)<d(hr)
    new=m.copy()
    for (x0,y0,x1,y1) in ears:
        box=np.zeros(m.shape,bool);box[y0:y1,x0:x1]=True
        rem=box&(m==1)&isskin
        rem=cv2.morphologyEx(rem.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))>0
        n,lab,st,_=cv2.connectedComponentsWithStats(rem.astype(np.uint8),connectivity=8)
        keep=np.zeros_like(rem)
        for i in range(1,n):
            if st[i,4]>=12: keep|=lab==i
        if keep.any():
            hm=cv2.dilate(keep.astype(np.uint8),np.ones((3,3),np.uint8),iterations=2)>0
            # 구멍(귀 안쪽 선)만 채움
            fl=hm.copy().astype(np.uint8);ff=np.zeros((fl.shape[0]+2,fl.shape[1]+2),np.uint8)
            inv=(1-fl).astype(np.uint8);cv2.floodFill(inv,ff,(0,0),2)
            holes=(inv==1)
            hm=hm|holes
            new[hm&box&(m==1)]=0
    for (x0,y0,x1,y1),(bx0,by0,bx1,by1) in eyes:
        sub=new[y0:y1,x0:x1];sub[sub==1]=0
        bb=np.zeros(m.shape,bool);bb[by0:by1,bx0:bx1]=True
        new[bb&(new==1)&isskin]=0
    Image.fromarray(new).save(out)
    print(out,'removed',int((m==1).sum()-(new==1).sum()))
    return im,m,new
def show(im,m,new,crop,name,scale=4):
    a=im.copy();h=new==1
    a[h]=(a[h]*0.45+np.array([255,0,255])*0.55).astype(np.uint8)
    rm=(m==1)&(new!=1);a[rm]=[0,255,0]
    x0,y0,x1,y1=crop;c=a[y0:y1,x0:x1]
    Image.fromarray(c).resize((c.shape[1]*scale,c.shape[0]*scale),Image.NEAREST).save(name)
if __name__=='__main__':
    im,m,new=fix('assets/prologue/pt/pt_pro_hero_f.webp','assets/mask/10_pt_pro_hero_f.png',[(215,140,265,200)],'/tmp/claude-0/ear/10.png',[(290,200),(250,195)],[(230,115),(200,60)],[(300,135,328,168)])
    show(im,m,new,(130,90,330,230),'/tmp/claude-0/ear/r10.png')
