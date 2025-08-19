#!/bin/bash
# Security check script to prevent sensitive keys in client code

echo "🔍 Scanning for sensitive keys in client code..."

# Check for sensitive environment variable patterns in client directories
if command -v rg >/dev/null 2>&1; then
  SEARCH_CMD="rg"
else
  SEARCH_CMD="grep -r"
fi

# Scan client directories for sensitive patterns
if $SEARCH_CMD -n "(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY)" src/ kalkulator/ 2>/dev/null; then
  echo ""
  echo "❌ SECURITY VIOLATION: Sensitive key pattern detected in client code!"
  echo "🔒 Service role keys must NEVER be exposed to the browser"
  echo ""
  echo "🛠️  Fix by:"
  echo "   1. Remove the sensitive key from client code"
  echo "   2. Use VITE_SUPABASE_PUBLISHABLE_KEY for client-side operations"
  echo "   3. Keep SERVICE_ROLE_KEY only in server environment"
  echo ""
  exit 1
else
  echo "✅ No sensitive keys found in client code"
  echo "🛡️  Security check passed"
fi
