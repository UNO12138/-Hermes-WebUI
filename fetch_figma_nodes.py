import subprocess
import json
import sys
import os
import time

nodeIds = ['1-122', '1-118', '1-137', '1-144', '1-149', '1-155', '1-159', '1-164']
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

results = {}
req_id = 2

for nodeId in nodeIds:
    # nodeId format for API: convert 1-122 to 1:122
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

    # Read response
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

        # Save to file
        if 'result' in resp and 'content' in resp['result']:
            text_content = resp['result']['content'][0]['text']
            output_path = os.path.join(r'c:\Users\Asus\Desktop\hermes-webui-figma', f'figma-node-{nodeId}.yaml')
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text_content)
            print(f"Saved {output_path}", file=sys.stderr)
        else:
            print(f"Unexpected response for {nodeId}: {resp}", file=sys.stderr)
            results[nodeId] = resp

    except Exception as e:
        print(f"Error for node {nodeId}: {e}", file=sys.stderr)
        results[nodeId] = {"error": str(e)}

    req_id += 1
    time.sleep(0.5)

proc.terminate()

# Print summary
print("\n=== SUMMARY ===")
for nodeId in nodeIds:
    resp = results.get(nodeId, {})
    if 'result' in resp and 'content' in resp['result']:
        text = resp['result']['content'][0]['text']
        print(f"{nodeId}: OK")
    else:
        print(f"{nodeId}: FAILED - {resp}")
