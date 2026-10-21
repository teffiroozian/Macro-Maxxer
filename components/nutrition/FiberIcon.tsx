import { forwardRef } from "react";
import { AudioWaveform, type LucideProps } from "lucide-react";

// Shared Fiber mark; callers retain their existing size and stroke weight.
const FiberIcon = forwardRef<SVGSVGElement, LucideProps>(function FiberIcon({ className = "", ...props }, ref) {
  return <AudioWaveform ref={ref} {...props} className={`rotate-90 text-[#047857] ${className}`} />;
});

export default FiberIcon;
