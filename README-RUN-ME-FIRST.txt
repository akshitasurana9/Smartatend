SMARTATTEND - FIXED PROJECT
===========================

WHAT WAS FIXED
- Replaced the invalid/unusual Spring Boot dependencies with standard Spring Boot 3.5.6 dependencies.
- Configured Spring Data JPA + MySQL connector.
- Added working REST endpoints for CREATE, READ, UPDATE, DELETE and login.
- Connected signup and login pages to the backend API.
- Added students.html CRUD screen.
- Passwords are stored as BCrypt hashes and are never returned by the API.
- Removed stale build output from the supplied ZIP.

REQUIREMENTS
1. JDK 21 installed (check: java -version).
2. MySQL Server running.
3. Internet connection for Maven to download dependencies the first time.

DATABASE SETUP
Option A: MySQL Workbench - open database.sql and execute it.
Option B: the JDBC URL includes createDatabaseIfNotExist=true and will create the database if your MySQL account has permission.

MYSQL LOGIN SETTINGS
Open src/main/resources/application.properties.
Default username is root and default password is blank.
If your MySQL root account has a password, set it here:
spring.datasource.password=YOUR_MYSQL_PASSWORD
Do not include quotes around the password. Keep your real password private.

RUN ON WINDOWS
1. Extract this folder.
2. Open the folder containing pom.xml in VS Code / IntelliJ.
3. Confirm MySQL is running and the username/password above are correct.
4. In the terminal, run:
   mvnw.cmd spring-boot:run
   If the wrapper is not available, run:
   mvn spring-boot:run
5. Wait for "Started SmartattendApplication" in the terminal.
6. Open:
   http://localhost:8080/
   Signup: http://localhost:8080/signup.html
   Login:  http://localhost:8080/login.html
   CRUD:   http://localhost:8080/students.html

CRUD API ROUTES
GET    /api/students       list all students
GET    /api/students/{id}  get one student
POST   /api/students/register create student
POST   /api/students/login login with email/password
PUT    /api/students/{id}  update student details; password may be blank/omitted to keep old password
DELETE /api/students/{id}  delete student

REGISTER JSON EXAMPLE
{
  "name": "Demo Student",
  "rollNumber": "STU001",
  "email": "demo@example.com",
  "mobile": "9876543210",
  "password": "DemoPass123"
}

IMPORTANT
- Do not open the HTML files by double-clicking them. Use http://localhost:8080 so browser requests reach Spring Boot.
- Face recognition and external fingerprint hardware are not implemented by this ZIP yet; this repair connects the current student signup/login/CRUD flow to MySQL.
- The login page routes to the student records page after a successful login for this college-project demo. This is not a production authentication/session implementation.
- If the server fails to connect to MySQL, check the MySQL service, database name, port 3306, username, and password. Read the first "Caused by" message in the terminal.
