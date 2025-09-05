export default function ZoomChip({ value, onToggle, className='' }:{ value:number; onToggle:()=>void; className?:string }) {
  return (
    <button 
      onClick={onToggle} 
      className={`px-2 py-1 rounded-full text-[11px] bg-black/50 text-white border border-white/15 ${className}`}
    >
      {value.toFixed(1)}×
    </button>
  );
}