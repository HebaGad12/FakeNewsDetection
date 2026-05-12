import re
with open('FrontEnd/src/components/dashboards/OrganizationDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'\{/\* TASKS TAB \*/\}(.*?)(?=\</AnimatePresence\>)', text, re.DOTALL)
if m:
    s_idx = m.start()
    e_idx = m.end()
    print('Found! Start:', s_idx, 'End:', e_idx)
    new_text = text[:s_idx] + '{/* TASKS TAB */}\n          {activeTab == \"tasks\" && (\n            <OrganizationTasksPage user={user} journalists={journalists} />\n          )}\n          ' + text[e_idx:]
    if 'import { OrganizationTasksPage }' not in text:
        new_text = 'import { OrganizationTasksPage } from \"./organization-tasks-page\";\n' + new_text
    with open('FrontEnd/src/components/dashboards/OrganizationDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Replaced.')
else:
    print('Not found')
