import re
with open('FrontEnd/src/components/dashboards/JournalistDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'\{activeTab === \"tasks\".{0,5000}', text, re.DOTALL)
if m:
    val = m.group(0)
    print(val[:800])
