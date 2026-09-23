
import http.server
import socketserver
import urllib.request
import json
import base64

PORT = 19876

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        req = json.loads(post_data.decode('utf-8'))
        file_path = req['path']
        try:
            with open(file_path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'size': len(data), 'b64': base64.b64encode(data).decode('ascii')}).encode('ascii'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('ascii'))

with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    print('TUNNEL_READY')
    httpd.serve_forever()
