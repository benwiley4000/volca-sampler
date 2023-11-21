#!/usr/bin/env python3

from http.server import test, SimpleHTTPRequestHandler
import webbrowser

webbrowser.open_new('http://localhost:54411')
test(SimpleHTTPRequestHandler, port=54411)
