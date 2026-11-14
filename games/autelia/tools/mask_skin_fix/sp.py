import numpy as np, cv2
from PIL import Image
import fix as F
G=F.G
def run(img,mk,skin,hair,out,minsz=5):
    im=np.array(Image.open(G+img).convert('RGBA'));rgb=im[...,:3]
    m=np.array(Image.open(G+'assets/mask/%s.png'%mk).convert('L'))
    hv=F.hsvof(rgb)
    cen=lambda pts:np.mean([hv[y-1:y+2,x-1:x+2].reshape(-1,3).mean(0) for x,y in pts],axis=0)
    sk,hr=cen(skin),cen(hair);print('skin',sk.round(2),'hair',hr.round(2))
    w=np.array([1/30,1,1.2])
    def d(c):
        dh=np.abs(hv[...,0]-c[0]);dh=np.minimum(dh,360-dh)
        return np.sqrt((dh*w[0])**2+((hv[...,1]-c[1])*w[1])**2+((hv[...,2]-c[2])*w[2])**2)
    isskin=(d(sk)<d(hr))&(im[...,3]>200)
    rem=(m==1)&isskin
    n,lab,st,_=cv2.connectedComponentsWithStats(rem.astype(np.uint8),connectivity=8)
    keep=np.zeros_like(rem)
    nb=(m==0)&isskin
    nbd=nb
    for i in range(1,n):
        if st[i,4]>=minsz:
            comp=lab==i
            ring=cv2.dilate(comp.astype(np.uint8),np.ones((5,5),np.uint8))>0
            if (ring&nbd).sum()>=3: keep|=comp
    hm=cv2.dilate(keep.astype(np.uint8),np.ones((3,3),np.uint8))>0
    new=m.copy();new[hm&(m==1)]=0
    Image.fromarray(new).save(out);print(out,int((m==1).sum()-(new==1).sum()))
    return im,m,new
