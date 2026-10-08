import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type NavItem = {
  id: string
  title: string
  icon?: React.ReactNode
  count?: number
}

export function NavMain({
  label,
  items,
  active,
  onSelect,
}: {
  label?: string
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.id === active}
                onClick={() => {
                  onSelect(item.id)
                  setOpenMobile(false)
                }}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.count !== undefined && <SidebarMenuBadge>{item.count}</SidebarMenuBadge>}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
