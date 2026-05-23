import os
DIR = "FrontEnd/src/components/dashboards/"
files = ["create-task-dialog.tsx", "task-detail-sheet.tsx", "organization-tasks-page.tsx", "journalist-tasks-page.tsx", "task-badges.tsx"]
for fn in files:
    fp = os.path.join(DIR, fn)
    if not os.path.exists(fp): continue
    with open(fp, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("assigneeId", "assignedJournalistId")
    c = c.replace("assigneeName", "assignedJournalistName")
    c = c.replace("Assignee", "AssignedJournalist")
    c = c.replace("assignee", "assignedJournalist")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(c)
print("Done")