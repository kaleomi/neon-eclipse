"""Rebuild the rover driving loop from the licensed onboard recording.
Usage: python scripts/build-rover-loop.py [path to original 03.wav]
"""
import hashlib,json,pathlib,subprocess,sys
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'audio-audition/samples/03.wav'
rate=44100
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','1','-ar',str(rate),'-'])
x=np.frombuffer(raw,dtype='<f4').copy()[10*rate:15*rate];x-=x.mean()
# Slowly level the steady engine section without flattening individual firing pulses.
block=4410
energy=np.sqrt(np.mean(x[:len(x)//block*block].reshape(-1,block)**2,axis=1))
centers=(np.arange(len(energy))+.5)*block
level=np.interp(np.arange(len(x)),centers,energy)
x*=np.clip(np.median(energy)/np.maximum(level,.001),.65,1.5)
# Equal-power overlap preserves energy when the two engine phases differ.
n=int(.7*rate);phase=np.linspace(0,np.pi/2,n)
x=np.concatenate([x[-n:]*np.cos(phase)+x[:n]*np.sin(phase),x[n:-n]])
x*=.095/np.sqrt(np.mean(x*x))
assert np.max(abs(x))<.9
out=root/'audio/samples/rover-drive.ogg'
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(rate),'-ac','1','-i','-','-c:a','libvorbis','-q:a','4',str(out)],input=x.astype('<f4').tobytes(),check=True)
manifest=root/'audio/samples/sources.json';rows=json.loads(manifest.read_text(encoding='utf8'))
row=next(r for r in rows if r['file']==out.name)
row.update(start=10,seconds=len(x)/rate,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),processing='Steady onboard engine section; slow RMS leveling; 0.7 second equal-power loop overlap; RMS 0.095; mono 44.1 kHz Vorbis')
manifest.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print('Built continuous rover loop:',len(x)/rate,'seconds')
