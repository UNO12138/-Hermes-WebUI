import subprocess
import json
import sys
import os
import time

mcp_path = r'C:\Users\Asus\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\vm\tools\node\mcp_prewarm\node_modules\figma-developer-mcp\dist\bin.js'

proc = subprocess.Popen(
    ['node', mcp_path, '--stdio'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\Asus\Desktop\hermes-webui-figma',
    env={**os.environ}
)

def send_request(req_obj):
    line = json.dumps(req_obj)
    proc.stdin.write(line + '\n')

# Initialize
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
print("Init response received", file=sys.stderr)

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
print("Tools response received", file=sys.stderr)

# Call get_figma_data for node 1-122
send_request({
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
        "name": "get_figma_data",
        "arguments": {
            "fileKey": "j43TBYc4ydHZSkDTXbGsc2",
            "nodeId": "1-122"
        }
    }
})

# Wait a bit for the server to process
import threading

def read_stdout():
    for i in range(50):
        line = proc.stdout.readline()
        if not line:
            break
        print(line.strip())

def read_stderr():
    for i in range(50):
        line = proc.stderr.readline()
        if not line:
            break
        print("ERR:", line.strip(), file=sys.stderr)

t1 = threading.Thread(target=read_stdout)
t2 = threading.Thread(target=read_stderr)
t1.start()
t2.start()

time.sleep(5)

proc.terminate()
t1.join(timeout=2)
t2.join(timeout=2)
