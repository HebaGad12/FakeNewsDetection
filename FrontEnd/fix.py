with open('src/components/dashboards/create-task-dialog.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'await createTask\(\s*\{[\s\S]*?\}\s*\);',
'await organizationTaskService.createTask({\n      title: title.trim(),\n      description: description.trim(),\n      priority: parseInt(priority),\n      deadline,\n      assignedJournalistId: assignedJournalist === \"none\" ? \"\" : assignedJournalist,\n    });', text)

with open('src/components/dashboards/create-task-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
