import { cn } from "@/lib/utils";

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function MainHeading({ children, className }: TypographyProps) {
  return (
    <h1 
      className={cn(
        "text-[28px] font-light tracking-[0.2px] leading-tight text-foreground",
        "transition-colors duration-300",
        className
      )}
    >
      {children}
    </h1>
  );
}

export function PageHeading({ children, className }: TypographyProps) {
  return (
    <h1 
      className={cn(
        "text-2xl font-light tracking-[0.2px] leading-tight text-foreground",
        "transition-colors duration-300",
        className
      )}
    >
      {children}
    </h1>
  );
}

export function SectionHeading({ children, className }: TypographyProps) {
  return (
    <h2 
      className={cn(
        "text-lg font-light tracking-[0.2px] leading-relaxed text-foreground",
        "transition-colors duration-300",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function SubHeading({ children, className }: TypographyProps) {
  return (
    <h3 
      className={cn(
        "text-lg font-light tracking-wide leading-relaxed text-foreground",
        "lg:tracking-wider",
        "transition-colors duration-300",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function BodyText({ children, className }: TypographyProps) {
  return (
    <p 
      className={cn(
        "text-base leading-relaxed tracking-wide text-foreground/90",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SecondaryText({ children, className }: TypographyProps) {
  return (
    <p 
      className={cn(
        "text-sm leading-relaxed tracking-wide text-muted-foreground",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </p>
  );
}

export function NavigationText({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-sm font-medium tracking-wide text-foreground/80",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </span>
  );
}

export function MetricText({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-2xl font-extralight tracking-wide text-foreground",
        "lg:tracking-wider",
        "transition-all duration-300",
        className
      )}
    >
      {children}
    </span>
  );
}

export function MetricLabel({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-sm font-medium tracking-[0.1px] text-foreground/80",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </span>
  );
}

export function PageSubtext({ children, className }: TypographyProps) {
  return (
    <p 
      className={cn(
        "text-sm leading-relaxed tracking-wide text-muted-foreground",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </p>
  );
}

export function CardTitle({ children, className }: TypographyProps) {
  return (
    <h3 
      className={cn(
        "text-base font-light tracking-[0.2px] text-foreground",
        "transition-colors duration-300",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function TableText({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-sm font-light tracking-wide text-foreground",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </span>
  );
}

export function MetricNumber({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-3xl font-light tracking-tight text-foreground",
        "transition-all duration-300",
        className
      )}
    >
      {children}
    </span>
  );
}

export function LabelText({ children, className }: TypographyProps) {
  return (
    <span 
      className={cn(
        "text-xs font-medium tracking-[0.1px] text-muted-foreground uppercase",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </span>
  );
}