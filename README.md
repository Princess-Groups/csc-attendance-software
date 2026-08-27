# Sweet Payroll

CCS ATTENDANCE & SALARY MANAGEMENT SOFTWARE

Complete Software Development Prompt

Build a professional CCS Attendance & Salary Management Software with a modern Bubbly Pink / Bubblegum Pink UI.

The software must have 3 role-based portals:

Staff

Admin

Super Admin

1. DESIGN & COLOR THEME

Use ONLY a pink-based bubbly theme throughout the software.

Main Color Direction

Bubbly Pink

Bubblegum Pink

Bubbly Tint Pink

Soft Light Pink

White

Very light pink backgrounds

Pink gradients where appropriate

The overall UI should feel:

Modern

Clean

Soft

Cute / Bubbly

Professional

Mobile responsive

Easy to use

UI Style

Use:

Rounded cards

Rounded buttons

Soft shadows

Bubble-style UI elements

Smooth hover effects

Pink gradient highlights

Clean dashboard cards

Modern icons

Responsive tables

Mobile-friendly layout

Do NOT use unrelated color themes. The complete software should remain within the Bubbly Pink / Bubblegum Pink / Pink Tint + White color family.

2. LOGIN SYSTEM

Create a secure role-based login system.

There must be 3 separate access levels:

STAFF LOGIN

Staff login using:

User ID: Staff Name + 2026

Example:

Harshini2026

Password can be configured by Admin/Super Admin.

ADMIN LOGIN

Admin must have a separate User ID and Password.

Admin can access:

Staff attendance

Staff login/logout

Leave

Late records

Monthly attendance

Salary calculation

Staff management

Reports

However, Admin must NOT be able to modify the core salary calculation rules.

SUPER ADMIN LOGIN

Super Admin has complete control.

Super Admin can access:

Everything available to Admin

Salary calculation settings

Attendance rules

Leave rules

Exceptions

Incentives

Manual adjustments

Edit

Delete

User management

System settings

Audit history

Super Admin is the highest authority.

3. STAFF PORTAL

After Staff Login, show a personal Staff Dashboard.

The Staff member should only be able to see their own information.

Staff Dashboard

Display:

Staff Name

Employee ID

Current Month

Today's Date

Today's Attendance Status

Login Time

Logout Time

Total Working Days

Present Days

Leave Days

Paid Leave

Unpaid Leave

Late Days

Delay / Late Hours

Half Days

Attendance Percentage

4. STAFF LOGIN / LOGOUT

Staff must have:

LOGIN BUTTON

When Staff clicks Login:

Automatically record:

Date

Login Time

Staff Name

Staff ID

Attendance status

Example:

10-Aug-2026 | Login | 09:03 AM

LOGOUT BUTTON

When Staff clicks Logout:

Automatically record:

Logout Date

Logout Time

Working Duration

Example:

10-Aug-2026 | Logout | 06:02 PM | 8h 59m

Staff must not be able to manually change login/logout timestamps.

5. MONTHLY ATTENDANCE

Create a Monthly Attendance section.

Staff should be able to see their complete monthly attendance.

Example:

DateLoginLogoutStatusLateLeave01-Aug09:00 AM06:00 PMPresentNoNo02-Aug09:12 AM06:00 PMPresentYesNo03-Aug--Leave-Yes

At the bottom show:

Total Working Days

Present Days

Leave Days

Paid Leave

Unpaid Leave

Late Days

Half Days

Total Working Hours

6. LEAVE MANAGEMENT

Staff must be able to see their leave information.

Display:

Leave Summary

Total Leave Taken

Paid Leave

Unpaid Leave

Remaining Paid Leave

Leave Dates

Each employee gets:

1 day paid leave per salary month.

The first 1 day of leave must NOT reduce salary.

Any additional leave beyond the 1 paid leave day becomes salary-deductible leave.

Example:

Total Leave = 5.5 Days

Paid Leave = 1 Day

Salary Deduction Leave = 4.5 Days

7. LATE / DELAY TRACKING

Automatically identify late attendance based on the configured office start time.

Display:

Number of Late Days

Total Late Minutes

Date-wise Late Records

Average Late Time

Monthly Late Count

Example:

02-Aug-2026 | Login 09:12 AM | Late: 12 Minutes

Staff can see their own late records.

Admin can see all staff late records.

Super Admin can edit/override an attendance exception when required.

8. HALF-DAY TRACKING

Support Half-Day attendance.

Admin/Super Admin can mark:

Full Day

Half Day

Present

Leave

Paid Leave

Unpaid Leave

Absent

Half-day records must automatically affect salary calculation according to the configured rules.

9. SALARY MANAGEMENT

Salary calculation must be based on a fixed 30-day salary calculation cycle.

Example:

Monthly Salary:

₹9,000

Calculation:

₹9,000 ÷ 30 = ₹300 per day

Therefore:

Daily Salary = ₹300

10. PAID LEAVE RULE

Every staff member receives:

1 Day Paid Leave per 30-day salary cycle.

The first 1 leave day will NOT be deducted from salary.

Any leave after the first paid leave day will be treated as unpaid/deductible leave.

11. SALARY CALCULATION EXAMPLE

Employee:

Name: Harshini

Monthly Salary:

₹9,000

Salary Cycle:

30 Days

Daily Salary:

₹9,000 ÷ 30 = ₹300

Total Leave:

5.5 Days

Paid Leave:

1 Day

Deductible Leave:

5.5 - 1 = 4.5 Days

Salary Deduction:

₹300 × 4.5 = ₹1,350

Final Salary:

₹9,000 - ₹1,350 = ₹7,650

Therefore:

Harshini Salary Summary

Monthly Salary: ₹9,000

Salary Days: 30

Daily Salary: ₹300

Total Leave: 5.5 Days

Paid Leave: 1 Day

Deductible Leave: 4.5 Days

Salary Deduction: ₹1,350

Final Salary: ₹7,650

The software must automatically calculate this.

Do NOT require manual calculation.

12. IMPORTANT SALARY VISIBILITY RULE

STAFF

Staff can see:

Attendance

Login

Logout

Working Days

Leave

Paid Leave

Unpaid Leave

Late

Half Day

Attendance summary

But:

STAFF MUST NOT SEE SALARY INFORMATION.

Do not display:

Monthly Salary

Daily Salary

Salary Deduction Amount

Final Salary

Salary Calculation Formula

Salary Calculator

Staff should only see attendance-related information.

13. ADMIN SALARY SYSTEM

Admin can see staff salary information.

For each staff member, Admin should have:

Salary Calculation

Example:

Harshini

Monthly Salary: ₹9,000

30 Days

Daily Salary: ₹300

Leave: 5.5 Days

Paid Leave: 1 Day

Deductible Leave: 4.5 Days

Deduction: ₹1,350

Final Salary: ₹7,650

The calculation should happen automatically in the backend.

Admin should be able to view the calculated salary result.

14. SALARY CALCULATOR — BACKEND

The salary calculation engine must work in the backend.

Whenever attendance or leave data changes:

Automatically recalculate:

Paid Leave

Unpaid Leave

Deductible Leave

Salary Deduction

Final Salary

Do not hard-code the final salary amount.

The system must calculate dynamically.

15. SUPER ADMIN SALARY CALCULATOR

Super Admin must have a dedicated Salary Calculation Settings / Calculator page.

Super Admin must be able to see BOTH:

FRONTEND

The complete calculation logic and result.

AND

BACKEND

The actual salary calculation rules and stored calculation values.

Example:

Monthly Salary ÷ 30 = Daily Salary

Total Leave - Paid Leave = Deductible Leave

Daily Salary × Deductible Leave = Salary Deduction

Monthly Salary - Salary Deduction = Final Salary

16. SALARY RULE SETTINGS

Super Admin can configure:

Salary Cycle Days

Default = 30

Paid Leave Days

Default = 1

Daily Salary Calculation

Leave Deduction Rules

Half-Day Rules

Late Rules

Attendance Rules

Any changes must be reflected automatically in future calculations.

17. INCENTIVE MANAGEMENT

Super Admin must be able to add incentives.

Example:

Employee:

Harshini

Base Salary:

₹9,000

Incentive:

₹500

Final Salary after applicable deductions:

₹7,650 + ₹500 = ₹8,150

Incentive must be configurable.

Super Admin can:

Add Incentive

Edit Incentive

Delete Incentive

Add reason/description

Select employee

Select month

18. EXCEPTION / WAIVER MANAGEMENT

Sometimes management may want to forgive a late/leave deduction.

Super Admin must have an Exception / Waiver option.

Example:

Employee has 2 extra leave days.

Normally salary deduction applies.

Super Admin can mark:

Exception Approved

Then the selected leave can be excluded from salary deduction.

Super Admin should be able to enter:

Employee

Date

Exception Type

Reason

Deduction Waived

Approved By

Date/Time

19. EDIT & DELETE PERMISSION

Only:

SUPER ADMIN

can perform unrestricted:

Edit

Delete

Restore

Exception

Incentive

Salary adjustment

Attendance correction

Leave correction

Admin should NOT have unrestricted deletion rights.

Staff should have NO edit/delete access to attendance records.

20. AUDIT LOG

Every Super Admin modification must create an audit record.

Example:

Harshini Leave Changed

Old Value:

5.5 Days

New Value:

4.5 Days

Modified By:

Super Admin

Date:

10-Aug-2026

Time:

11:05 AM

Also record:

Edit

Delete

Restore

Salary adjustment

Incentive

Exception

21. ADMIN DASHBOARD

Admin dashboard should show:

Today's Overview

Total Staff

Present

Absent

On Leave

Late

Half Day

Currently Logged In

Monthly Overview

Total Working Days

Total Present

Total Leave

Total Late

Total Half Days

Staff-wise Salary Calculation

Admin can click an employee and view their complete attendance and salary information.

22. SUPER ADMIN DASHBOARD

Super Admin dashboard should show:

Total Employees

Present Today

Absent Today

Leave Today

Late Today

Monthly Attendance

Monthly Salary

Salary Deduction

Incentives

Exceptions

Attendance Corrections

User Management

System Settings

Audit Logs

23. STAFF PROFILE

Each staff member should have:

Staff Name

Staff ID

User ID

Joining Date

Designation

Monthly Salary

Attendance History

Leave History

Late History

Login/Logout History

Important:

Monthly Salary must be hidden from Staff portal.

Only Admin and Super Admin can access salary information.

24. USER MANAGEMENT

Super Admin can:

Add Staff

Edit Staff

Delete Staff

Activate Staff

Deactivate Staff

Reset Password

Assign Salary

Assign Designation

Assign Joining Date

Admin can manage staff information according to permitted permissions.

25. SEARCH & FILTER

Add powerful search/filter functionality.

Filters:

Staff Name

Month

Date

Present

Absent

Leave

Paid Leave

Unpaid Leave

Late

Half Day

26. MONTHLY REPORT

Create monthly attendance reports.

Report should contain:

Employee Name

Total Working Days

Present Days

Leave Days

Paid Leave

Unpaid Leave

Late Days

Half Days

Total Working Hours

Salary Deduction

Incentive

Final Salary

Salary columns must be visible ONLY to Admin and Super Admin.

27. DATA SECURITY

Implement strict role-based access control.

STAFF

Only personal attendance information.

ADMIN

All staff attendance + salary results.

SUPER ADMIN

Complete system control + salary rules + edit/delete + exceptions + incentives + audit.

Users must never be able to access another role's restricted pages by manually entering URLs.

Protect all backend APIs with role-based authorization.

28. AUTOMATIC CALCULATION ENGINE

Whenever any of these changes:

Login

Logout

Leave

Paid Leave

Unpaid Leave

Late

Half Day

Exception

Incentive

Salary

The system should automatically recalculate all affected values.

Avoid duplicate calculations.

Use a single centralized salary calculation engine so Frontend and Backend always show the same result.

29. MONTHLY SALARY CYCLE

Default salary calculation:

30 Days

Formula:

Daily Salary = Monthly Salary ÷ 30

Paid Leave = 1 Day

Deductible Leave = Total Leave - Paid Leave

If Total Leave is less than or equal to 1:

Deductible Leave = 0

If Total Leave is greater than 1:

Deductible Leave = Total Leave - 1

Then:

Salary Deduction = Daily Salary × Deductible Leave

Then:

Adjusted Salary = Monthly Salary - Salary Deduction

Then:

Final Salary = Adjusted Salary + Approved Incentives

Any approved exception/waiver must be applied before calculating the final salary.

30. EXAMPLE TEST CASE

Create this test case during development:

Employee:

Harshini

Monthly Salary:

₹9,000

Salary Days:

30

Total Leave:

5.5 Days

Paid Leave:

1 Day

Calculation:

9000 ÷ 30 = ₹300

5.5 - 1 = 4.5

300 × 4.5 = ₹1,350

9000 - 1350 = ₹7,650

Expected Final Salary:

₹7,650

The system must return exactly this result.

31. ERROR PREVENTION

Prevent:

Duplicate attendance

Duplicate login

Duplicate logout

Invalid logout without login

Negative leave

Negative salary

Duplicate salary calculation

Unauthorized salary access

Unauthorized editing

Unauthorized deletion

Show clear user-friendly error messages.

32. RESPONSIVE DESIGN

Software must work properly on:

Desktop

Laptop

Tablet

Mobile

All dashboards and tables should be responsive.

33. DATABASE STRUCTURE

Create proper database tables/collections for:

Users

ID

Name

User ID

Password/hashed password

Role

Status

Attendance

Staff ID

Date

Login Time

Logout Time

Working Hours

Status

Late Minutes

Half Day

Leave

Staff ID

Leave Date

Leave Days

Leave Type

Paid/Unpaid

Approval Status

Salary

Staff ID

Month

Monthly Salary

Salary Days

Daily Salary

Total Leave

Paid Leave

Deductible Leave

Salary Deduction

Incentive

Exception/Waiver

Final Salary

Incentives

Staff ID

Month

Amount

Reason

Created By

Exceptions

Staff ID

Date

Amount/Days

Reason

Approved By

Audit Logs

User

Role

Action

Old Value

New Value

Date

Time

34. IMPORTANT ROLE PERMISSION MATRIX

FeatureStaffAdminSuper AdminLogin/LogoutYESYESYESOwn AttendanceYESYESYESAll Staff AttendanceNOYESYESOwn LeaveYESYESYESAll Staff LeaveNOYESYESLate RecordsOwnAllAllSalary ResultNOYESYESSalary RulesNONOYESSalary Calculator LogicNONOYESIncentiveNONOYESException/WaiverNONOYESEdit AttendanceNOLimitedYESDelete AttendanceNONOYESEdit Salary RulesNONOYESUser ManagementNOLimitedYESAudit LogsNOLimitedYESSystem SettingsNONOYES

35. FINAL REQUIREMENT

Build this as a complete production-ready CCS Attendance & Salary Management System, not merely a UI prototype.

The system must have:

Functional authentication

Role-based access

Staff portal

Admin portal

Super Admin portal

Attendance tracking

Login/logout tracking

Leave management

Paid leave

Unpaid leave

Late tracking

Half-day tracking

Automatic salary calculation

30-day salary calculation

Incentive management

Exception/waiver management

Edit/Delete controls

Audit logs

Monthly reports

Responsive design

Secure backend

Database persistence

Most importantly:

Staff must never see salary information.

Admin can see calculated staff salary results but cannot modify the core salary calculation rules.

Super Admin can see, control, edit, delete and configure the complete salary calculation system from both frontend and backend.

The default salary rule must be:

30 Days → Monthly Salary ÷ 30 → 1 Paid Leave → Remaining Leave Deduction → Incentive/Exception Adjustment → Final Salary.

Use the Bubbly Pink + Bubblegum Pink + Pink Tint + White design consistently across all three portals.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://csc-attendance-software.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1480457f-7534-4f79-9232-8befba277547).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
