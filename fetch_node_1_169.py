import subprocess
import json
import sys
import os
import time

nodeId = '1-169'
fileKey = 'j43TBYc4ydHZSkDTXbGsc2'

# Start the MCP server process using the same approach as the working logs
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

# Read initialize response - may need to wait for server to start
time.sleep(2)
line = proc.stdout.readline()
if not line:
    # Try again after a bit more time
    time.sleep(3)
    line = proc.stdout.readline()

if not line:
    print("No initialize response received", file=sys.stderr)
    # Check stderr for errors
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

# nodeId format for API: convert 1-169 to 1:169
api_node_id = nodeId.replace('-', ':')
print(f"Fetching node {nodeId}...", file=sys.stderr)

send_request({
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "get_figma_data",
        "arguments": {
            "fileKey": fileKey,
            "nodeId": api_node_id
        }
    }
})

# Read response
line = proc.stdout.readline()
if not line:
    print("No response for tool call", file=sys.stderr)
    err = proc.stderr.read()
    print(f"Stderr: {err}", file=sys.stderr)
    proc.terminate()
    sys.exit(1)

resp = json.loads(line)

# Save to file
if 'result' in resp and 'content' in resp['result']:
    text_content = resp['result']['content'][0]['text']
    output_path = os.path.join(r'c:\Users\Asus\Desktop\hermes-webui-figma', f'figma-node-{nodeId}.yaml')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text_content)
    print(f"Saved {output_path}", file=sys.stderr)
else:
    print(f"Unexpected response: {resp}", file=sys.stderr)
    # Save raw response for debugging
    output_path = os.path.join(r'c:\Users\Asus\Desktop\hermes-webui-figma', f'figma-node-{nodeId}-raw.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(resp, f, ensure_ascii=False, indent=2)
    print(f"Saved raw response to {output_path}", file=sys.stderr)

proc.terminate()

# Print summary
if 'result' in resp and 'content' in resp['result']:
    print("SUCCESS")
else:
    print("FAILED")
