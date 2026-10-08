import * as React from "react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  GraduationCapIcon,
  PlaneIcon,
  HandCoinsIcon,
  TrophyIcon,
  TagIcon,
  DownloadIcon,
  UploadIcon,
  RadarIcon,
  RocketIcon,
  BotIcon,
  LandmarkIcon,
  BugIcon,
} from "lucide-react"
import { categoryColor } from "@/lib/opps"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Học bổng/Fellowship": <GraduationCapIcon />,
  "Research visit": <PlaneIcon />,
  "Tài trợ/Grant": <HandCoinsIcon />,
  "Kiếm tiền khác": <TrophyIcon />,
  Startup: <RocketIcon />,
  "AI training gig": <BotIcon />,
  "Đấu thầu & dự án": <LandmarkIcon />,
  "Bounty/Speaking/IP": <BugIcon />,
}
const tinted = (icon: React.ReactNode, c: string) =>
  React.isValidElement<{ style?: React.CSSProperties }>(icon) ? React.cloneElement(icon, { style: { color: categoryColor(c) } }) : icon

export function AppSidebar({
  view,
  onViewChange,
  categories,
  counts,
  builtAt,
  onExport,
  onImport,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  view: string
  onViewChange: (view: string) => void
  categories: string[]
  counts: Record<string, number>
  builtAt: string
  onExport: () => void
  onImport: () => void
}) {
  const overview: NavItem[] = [
    { id: "overview", title: "Tổng quan", icon: <LayoutDashboardIcon />, count: counts.overview },
  ]
  const byCategory: NavItem[] = categories.map((c) => ({
    id: c,
    title: c,
    icon: tinted(CATEGORY_ICONS[c] ?? <TagIcon />, c),
    count: counts[c] ?? 0,
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#" onClick={(e) => { e.preventDefault(); onViewChange("overview") }}>
                <RadarIcon className="size-5!" />
                <span className="text-base font-semibold">Opportunity Scout</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={overview} active={view} onSelect={onViewChange} />
        <NavMain label="Loại cơ hội" items={byCategory} active={view} onSelect={onViewChange} />
        <NavSecondary
          className="mt-auto"
          items={[
            { title: "Xuất trạng thái (JSON)", icon: <DownloadIcon />, onClick: onExport },
            { title: "Nhập trạng thái (JSON)", icon: <UploadIcon />, onClick: onImport },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: "Keeni", subtitle: `ERA Lab · cập nhật ${builtAt}`, initials: "K" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
