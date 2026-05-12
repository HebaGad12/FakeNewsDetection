import os
import re

def update_file(path, replacements):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for o, n in replacements:
        content = content.replace(o, n)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

DIR = "FrontEnd/src/components/dashboards/"

# 1. create-task-dialog.tsx
replacements = [
    ('import { createTask, MOCK_USERS } from "@/lib/mock-store";', 'import { organizationTaskService } from "@/services/organizationTask";\nimport type { OrgJournalistResponse } from "@/services/organization";'),
    ('export function CreateTaskDialog({ user, onCreated }: { user: User; onCreated: () => void }) {', 'export function CreateTaskDialog({ user, journalists, onCreated }: { user: any; journalists: OrgJournalistResponse[]; onCreated: () => void }) {'),
    ('const journalists = MOCK_USERS.filter((u) => u.role === "journalist" && u.organizationId === user.organizationId);', ''),
    ('await createTask({\n      title: title.trim(),\n      description: description.trim(),\n      priority: parseInt(priority),\n      deadline,\n      organizationId: user.organizationId!,\n      organizationName: user.name,\n      assignedJournalistId: assignee === "none" ? undefined : assignee,\n      assignedJournalistName: j?.name,\n    });', 'await organizationTaskService.createTask({\n      title: title.trim(),\n      description: description.trim(),\n      priority: parseInt(priority),\n      deadline,\n      assignedJournalistId: assignee === "none" ? "" : assignee,\n    });')
]
update_file(os.path.join(DIR, "create-task-dialog.tsx"), replacements)

print("done dialog")
