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

# 2. task-detail-sheet.tsx
replacements = [
    ('import { addComment, deleteTask, listComments, setStatus, updateTask, MOCK_USERS } from "@/lib/mock-store";', 
     'import { organizationTaskService } from "@/services/organizationTask";\import { journalistTaskService } from "@/services/journalistTask";\nimport type { OrgJournalistResponse } from "@/services/organization";'),
    ('task: Task | null;', 'task: any | null;\n  journalists?: OrgJournalistResponse[];'),
    ('const [comments, setComments] = useState<Comment[]>([]);', 'const comments = task?.comments || [];'),
    ('const journalists = MOCK_USERS.filter((u) => u.role === "journalist" && u.organizationId === task.organizationId);', ''),
    ('async function loadComments() {\n    if (task) {\n      const c = await listComments(task.id);\n      setComments(c);\n    }\n  }', ''),
    ('useEffect(() => {\n    loadComments();\n    if (task) {\n      setEditTitle(task.title);\n      setEditDesc(task.description);\n      setEditPriority(task.priority.toString());\n      setEditAssignee(task.assignedJournalistId || "none");\n      setEditDeadline(task.deadline);\n    }\n  }, [task]);',
     'useEffect(() => {\n    if (task) {\n      setEditTitle(task.title);\n      setEditDesc(task.description);\n      setEditPriority(task.priority.toString());\n      setEditAssignee(task.assignedJournalistId || "none");\n      setEditDeadline(task.deadline);\n    }\n  }, [task]);'),
    ('await updateTask(task.id, {\n      title: editTitle.trim(),\n      description: editDesc.trim(),\n      priority: parseInt(editPriority) as any,\n      assignedJournalistId: editAssignee === "none" ? undefined : editAssignee,\n      assignedJournalistName: j?.name,\n      deadline: editDeadline,\n    });',
     'if (user.role === "organization") {\n      await organizationTaskService.updateTask(task.id, {\n        title: editTitle.trim(),\n        description: editDesc.trim(),\n        priority: parseInt(editPriority),\n        deadline: editDeadline,\n      });\n      // note: assignedJournalistId update normally would happen here if API supports it\n    } else {\n      // journalists can’t update task fully\n    }'),
    ('await setStatus(task.id, s as any);', 
     'if (user.role === "organization") {\n      await organizationTaskService.updateTaskStatus(task.id, s);\n    } else {\n      await journalistTaskService.updateTaskStatus(task.id, s);\n    }'),
    ('await deleteTask(task.id);', 'await organizationTaskService.deleteTask(task.id);'),
    ('await addComment(task.id, user.id, user.name, user.role, newComment.trim());\n    setNewComment("");\n    loadComments();', 
     'if (user.role === "organization") {\n      await organizationTaskService.addComment(task.id, newComment.trim());\n    } else {\n      await journalistTaskService.addComment(task.id, newComment.trim());\n    }\n    setNewComment("");\n    onChanged();')
]
update_file(os.path.join(DIR, "task-detail-sheet.tsx"), replacements)

print("done sheet")
