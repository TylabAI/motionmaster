import {useLayoutEffect, useRef, useState, type PointerEvent} from 'react';

type Props = {frame: number; durationFrames: number; fps: number; viewKey: string; onSeek: (frame: number) => void};
type Geometry = {left: number; width: number; height: number; clipLeft: number; clipRight: number};

/** One playhead for the workspace; its coordinates come from the actual lane content box. */
export function TimelineRuler({frame, durationFrames, fps, viewKey, onSeek}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry>({left: 0, width: 0, height: 0, clipLeft: 0, clipRight: 0});
  useLayoutEffect(() => {
    const ruler = ref.current;
    const scroll = ruler?.parentElement?.querySelector<HTMLElement>('.timeline-scroll');
    if (!ruler || !scroll) return;
    const measure = () => {
      const lane = scroll.querySelector<HTMLElement>('.track-lane');
      const r = ruler.getBoundingClientRect();
      const viewport = scroll.getBoundingClientRect();
      const box = lane?.getBoundingClientRect();
      const next = {
        left: box ? box.left + lane!.clientLeft - r.left : 133,
        width: lane?.clientWidth ?? Math.max(1, scroll.clientWidth - 142),
        height: viewport.top + scroll.clientHeight - r.top,
        clipLeft: viewport.left - r.left + 132,
        clipRight: viewport.left + scroll.clientWidth - r.left,
      };
      setGeometry(previous => Object.keys(next).every(key => previous[key as keyof Geometry] === next[key as keyof Geometry]) ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    observer.observe(ruler);
    const lane = scroll.querySelector('.track-lane');
    if (lane) observer.observe(lane);
    scroll.addEventListener('scroll', measure, {passive: true});
    measure();
    return () => { observer.disconnect(); scroll.removeEventListener('scroll', measure); };
  }, [viewKey]);

  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 || !geometry.width) return;
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left - geometry.left;
    onSeek(Math.round(Math.max(0, Math.min(1, x / geometry.width)) * durationFrames));
  };
  const playheadX = geometry.left + frame / durationFrames * geometry.width;
  const seconds=durationFrames/fps;
  const desiredSeconds=seconds/Math.max(1,geometry.width/100);
  const magnitude=10**Math.floor(Math.log10(Math.max(1/fps,desiredSeconds)));
  const tickSeconds= Math.max(1/fps,([1,2,5,10].find(n=>n*magnitude>=desiredSeconds)??10)*magnitude);
  const step=tickSeconds*fps;
  const first=Math.max(0,Math.floor((geometry.clipLeft-geometry.left)/Math.max(1,geometry.width)*durationFrames/step));
  const last=Math.min(Math.floor(durationFrames/step),Math.ceil((geometry.clipRight-geometry.left)/Math.max(1,geometry.width)*durationFrames/step));
  const ticks=Array.from({length:Math.max(0,last-first+1)},(_,i)=>(first+i)*step);
  const visible = playheadX >= geometry.clipLeft && playheadX <= geometry.clipRight;
  const label = (value: number) => {
    const seconds = Math.floor(value / fps);
    const subsecond=tickSeconds<1?`.${String(Math.floor(value/fps*100)%100).padStart(2,'0')}`:'';
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}${subsecond}`;
  };
  return <div ref={ref} className="timeline-ruler" role="slider" tabIndex={0} aria-label="播放头位置" aria-valuemin={0} aria-valuemax={durationFrames - 1} aria-valuenow={frame}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onSeek(frame + (event.key === 'ArrowLeft' ? -1 : 1)); } }}
    onPointerDown={event => { if (event.button !== 0) return; const x=event.clientX-event.currentTarget.getBoundingClientRect().left; if(x<geometry.left||x>geometry.left+geometry.width)return; event.currentTarget.setPointerCapture(event.pointerId); scrub(event); }} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))scrub(event);}}>
    <div className="ruler-ticks-viewport" style={{clipPath:`inset(0 0 0 ${geometry.clipLeft}px)`}}><div className="ruler-ticks" style={{left: geometry.left, width: geometry.width}}>
      {ticks.map(value => <span className="ruler-tick" key={value} style={{left: `${value/durationFrames*100}%`}}>{label(value)}</span>)}
    </div></div>
    <div className="ruler-playhead" style={{left: playheadX, height: geometry.height, visibility: visible ? 'visible' : 'hidden'}}>
      <div className="playhead-grip" title="按住拖动播放头" />
    </div>
  </div>;
}
