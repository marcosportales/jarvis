import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

/** Jarvis's pages, with the sidebar; the Floating Orb has none. */
export default function JarvisLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        {/* Zero-height sticky strip: the trigger stays in view on scroll without pushing the page down. */}
        <div className="sticky top-0 z-30 h-0">
          <SidebarTrigger
            aria-label="Abrir o cerrar el menú"
            title="Menú (Ctrl+B o ⌘+B)"
            className="m-2 bg-background"
          />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
