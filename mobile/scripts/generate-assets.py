import zlib, struct

def png(path, width, height, pixels):
    rows = b''.join(b'\x00' + bytes(pixels[y*width*4:(y+1)*width*4]) for y in range(height))
    def chunk(typ, data):
        return struct.pack('>I', len(data)) + typ + data + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))

def blank(w, h, bg):
    return bytearray(bytes((*bg, 255)) * (w*h))

def blend(px, w, h, x, y, color, a):
    if x < 0 or y < 0 or x >= w or y >= h:
        return
    i = (y*w + x)*4
    for c in range(3):
        px[i+c] = int(px[i+c]*(1-a) + color[c]*a)
    px[i+3] = 255

def rrect(px, w, h, x0, y0, x1, y1, r, color, a=1.0):
    for y in range(max(0,int(y0)), min(h,int(y1))):
        for x in range(max(0,int(x0)), min(w,int(x1))):
            dx = 0
            if x < x0+r: dx = x0+r-x
            elif x > x1-r: dx = x-(x1-r)
            dy = 0
            if y < y0+r: dy = y0+r-y
            elif y > y1-r: dy = y-(y1-r)
            if dx*dx + dy*dy <= r*r:
                blend(px, w, h, x, y, color, a)

def circle(px, w, h, cx, cy, rad, color, a=1.0):
    for y in range(max(0,int(cy-rad)), min(h,int(cy+rad)+1)):
        for x in range(max(0,int(cx-rad)), min(w,int(cx+rad)+1)):
            if (x-cx)**2 + (y-cy)**2 <= rad*rad:
                blend(px, w, h, x, y, color, a)

def downsample(px, w, h, factor):
    ow, oh = w//factor, h//factor
    out = bytearray(ow*oh*4)
    for y in range(oh):
        for x in range(ow):
            r=g=b=a=0
            for dy in range(factor):
                for dx in range(factor):
                    i = ((y*factor+dy)*w + (x*factor+dx))*4
                    r+=px[i]; g+=px[i+1]; b+=px[i+2]; a+=px[i+3]
            n=factor*factor
            o=(y*ow+x)*4
            out[o]=r//n; out[o+1]=g//n; out[o+2]=b//n; out[o+3]=a//n
    return out, ow, oh

def logo(w, h, cx, cy, scale, dark=False):
    bg = (12,10,9) if dark else (15,118,110)
    px = blank(w,h,bg)
    circle(px,w,h,cx+scale*300,cy-scale*300,scale*300,(20,184,166),0.10)
    cw = scale*520
    ch = scale*600
    x0, y0 = cx-cw/2, cy-ch/2
    x1, y1 = cx+cw/2, cy+ch/2
    r = scale*70
    rrect(px,w,h,x0,y0,x1,y1,r,(247,245,240),1.0)
    rrect(px,w,h,x0,y0,x0+scale*92,y1,r,(17,94,89),1.0)
    line_color = (15,118,110)
    for frac in [0.28, 0.52, 0.76]:
        ly = y0 + ch*frac
        rrect(px,w,h,x0+scale*150, ly, x1-scale*70, ly+scale*32, scale*16, line_color, 1.0)
    circle(px,w,h,x1-scale*40,y1-scale*60,scale*98,(245,158,11),1.0)
    circle(px,w,h,x1-scale*40,y1-scale*60,scale*72,(247,245,240),1.0)
    circle(px,w,h,x1-scale*40,y1-scale*60,scale*48,(15,118,110),1.0)
    return px

S=2
w,h=1024*S,1024*S
px = logo(w,h,w/2,h/2,1.55,False)
out,ow,oh=downsample(px,w,h,S)
png('public/icon.png',ow,oh,out)

w,h=750*S,1334*S
px = logo(w,h,w/2,h/2,1.0,False)
out,ow,oh=downsample(px,w,h,S)
png('public/splash.png',ow,oh,out)

px = logo(w,h,w/2,h/2,1.0,True)
out,ow,oh=downsample(px,w,h,S)
png('public/splash-dark.png',ow,oh,out)
print('assets written')
