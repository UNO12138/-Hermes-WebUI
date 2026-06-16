import json, os, re

nodeIds = ['1-1869', '1-1866', '1-1864', '1-1861', '1-1880', '1-1877', '1-1873', '1-1863', '1-1862', '1-1871', '1-1874', '1-1867', '1-1876', '1-1881', '1-1882', '1-1883', '1-1875']

print('节点汇总:')
print('=' * 70)

for nodeId in nodeIds:
    log_file = f'mcp_stdout_{nodeId}.log'
    with open(log_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    data = json.loads(lines[1])
    text_content = data['result']['content'][0]['text']

    # Extract name
    name_match = re.search(r'name:\s*(.+)', text_content)
    name = name_match.group(1).strip() if name_match else 'N/A'

    # Extract type
    type_match = re.search(r'type:\s*(.+)', text_content)
    node_type = type_match.group(1).strip() if type_match else 'N/A'

    # Extract dimensions
    width_match = re.search(r'width:\s*(\d+(?:\.\d+)?)', text_content)
    height_match = re.search(r'height:\s*(\d+(?:\.\d+)?)', text_content)
    width = width_match.group(1) if width_match else 'N/A'
    height = height_match.group(1) if height_match else 'N/A'

    # Count children by counting child list entries
    children_count = len(re.findall(r'children:\s*\n', text_content))

    print(f'{nodeId}: name="{name}", type={node_type}, dimensions={width}x{height}, children={children_count}')
