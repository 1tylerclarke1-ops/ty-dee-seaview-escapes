/**
 * A named, reserved image slot — a clearly marked placeholder for a
 * photograph that does not exist yet. The code comment beside each use
 * names the subject so a file can be dropped in without a redesign.
 * Never substitute a caravan photo or stock imagery here.
 */
export default function ReservedSlot({ label, className = "" }) {
  return (
    <div className={`photo-slot flex items-center justify-center text-center p-6 ${className}`}>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Photograph pending</p>
      </div>
    </div>
  );
}