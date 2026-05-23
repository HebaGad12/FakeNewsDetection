with open('FrontEnd/src/components/dashboards/task-detail-sheet.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(r'\n', '\n')
with open('FrontEnd/src/components/dashboards/task-detail-sheet.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
