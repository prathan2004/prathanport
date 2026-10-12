# Backend plan (Phase 4, not implemented)

Create a restricted Google Sheet owned by the school administrator. Do not share it publicly. Each table needs `created_at,updated_at` in addition to the columns below.

| Tab | Primary key | Other columns |
| --- | --- | --- |
| Teachers | teacher_id | email, role, status |
| Courses | course_id | teacher_id, code, name, academic_year, term |
| Classes | class_id | teacher_id, name, academic_year |
| Students | student_pk | teacher_id, student_id (plain text), student_no (plain text), full_name, class_id, academic_year, status |
| Enrollments | enrollment_id | teacher_id, student_pk, course_id, class_id |
| Exams | exam_id | teacher_id, course_id, class_id, name, variant, question_count, points, pass_score, template_version |
| AnswerKeys | answer_key_id | teacher_id, exam_id, version, question_no, answer, points, approved |
| AnswerSheets | sheet_id | teacher_id, exam_id, student_pk, template_version, key_version, page_count |
| ScanResults | scan_id | teacher_id, exam_id, student_pk, sheet_id, key_version, score, status, revision, image_file_id |
| StudentAnswers | answer_id | teacher_id, scan_id, question_no, answer, confidence, status, corrected_by |
| AuditLogs | audit_id | teacher_id, entity_type, entity_id, action, before_json, after_json |

## Installation when Phase 4 is ready

1. From the Sheet choose Extensions > Apps Script. The backend source will be supplied in Phase 4; there is intentionally no placeholder API advertised as functional here.
2. Store spreadsheet ID and Drive folder ID in Script Properties, not frontend environment variables. Enable required Google services/scopes, and restrict authorized teacher emails.
3. Implement server validation for every operation, ownership checks from verified identity, uniqueness constraints, request IDs for idempotency, and a ScriptLock around read-check-write operations. Store student IDs as text.
4. Test with two teachers, revoked users, duplicate requests and concurrent writes before deploying.
5. Deploy a versioned Web App with a school Workspace access policy. Apps Script `Session.getActiveUser()` is not reliably available in every execute-as-owner/external-user deployment; do not treat a user-provided email as authentication.
6. For Firebase-hosted frontend use a properly verified Google identity with a backend that can validate it, or a Workspace-restricted Apps Script HTML-service app using `google.script.run`. Google Apps Script does not provide general configurable CORS/preflight support. Do not use JSONP or `no-cors` as an authenticated read/write workaround. A separate authenticated gateway may be needed for the Firebase frontend.
7. Grant only required Drive access and keep scanned student images private. Configure retention and backups with the school.

These are setup design notes, not deployed authentication or API functionality.
