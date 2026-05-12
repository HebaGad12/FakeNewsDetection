import re
with open('FrontEnd/src/components/dashboards/JournalistDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'\{activeTab === \"tasks\" && \([\s\S]*?\</motion\.div\>\n        \)}', text)
if m:
    s_idx = m.start()
    e_idx = m.end()
    new_text = text[:s_idx] + '{activeTab === \"tasks\" && (\n          <JournalistTasksPage user={user} />\n        )}' + text[e_idx:]
    if 'import { JournalistTasksPage }' not in text:
        new_text = 'import { JournalistTasksPage } from \"./journalist-tasks-page\";\n' + new_text
    with open('FrontEnd/src/components/dashboards/JournalistDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Replaced.')
else:
    print('Not found')
