set -euo pipefail
cd "$(dirname "$0")/.."
cd server
exec node server.js
