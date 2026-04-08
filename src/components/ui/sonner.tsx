import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-white/[0.08] group-[.toaster]:border-white/[0.15] group-[.toaster]:text-white/95 group-[.toaster]:shadow-[0_20px_60px_rgba(0,0,0,0.35),0_8px_32px_rgba(255,255,255,0.08)_inset] group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-white/60",
          actionButton:
            "group-[.toast]:bg-white/[0.15] group-[.toast]:text-white group-[.toast]:border-white/[0.2] group-[.toast]:backdrop-blur-sm",
          cancelButton:
            "group-[.toast]:bg-white/[0.08] group-[.toast]:text-white/60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
