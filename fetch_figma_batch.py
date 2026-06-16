import subprocess
import json
import sys
import os
import time

# 15个节点ID
nodeIds = [
    '1-37', '1-63', '1-55', '1-44', '1-49',
    '1-76', '1-74', '1-56', '1-57', '1-58',
    '1-75', '1-59', '1-77', '1-91', '1-90'
]
fileKey = 'j43TBYc4ydHZSkDTXbGsc2'

# Start the MCP server process
proc = subprocess.Popen(
    ['powershell.exe', '-Command', 'npx @tmegit/figma-developer-mcp --json'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\Asus\Desktop\hermes-webui-figma'
)

def send_request(req_obj):
    line = json.dumps(req_obj)
    proc.stdin.write(line + '\n')
    proc.stdin.flush()

# Send initialize request
send_request({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "1.0.0"}
    }
})

# Read initialize response
time.sleep(2)
line = proc.stdout.readline()
if not line:
    time.sleep(3)
    line = proc.stdout.readline()

if not line:
    print("No initialize response received", file=sys.stderr)
    err = proc.stderr.read()
    print(f"Stderr: {err}", file=sys.stderr)
    proc.terminate()
    sys.exit(1)

init_resp = json.loads(line)
print(f"Initialize response: {init_resp.get('id')}", file=sys.stderr)

# Send initialized notification
send_request({
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
})

results = {}
req_id = 2

for nodeId in nodeIds:
    api_node_id = nodeId.replace('-', ':')
    print(f"Fetching node {nodeId}...", file=sys.stderr)

    send_request({
        "jsonrpc": "2.0",
        "id": req_id,
        "method": "tools/call",
        "params": {
            "name": "get_figma_data",
            "arguments": {
                "fileKey": fileKey,
                "nodeId": api_node_id
            }
        }
    })

    try:
        line = proc.stdout.readline()
        if not line:
            print(f"No response for node {nodeId}, retrying...", file=sys.stderr)
            send_request({
                "jsonrpc": "2.0",
                "id": req_id + 1000,
                "method": "tools/call",
                "params": {
                    "name": "get_figma_data",
                    "arguments": {
                        "fileKey": fileKey,
                        "nodeId": api_node_id
                    }
                }
            })
            line = proc.stdout.readline()

        resp = json.loads(line)
        results[nodeId] = resp

        if 'result' in resp and 'content' in resp['result']:
            text_content = resp['result']['content'][0]['text']
            output_path = os.path.join(r'c:\Users\Asus\Desktop\hermes-webui-figma', f'figma-node-{nodeId}.yaml')
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text_content)
            print(f"Saved {output_path}", file=sys.stderr)
        else:
            print(f"Unexpected response for {nodeId}: {resp}", file=sys.stderr)

    except Exception as e:
        print(f"Error for node {nodeId}: {e}", file=sys.stderr)
        results[nodeId] = {"error": str(e)}

    req_id += 1
    time.sleep(0.5)

proc.terminate()

print("\n=== SUMMARY ===")
for nodeId in nodeIds:
    resp = results.get(nodeId, {})
    if 'result' in resp and 'content' in resp['result']:
        print(f"{nodeId}: OK")
    else:
        print(f"{nodeId}: FAILED - {resp}")
