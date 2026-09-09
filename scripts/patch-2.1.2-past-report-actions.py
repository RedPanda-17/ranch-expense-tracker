from pathlib import Path
import json
import re

index = Path('index.html')
text = index.read_text(encoding='utf-8')

old_actions = '.report-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }'
new_actions = '.report-actions { grid-column: 1 / -1; display: flex; justify-content: flex-start; gap: 8px; flex-wrap: wrap; }'
if old_actions not in text:
    raise SystemExit('Expected report-actions CSS was not found')
text = text.replace(old_actions, new_actions, 1)

if '2.1.1' not in text:
    raise SystemExit('Expected 2.1.1 version markers were not found in index.html')
text = text.replace('2.1.1', '2.1.2')
index.write_text(text, encoding='utf-8')

sw = Path('service-worker.js')
sw_text = sw.read_text(encoding='utf-8')
if '2.1.1' not in sw_text:
    raise SystemExit('Expected 2.1.1 service-worker marker was not found')
sw.write_text(sw_text.replace('2.1.1', '2.1.2'), encoding='utf-8')

version_path = Path('version.json')
version = json.loads(version_path.read_text(encoding='utf-8'))
if version.get('version') != '2.1.1':
    raise SystemExit(f"version.json expected 2.1.1, found {version.get('version')}")
version['version'] = '2.1.2'
version['release'] = 'Past Reports Polish'
version['released'] = '2026-09-09'
version_path.write_text(json.dumps(version, indent=2) + '\n', encoding='utf-8')

readme = Path('README.md')
readme_text = readme.read_text(encoding='utf-8')
readme_text = readme_text.replace(
    'Current release: **Version 2.1.1 — Manual Accounting Review**',
    'Current release: **Version 2.1.2 — Past Reports Polish**'
)
readme.write_text(readme_text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
change_text = changelog.read_text(encoding='utf-8')
notes = '''## 2.1.2 - September 9, 2026\n\n### Changed\n- Left-aligned the Past Reports PDF and CSV actions with the report content.\n- Made the action row span the full report card instead of sitting inside the unused first grid column.\n- No expense, receipt, sync, or accounting behavior changed.\n\n'''
if notes not in change_text:
    change_text = change_text.replace('# Changelog\n\n', '# Changelog\n\n' + notes, 1)
changelog.write_text(change_text, encoding='utf-8')

release_notes = Path('RELEASE_NOTES.md')
release_text = release_notes.read_text(encoding='utf-8')
release_text = re.sub(r'# Release Notes - Version [^\n]+', '# Release Notes - Version 2.1.2', release_text, count=1)
release_text = re.sub(r'\*\*Release date:\*\* [^\n]+', '**Release date:** September 9, 2026  ', release_text, count=1)
release_text = re.sub(r'\*\*Release name:\*\* [^\n]+', '**Release name:** Past Reports Polish', release_text, count=1)
section = '''## Version 2.1.2 past reports polish\n- Aligns the Download PDF and Download CSV buttons to the left edge of each Past Reports card.\n- Keeps the buttons grouped together consistently on desktop and mobile.\n- This is a visual-only change; report generation, receipt storage, and cloud sync are unchanged.\n\n'''
if '## Version 2.1.2 past reports polish' not in release_text:
    first_section = release_text.find('## Version ')
    if first_section >= 0:
        release_text = release_text[:first_section] + section + release_text[first_section:]
    else:
        release_text += '\n' + section
release_notes.write_text(release_text, encoding='utf-8')
