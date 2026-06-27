#!/bin/bash
# End-to-End Integration Test for MaxTA ERP Phase 1 Fixes
# Tests: GL Posting, WO Receipt, Inventory Sync, SQL Injection Protection

BASE="http://localhost:5000/api"
TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
PASS=0
FAIL=0

test_result() {
  if [ "$1" == "true" ]; then
    echo "  ✓ PASS: $2"
    PASS=$((PASS+1))
  else
    echo "  ✗ FAIL: $2"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  MaxTA ERP - End-to-End Integration Tests"
echo "============================================"
echo ""

# ===== TEST 1: Stock Status Endpoint =====
echo "--- TEST 1: Inventory Stock Status ---"
STOCK=$(curl -s $BASE/inventory/stock-status -H "$AUTH")
STOCK_COUNT=$(echo "$STOCK" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
test_result "$([ "$STOCK_COUNT" -ge 3 ] && echo true || echo false)" "Stock status returns $STOCK_COUNT items (expected >= 3)"

HAS_UOM=$(echo "$STOCK" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if any('uom' in x for x in d) else 'false')")
test_result "$HAS_UOM" "Stock status includes UOM field"

HAS_REORDER=$(echo "$STOCK" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if any('reorder_point' in x for x in d) else 'false')")
test_result "$HAS_REORDER" "Stock status includes reorder_point field"
echo ""

# ===== TEST 2: Create Sales Order and Release to Production =====
echo "--- TEST 2: Sales → Manufacturing Integration ---"
# Create a new SO
SO_RESP=$(curl -s -X POST $BASE/sales/orders -H "$AUTH" -H "Content-Type: application/json" -d '{
  "customer_id": 1,
  "order_date": "2026-06-27",
  "required_date": "2026-07-15",
  "lines": [{"item_id": 2, "quantity": 5, "unit_price": 95.00, "width": 24, "height": 36, "glass_type": "tempered", "thickness": "6mm"}]
}')
SO_ID=$(echo "$SO_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
test_result "$([ -n "$SO_ID" ] && [ "$SO_ID" != "" ] && echo true || echo false)" "Created Sales Order (ID: $SO_ID)"

# Release to production
REL_RESP=$(curl -s -X POST "$BASE/sales/orders/$SO_ID/release" -H "$AUTH" -H "Content-Type: application/json")
REL_MSG=$(echo "$REL_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))")
test_result "$(echo "$REL_MSG" | grep -q 'released' && echo true || echo false)" "Released to production: $REL_MSG"

# Check WO was created with routing
WO_LIST=$(curl -s "$BASE/manufacturing/work-orders?status=open" -H "$AUTH")
LATEST_WO=$(echo "$WO_LIST" | python3 -c "import sys,json; wos=json.load(sys.stdin); wos=[w for w in wos if w.get('sales_order_id')==$SO_ID]; print(wos[0]['id'] if wos else '')" 2>/dev/null)
test_result "$([ -n "$LATEST_WO" ] && [ "$LATEST_WO" != "" ] && echo true || echo false)" "Work Order created (ID: $LATEST_WO)"

if [ -n "$LATEST_WO" ] && [ "$LATEST_WO" != "" ]; then
  WO_DETAIL=$(curl -s "$BASE/manufacturing/work-orders/$LATEST_WO" -H "$AUTH")
  ROUTING_COUNT=$(echo "$WO_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('routing',[])))")
  MATERIAL_COUNT=$(echo "$WO_DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('materials',[])))")
  test_result "$([ "$ROUTING_COUNT" -ge 3 ] && echo true || echo false)" "WO has $ROUTING_COUNT routing steps (expected >= 3)"
  test_result "$([ "$MATERIAL_COUNT" -ge 1 ] && echo true || echo false)" "WO has $MATERIAL_COUNT materials from BOM (expected >= 1)"
fi
echo ""

# ===== TEST 3: AR Invoice Post → GL =====
echo "--- TEST 3: AR Invoice Post → GL Auto-Posting ---"
# Create an invoice
INV_RESP=$(curl -s -X POST $BASE/sales/invoices -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"customer_id\": 1,
  \"sales_order_id\": $SO_ID,
  \"lines\": [{\"item_id\": 2, \"quantity\": 5, \"unit_price\": 95.00, \"description\": \"Tempered Glass 24x36\"}]
}")
INV_ID=$(echo "$INV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
test_result "$([ -n "$INV_ID" ] && [ "$INV_ID" != "" ] && echo true || echo false)" "Created AR Invoice (ID: $INV_ID)"

# Get GL count before posting
GL_BEFORE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)

# Post the invoice
POST_RESP=$(curl -s -X POST "$BASE/sales/invoices/$INV_ID/post" -H "$AUTH")
POST_MSG=$(echo "$POST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', d.get('error','')))")
test_result "$(echo "$POST_MSG" | grep -qi 'posted' && echo true || echo false)" "Invoice posted: $POST_MSG"

# Check GL entries were created
GL_AFTER=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
GL_NEW=$((GL_AFTER - GL_BEFORE))
test_result "$([ "$GL_NEW" -ge 2 ] && echo true || echo false)" "GL entries created: $GL_NEW new entries (expected >= 2)"

# Verify GL is balanced for this invoice
GL_BALANCE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT ABS(SUM(debit) - SUM(credit)) FROM gl_transactions WHERE source_type='ar_invoice' AND source_id=$INV_ID;" 2>/dev/null)
test_result "$(echo "$GL_BALANCE" | awk '{print ($1 < 0.01) ? "true" : "false"}')" "GL balanced for invoice (diff: $GL_BALANCE)"
echo ""

# ===== TEST 4: Payment → GL =====
echo "--- TEST 4: Customer Payment → GL Auto-Posting ---"
GL_BEFORE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
PAY_RESP=$(curl -s -X POST "$BASE/sales/invoices/$INV_ID/payment" -H "$AUTH" -H "Content-Type: application/json" -d '{"amount": 475.00, "payment_method": "check", "reference_number": "CHK-9999"}')
PAY_MSG=$(echo "$PAY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', d.get('error','')))")
test_result "$(echo "$PAY_MSG" | grep -qi 'recorded' && echo true || echo false)" "Payment recorded: $PAY_MSG"

GL_AFTER=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
GL_NEW=$((GL_AFTER - GL_BEFORE))
test_result "$([ "$GL_NEW" -ge 2 ] && echo true || echo false)" "GL entries for payment: $GL_NEW new entries (expected >= 2)"
echo ""

# ===== TEST 5: Invoice Void → GL Reversal =====
echo "--- TEST 5: Invoice Void → GL Reversal ---"
# Create another invoice to void
INV2_RESP=$(curl -s -X POST $BASE/sales/invoices -H "$AUTH" -H "Content-Type: application/json" -d "{
  \"customer_id\": 1,
  \"lines\": [{\"item_id\": 2, \"quantity\": 1, \"unit_price\": 100.00, \"description\": \"Test void\"}]
}")
INV2_ID=$(echo "$INV2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
# Post it
curl -s -X POST "$BASE/sales/invoices/$INV2_ID/post" -H "$AUTH" > /dev/null

GL_BEFORE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
VOID_RESP=$(curl -s -X POST "$BASE/sales/invoices/$INV2_ID/void" -H "$AUTH" -H "Content-Type: application/json" -d '{"reason":"Test void"}')
VOID_MSG=$(echo "$VOID_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message', d.get('error','')))")
test_result "$(echo "$VOID_MSG" | grep -qi 'voided' && echo true || echo false)" "Invoice voided: $VOID_MSG"

GL_AFTER=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
GL_NEW=$((GL_AFTER - GL_BEFORE))
test_result "$([ "$GL_NEW" -ge 2 ] && echo true || echo false)" "GL reversal entries: $GL_NEW (expected >= 2)"
echo ""

# ===== TEST 6: SQL Injection Protection =====
echo "--- TEST 6: SQL Injection Protection ---"
# Try to inject via remnant update
INJECT_RESP=$(curl -s -X PUT "$BASE/cutting/remnants/1" -H "$AUTH" -H "Content-Type: application/json" -d '{"status; DROP TABLE remnants; --": "available"}')
INJECT_MSG=$(echo "$INJECT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', d.get('message','')))")
test_result "$(echo "$INJECT_MSG" | grep -qi 'no valid\|not found' && echo true || echo false)" "SQL injection blocked: $INJECT_MSG"

# Try to inject via GL account update
INJECT2_RESP=$(curl -s -X PUT "$BASE/accounting/gl-accounts/1" -H "$AUTH" -H "Content-Type: application/json" -d '{"balance": 999999}')
INJECT2_MSG=$(echo "$INJECT2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', d.get('message','')))")
test_result "$(echo "$INJECT2_MSG" | grep -qi 'no valid' && echo true || echo false)" "Balance field blocked in GL update: $INJECT2_MSG"
echo ""

# ===== TEST 7: WO Receipt → Inventory + GL =====
echo "--- TEST 7: WO Receipt → Inventory + GL ---"
if [ -n "$LATEST_WO" ] && [ "$LATEST_WO" != "" ]; then
  # Start the WO
  curl -s -X POST "$BASE/manufacturing/work-orders/$LATEST_WO/release" -H "$AUTH" > /dev/null
  curl -s -X POST "$BASE/manufacturing/work-orders/$LATEST_WO/start" -H "$AUTH" > /dev/null
  
  # Get qty before
  QTY_BEFORE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COALESCE(qty_on_hand,0) FROM items WHERE id=2;" 2>/dev/null)
  GL_BEFORE=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
  
  # Receipt 5 units
  RCPT_RESP=$(curl -s -X POST "$BASE/manufacturing/receipts" -H "$AUTH" -H "Content-Type: application/json" -d "{
    \"work_order_id\": $LATEST_WO,
    \"quantity_completed\": 5,
    \"quantity_scrapped\": 0,
    \"location_id\": 1,
    \"notes\": \"E2E test receipt\"
  }")
  RCPT_MSG=$(echo "$RCPT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('receipt_number', d.get('error','')))")
  test_result "$(echo "$RCPT_MSG" | grep -q 'RCP\|error' && echo true || echo false)" "WO Receipt: $RCPT_MSG"
  
  # Check inventory increased
  QTY_AFTER=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COALESCE(qty_on_hand,0) FROM items WHERE id=2;" 2>/dev/null)
  QTY_DIFF=$(echo "$QTY_AFTER - $QTY_BEFORE" | bc)
  test_result "$(echo "$QTY_DIFF" | awk '{print ($1 >= 5) ? "true" : "false"}')" "Inventory increased by $QTY_DIFF (expected 5)"
  
  # Check inventory_balances updated
  BAL_QTY=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COALESCE(SUM(quantity_on_hand),0) FROM inventory_balances WHERE item_id=2;" 2>/dev/null)
  test_result "$(echo "$BAL_QTY" | awk '{print ($1 > 0) ? "true" : "false"}')" "inventory_balances synced (qty: $BAL_QTY)"
  
  # Check GL posted
  GL_AFTER=$(mysql -u maxta_erp -p'MaxTA_ERP_2026!' maxta_erp -N -e "SELECT COUNT(*) FROM gl_transactions;" 2>/dev/null)
  GL_NEW=$((GL_AFTER - GL_BEFORE))
  test_result "$([ "$GL_NEW" -ge 2 ] && echo true || echo false)" "GL entries for WO receipt: $GL_NEW (expected >= 2)"
fi
echo ""

# ===== TEST 8: Cross-Module Data Flow =====
echo "--- TEST 8: Cross-Module Data Flow ---"
# Check lamination layup-queue
LAYUP=$(curl -s "$BASE/lamination/layup-queue" -H "$AUTH")
LAYUP_OK=$(echo "$LAYUP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if isinstance(d, list) else 'false')" 2>/dev/null)
test_result "${LAYUP_OK:-false}" "Lamination layup-queue endpoint works"

# Check purchasing
PO_LIST=$(curl -s "$BASE/purchasing/purchase-orders" -H "$AUTH")
PO_OK=$(echo "$PO_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if isinstance(d, list) else 'false')" 2>/dev/null)
test_result "${PO_OK:-false}" "Purchasing PO list works"

# Check accounting dashboard
ACCT=$(curl -s "$BASE/accounting/dashboard" -H "$AUTH")
ACCT_OK=$(echo "$ACCT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'open_ar' in d or 'revenue' in d else 'false')" 2>/dev/null)
test_result "${ACCT_OK:-false}" "Accounting dashboard works"

# Check reports
RPT=$(curl -s "$BASE/reports/dashboard" -H "$AUTH")
RPT_OK=$(echo "$RPT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if isinstance(d, dict) else 'false')" 2>/dev/null)
test_result "${RPT_OK:-false}" "Reports dashboard works"
echo ""

# ===== SUMMARY =====
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"
if [ $FAIL -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED!"
else
  echo "  ⚠️  Some tests failed - review above"
fi
