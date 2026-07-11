#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Run a security audit on the deployed Aura Astrology app and patch Critical/High issues without compromising UX. Next milestone: WebRTC voice/video."

backend:
  - task: "SEC-001 — Real per-phone OTP (replaces universal 123456)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Added SHA-256 hashed (peppered) 6-digit OTP, 5-min expiry, single-use, 5-attempt lockout, per-phone & per-IP request throttling. DEV_OTP env flag surfaces code in response so demo works without SMS gateway."
      - working: true
        agent: "testing"
        comment: "29 dedicated tests pass — universal 123456 blocked, single-use enforced, lockout on 5 wrong attempts, 429 on 4th same-phone request in window, cross-phone codes distinct."

  - task: "SEC-002 — Wallet top-up daily & lifetime caps"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Enforces max 3 top-ups per 24h AND ₹500 amount per 24h AND ₹2000 lifetime demo cap, plus 6/min rate limit. Will be replaced by Razorpay intent+webhook in the next milestone."
      - working: true
        agent: "testing"
        comment: "All caps trigger correctly; 429 on count/amount, 400 on invalid amount, 403 on lifetime cap."

  - task: "SEC-003 — Order price derived from server catalog"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "New `_lookup_catalog_item` derives label + price_inr from REMEDIES_DATA by (item_type, item_key). Client-supplied values ignored. Invalid type → 400, unknown key → 404."
      - working: true
        agent: "testing"
        comment: "Client price/label spoofing blocked — order stored with catalog values."

  - task: "SEC-004 — Reviews bound to real user chat"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "chat_id now required. Verifies chat exists, belongs to user, matches astrologer_id, and has ≥1 user message. One review per chat. user_name derived server-side. Rate-limited 10/hr."
      - working: true
        agent: "testing"
        comment: "Missing chat_id → 400, fake chat → 404, no msgs → 400, cross-user → 403, duplicate → 409, out-of-range rating → 400/422."

  - task: "CORS hardening (P3)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "allow_credentials=False (safe with bearer auth). Origins configurable via CORS_ORIGINS env (falls back to *)."

frontend:
  - task: "Login screen — show rotating dev OTP, remove hard-coded 123456 hint"
    implemented: true
    working: true
    file: "frontend/app/(auth)/login.tsx, frontend/src/AuthContext.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "requestOtp() now returns the per-phone dev_otp when present. Login screen displays it in the OTP label and auto-fills the input for demo convenience. No UI regression."

  - task: "Wallet + Pooja order screens — updated copy/payloads for server-side price"
    implemented: true
    working: true
    file: "frontend/app/wallet.tsx, frontend/app/pooja/[key].tsx"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Wallet copy notes daily & lifetime caps. Order call unchanged in shape (still sends label/price for backward compat) but they are ignored server-side."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Security patches verified end-to-end (52/52 backend tests pass)."
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Security audit complete. Report saved to /app/SECURITY_AUDIT.md. All 4 findings (1 CRITICAL, 1 HIGH, 2 MEDIUM) patched + 1 P3 hardening. Backend regression suite: 52/52 pass. Next milestone: WebRTC voice/video."
