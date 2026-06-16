import subprocess
import json
import sys
import time
import os

# Try to find FIGMA_API_KEY from env or existing config
api_key = os.environ.get('FIGMA_API_KEY', '')

mcp_path = r'C:\Users\Asus\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\vm\tools\node\mcp_prewarm\node_modules\figma-developer-mcp\dist\bin.js'

proc = subprocess.Popen(
    ['node', mcp_path, '--stdio'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\Asus\Desktop\hermes-webui-figma',
    env={**os.environ, 'FIGMA_API_KEY': api_key}
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

line = proc.stdout.readline()
print(f"Init line: {repr(line)}", file=sys.stderr)
if line.strip():
    try:
        data = json.loads(line)
        print(f"Init JSON: {json.dumps(data, indent=2)}", file=sys.stderr)
    except Exception as e:
        print(f"Parse error: {e}", file=sys.stderr)

send_request({
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
})

# List tools
send_request({
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
})

line = proc.stdout.readline()
print(f"Tools line: {repr(line[:500])}", file=sys.stderr)
if line.strip():
    try:
        data = json.loads(line)
        print(f"Tools JSON: {json.dumps(data, indent=2)[:2000]}", file=sys.stderr)
    except Exception as e:
        print(f"Parse error: {e}", file=sys.stderr)

proc.terminate()
