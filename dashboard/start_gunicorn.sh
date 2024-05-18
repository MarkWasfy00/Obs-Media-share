#!/bin/bash

# Navigate to the directory containing wsgi.py
cd "$(dirname "$0")"

# Start Gunicorn with the specified options
exec gunicorn -b 0.0.0.0:5000 wsgi:app --worker-class eventlet -w 1

