# removes the faint glow Codex leaves in transparent edges: drop near-invisible pixels, keep the crisp edge
import sys, numpy as np
from PIL import Image
for f in sys.argv[1:]:
    im = np.array(Image.open(f).convert('RGBA'))
    a = im[:, :, 3].astype(int)
    a[a < 28] = 0
    im[:, :, 3] = a
    Image.fromarray(im).save(f)
    print('cleaned', f)
