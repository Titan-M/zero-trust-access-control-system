# Project Outline

## 1. Project Title

Context-Aware Zero-Trust Access Control System for Secure Web Applications

## 2. Team Details

- Student 1: Maandar Devaneson (C148)
- Student 2: Manthan Maheshwari (C151)
- Contact Details: To be added (Email / Phone)

Assigned Roles:

- Student 1: Backend development, authentication system, risk scoring engine
- Student 2: Frontend dashboard, audit logging, testing, and documentation

## 3. Problem Statement

Traditional authentication systems allow users to access resources once they successfully log in. However, many cyberattacks occur after login due to stolen credentials, insider threats, or suspicious activity that is not detected by traditional access control systems.

Modern cybersecurity solutions follow the Zero Trust model where every access request is verified based on multiple contextual parameters such as device trust, login behavior, time of access, and network location.

This project aims to design and implement a context-aware Zero-Trust access control system that evaluates every access request using a risk-based decision engine before granting access to protected resources.

## 4. Objectives

- Design and implement a Zero-Trust-based access control system.
- Develop a risk scoring engine to analyze contextual parameters.
- Implement dynamic access decisions:
  - Allow
  - Deny
  - Require Additional Verification
- Maintain detailed audit logs for all access attempts.
- Create a monitoring dashboard to visualize suspicious activities.

## 5. Project Scope

Included:

- Secure login system with authentication
- Context-aware access verification
- Risk scoring engine based on security rules
- Audit logging and monitoring dashboard

Excluded:

- Large-scale enterprise deployment
- Hardware-level device fingerprinting
- Complex machine learning models

Feasibility:

- The system will be developed using commonly available development tools and completed within the academic semester timeline.

## 6. Components Required

Software / Technologies:

- Python (FastAPI or Flask)
- PostgreSQL / SQLite database
- HTML, CSS, JavaScript (or React)
- JWT authentication
- Python security libraries

Development Tools:

- Visual Studio Code
- GitHub
- Postman for API testing

## 7. Methodology / Approach

System Workflow:

1. User logs into the system.
2. When accessing a protected resource, the system collects contextual information:
   - User role
   - IP address
   - Device status
   - Login time
3. Risk Scoring Engine evaluates these parameters and calculates a risk score.
4. Policy Decision Engine determines response:
   - Allow Access
   - Require Additional Authentication (MFA)
   - Deny Access
5. All actions are recorded in an Audit Log database.
6. Administrators monitor system activity using a security dashboard.

## 8. Timeline (Milestones)

- Week 1: Project planning and authentication system development
- Week 2: Database setup and context collection module
- Week 3: Risk scoring engine implementation
- Week 4: Policy decision engine development
- Week 5: Audit logging system implementation
- Week 6: Admin monitoring dashboard
- Week 7: Testing and debugging
- Week 8: Documentation and final presentation preparation

## 9. Expected Outcomes

Tangible Outcomes:

- Working prototype of the Zero-Trust access control system
- Admin monitoring dashboard
- Project documentation and presentation

Intangible Outcomes:

- Understanding of Zero-Trust cybersecurity architecture
- Practical experience with secure system design
- Improved teamwork and problem-solving skills

## 10. Deliverables

- Functional web application prototype
- Project report
- Architecture diagram
- Presentation slides
- Demonstration of the system

