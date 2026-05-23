import { Bell, Search, Menu, Moon, Sun, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/tasks-mock";

interface Props {
  role: Role;
  onRoleChange: (r: Role) => void;
  onMenu: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function TopHeader({ role, onRoleChange, onMenu, isDark, onToggleDark }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:block">
        <h1 className="text-lg font-semibold leading-tight">Tasks</h1>
        <p className="text-xs text-muted-foreground">Editorial assignments and production pipeline</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks, journalists, beats…" className="h-9 w-64 pl-9 lg:w-80" />
        </div>

        <Badge
          variant="outline"
          className="hidden cursor-pointer gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 sm:inline-flex"
          onClick={() => onRoleChange(role === "Organization" ? "Journalist" : "Organization")}
          title="Click to switch role (demo)"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {role}
        </Badge>

        <Button variant="ghost" size="icon" onClick={onToggleDark} className="h-9 w-9">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {role === "Organization" ? "EL" : "MO"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{role === "Organization" ? "Evelyn Liu" : "Marcus Okafor"}</div>
              <div className="text-xs text-muted-foreground">{role === "Organization" ? "evelyn@newsroom.io" : "marcus@newsroom.io"}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Switch role (demo)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onRoleChange("Organization")}>Organization / Admin</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRoleChange("Journalist")}>Journalist</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
