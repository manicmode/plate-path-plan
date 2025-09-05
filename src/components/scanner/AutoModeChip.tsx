export default function AutoModeChip({ on, onClick, className='' }:{on:boolean;onClick:()=>void;className?:string}) {
  return (
    <button
      type="button" 
      aria-pressed={on} 
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
        on ? 'bg-teal-500/15 text-teal-300 border-teal-300/25' : 'bg-white/10 text-white/80 border-white/15',
        className
      ].join(' ')}
    >
      {on ? 'Auto' : 'Tap to scan'}
    </button>
  );
}