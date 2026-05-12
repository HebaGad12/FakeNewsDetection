import os

def update_file(path, replacements):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for o, n in replacements:
        content = content.replace(o, n)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

DIR = "FrontEnd/src/components/dashboards/"
path = os.path.join(DIR, "organization-tasks-page.tsx")

replacements = [
    ('import { listTasks, MOCK_USERS } from "@/lib/mock-store";',
     'import { organizationTaskService } from "@/services/organizationTask";\nimport type { OrgJournalistResponse } from "@/services/organization";'),
    ('export function OrganizationDashboard({ user }: { user: User }) {',
     'export function OrganizationTasksPage({ user, journalists }: { user: any; journalists: OrgJournalistResponse[]; }) {'),
    ('const [tasks, setTasks] = useState<Task[]>([]);', 'const [tasks, setTasks] = useState<any[]>([]);\n  const [dashboardStats, setDashboardStats] = useState<any>(null);'),
    ('async function load() {\n    const all = await listTasks();\n    setTasks(all.filter((t) => t.organizationId === user.organizationId));\n  }',
     'async function load() {\n    const all = await organizationTaskService.getTasks();\n    setTasks(all);\n    const stats = await organizationTaskService.getDashboard();\n    setDashboardStats(stats);\n  }'),
    ('const journalists = MOCK_USERS.filter((u) => u.role === "journalist" && u.organizationId === user.organizationId);', ''),
    ('<CreateTaskDialog user={user} onCreated={load} />', '<CreateTaskDialog user={user} journalists={journalists} onCreated={load} />'),
    ('<TaskDetailSheet\n        task={selectedTask}\n        user={user}\n        open={!!selectedTask}\n        onOpenChange={(o) => !o && setSelectedTask(null)}\n        onChanged={load}\n      />',
     '<TaskDetailSheet\n        task={selectedTask}\n        user={user}\n        journalists={journalists}\n        open={!!selectedTask}\n        onOpenChange={(o) => !o && setSelectedTask(null)}\n        onChanged={load}\n      />'),
    # Stats parsing
    ('const activeCount = tasks.filter((t) => t.status > 0 && t.status < 6 && t.status !== 5).length;',
     'const activeCount = dashboardStats?.totalActive || 0;'),
    ('const urgentCount = tasks.filter((t) => t.priority === 3 && t.status !== 6 && t.status !== 8).length;',
     'const urgentCount = tasks.filter((t) => t.priority === 3 && t.status !== 6 && t.status !== 8 && t.status !== 5).length;'),
    ('const overdueCount = tasks.filter((t) => {\n    if (t.status === 6 || t.status === 8) return false;\n    const d = new Date(t.deadline);\n    return d.getTime() < new Date().getTime();\n  }).length;',
     'const overdueCount = tasks.filter((t: any) => {\n    if (t.status === 6 || t.status === 8 || t.status === 5) return false;\n    if (!t.deadline) return false;\n    const d = new Date(t.deadline);\n    return d.getTime() < new Date().getTime();\n  }).length;'),
    ('const completedCount = tasks.filter((t) => t.status === 6).length;',
     'const completedCount = dashboardStats?.completed || 0;'),
    # Charts mapping
    ('const perfData = journalists.map((j) => {\n    const jTasks = tasks.filter((t) => t.assignedJournalistId === j.id);\n    const done = jTasks.filter((t) => t.status === 6).length;\n    const active = jTasks.filter((t) => t.status > 0 && t.status < 6).length;\n    return {\n      name: j.name.split(" ")[0],\n      Done: done,\n      Active: active,\n    };\n  });',
     'const perfData = dashboardStats?.journalistPerformance?.map((p: any) => ({\n    name: p.journalistName.split(" ")[0],\n    Done: p.completed,\n    Active: p.inProgress,\n  })) || [];')
]
update_file(path, replacements)

# journalist-tasks-page.tsx
path2 = os.path.join(DIR, "journalist-tasks-page.tsx")
replacements2 = [
    ('import { listTasks } from "@/lib/mock-store";',
     'import { journalistTaskService } from "@/services/journalistTask";'),
    ('export function JournalistDashboard({ user }: { user: User }) {',
     'export function JournalistTasksPage({ user }: { user: any; }) {'),
    ('const [tasks, setTasks] = useState<Task[]>([]);', 'const [tasks, setTasks] = useState<any[]>([]);'),
    ('async function load() {\n    const all = await listTasks();\n    setTasks(all.filter((t) => t.assignedJournalistId === user.id));\n  }',
     'async function load() {\n    const all = await journalistTaskService.getTasks();\n    setTasks(all);\n  }'),
]
update_file(path2, replacements2)

print("done pages")
