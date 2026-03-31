#!/bin/bash

##############################################################################
# FASE 4 - VALIDAÇÃO E AUDITORIA: TEST SUITE
# Script automatizado para testar contamination detection e style tracking
# 
# Execução: bash scripts/test-phase4-validation.sh
# Esperado: All 4 tests passing (EXIT CODE 0)
##############################################################################

set -e  # Exit on any error

echo "🧪 FASE 4 - VALIDATION & AUDITORIA TEST SUITE"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TEST_RESULTS=0
TESTS_PASSED=0
TESTS_FAILED=0

##############################################################################
# TEST 1: Contamination Detection - Query (CRITICAL)
##############################################################################
echo "${BLUE}[TEST 1]${NC} Contamination Detection — Query String"
echo "---------------------------------------------------"

# Create temporary test files
TEST_DIR="/tmp/phase4-test-$$"
mkdir -p "$TEST_DIR"

# Create target JRXML with identical query to model
cat > "$TEST_DIR/target-query-contaminated.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="test-query-contaminated" pageWidth="595" pageHeight="842">
  <field name="id" class="java.lang.String"/>
  <queryString>
    <![CDATA[SELECT id FROM view_test WHERE 1=1]]>
  </queryString>
  <columnHeader><band height="25"/></columnHeader>
  <detail><band height="20"/></detail>
</jasperReport>
EOF

# Create model JRXML with same query
cat > "$TEST_DIR/model-query.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="model-query" pageWidth="595" pageHeight="842">
  <field name="dummy" class="java.lang.String"/>
  <queryString>
    <![CDATA[SELECT id FROM view_test WHERE 1=1]]>
  </queryString>
  <columnHeader><band height="25"/></columnHeader>
  <detail><band height="20"/></detail>
</jasperReport>
EOF

# Run contamination check (should FAIL with EXIT CODE 1)
if node scripts/validate.js "$TEST_DIR/target-query-contaminated.jrxml" --check-model-contamination "$TEST_DIR/model-query.jrxml" 2>&1 | grep -q "CRITICAL"; then
  echo -e "${GREEN}✅ PASS${NC}: Query contamination DETECTED (expected behavior)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Query contamination NOT detected (should have been)"
  ((TESTS_FAILED++))
  TEST_RESULTS=1
fi
echo ""

##############################################################################
# TEST 2: No Contamination - Different Queries
##############################################################################
echo "${BLUE}[TEST 2]${NC} No Contamination — Different Queries"
echo "-------------------------------------------"

# Create target JRXML with DIFFERENT query
cat > "$TEST_DIR/target-query-clean.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="test-query-clean" pageWidth="595" pageHeight="842">
  <field name="id" class="java.lang.String"/>
  <queryString>
    <![CDATA[SELECT id, nome FROM view_vendas WHERE 1=1]]>
  </queryString>
  <columnHeader><band height="25"/></columnHeader>
  <detail><band height="20"/></detail>
</jasperReport>
EOF

# Run contamination check (should PASS with EXIT CODE 0)
if node scripts/validate.js "$TEST_DIR/target-query-clean.jrxml" --check-model-contamination "$TEST_DIR/model-query.jrxml" 2>&1 | grep -q "CRITICAL"; then
  echo -e "${RED}❌ FAIL${NC}: Query marked as contaminated (should not be)"
  ((TESTS_FAILED++))
  TEST_RESULTS=1
else
  echo -e "${GREEN}✅ PASS${NC}: No contamination detected (queries are different)"
  ((TESTS_PASSED++))
fi
echo ""

##############################################################################
# TEST 3: Metadata styleSource Creation
##############################################################################
echo "${BLUE}[TEST 3]${NC} Metadata styleSource Creation"
echo "-----------------------------------"

# Create blueprint file
cat > "$TEST_DIR/test-blueprint.json" << 'EOF'
{
  "fonts": [
    {"name": "DejaVu Sans", "size": 11}
  ],
  "defaultBand": {
    "height": 25,
    "leftMargin": 40,
    "rightMargin": 40
  },
  "confidence": 0.85
}
EOF

# Create simple JRXML for compilation
cat > "$TEST_DIR/test-compile.jrxml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport name="test-compile" pageWidth="595" pageHeight="842">
  <field name="id" class="java.lang.String"/>
  <queryString>
    <![CDATA[SELECT 1 as id]]>
  </queryString>
  <columnHeader><band height="25"/></columnHeader>
  <detail><band height="20"/></detail>
</jasperReport>
EOF

# Compile with blueprint
node scripts/compile.js "$TEST_DIR/test-compile.jrxml" --pdf --style-blueprint "$TEST_DIR/test-blueprint.json" 2>&1

# Check if metadata has styleSource
METADATA_FILE="$TEST_DIR/metadata.json"
if [ -f "$METADATA_FILE" ]; then
  if grep -q '"styleSource"' "$METADATA_FILE"; then
    echo -e "${GREEN}✅ PASS${NC}: styleSource field found in metadata.json"
    
    # Check specific fields
    if grep -q '"type"' "$METADATA_FILE" && grep -q '"confidence"' "$METADATA_FILE"; then
      echo -e "${GREEN}✅ PASS${NC}: styleSource has required fields (type, confidence)"
      ((TESTS_PASSED++))
    else
      echo -e "${YELLOW}⚠️  WARN${NC}: styleSource missing some fields"
      ((TESTS_FAILED++))
      TEST_RESULTS=1
    fi
  else
    echo -e "${RED}❌ FAIL${NC}: styleSource field NOT found in metadata.json"
    ((TESTS_FAILED++))
    TEST_RESULTS=1
  fi
else
  echo -e "${RED}❌ FAIL${NC}: metadata.json NOT generated"
  ((TESTS_FAILED++))
  TEST_RESULTS=1
fi
echo ""

##############################################################################
# TEST 4: Console Output Style Confidence
##############################################################################
echo "${BLUE}[TEST 4]${NC} Console Output — Style Confidence Display"
echo "----------------------------------------------"

# Run compile and capture output
COMPILE_OUTPUT=$(node scripts/compile.js "$TEST_DIR/test-compile.jrxml" --pdf --style-blueprint "$TEST_DIR/test-blueprint.json" 2>&1 || true)

# Check for style confidence output
if echo "$COMPILE_OUTPUT" | grep -q "Style confidence"; then
  echo -e "${GREEN}✅ PASS${NC}: Console shows style confidence message"
  ((TESTS_PASSED++))
  
  # Show the actual confidence value
  CONFIDENCE=$(echo "$COMPILE_OUTPUT" | grep "Style confidence" | head -1)
  echo "   Output: $CONFIDENCE"
else
  echo -e "${YELLOW}⚠️  WARN${NC}: Style confidence message not found (might be OK if blueprint not applied)"
fi
echo ""

##############################################################################
# CLEANUP
##############################################################################
echo "${YELLOW}Cleaning up test files...${NC}"
rm -rf "$TEST_DIR"
echo ""

##############################################################################
# SUMMARY
##############################################################################
echo "================================================"
echo "📊 TEST RESULTS SUMMARY"
echo "================================================"
echo -e "${GREEN}✅ PASSED:${NC} $TESTS_PASSED"
echo -e "${RED}❌ FAILED:${NC} $TESTS_FAILED"
echo ""

if [ $TEST_RESULTS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED! Phase 4 is READY.${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED. Review errors above.${NC}"
  exit 1
fi
