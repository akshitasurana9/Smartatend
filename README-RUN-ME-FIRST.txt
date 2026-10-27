# SmartAttend — Dual Biometric Attendance Management System

**Automated Attendance Using Face Recognition**

SmartAttend is a web-based attendance management system designed to simplify student attendance in colleges. It combines a web interface, a Java Spring Boot backend, a MySQL database, and a Python-based face verification service to support automated attendance recording.

The system aims to reduce manual work, minimize attendance errors, and improve the reliability of student attendance records.

---

## 1. Project Overview

Traditional attendance systems require teachers to call student names and manually record attendance. This process consumes classroom time and can lead to errors or proxy attendance.

SmartAttend aims to make attendance management faster and more organized by providing:

- Teacher and student interfaces.
- Student registration and profile management.
- Student photograph storage.
- Face verification using a registered photograph and a live webcam photograph.
- Automatic attendance recording after successful verification.
- Attendance history and record management.
- MySQL-based data storage.
- A configurable dual-biometric approach intended to support face recognition and fingerprint verification.

**Important:** Face verification is implemented through the Python service. Actual fingerprint-reader verification requires compatible hardware, drivers, and SDK integration before that functionality can be considered complete.

## 2. Objectives

1. Automate student attendance recording.
2. Reduce the time required for manual attendance.
3. Verify a student's identity using facial features.
4. Store student and attendance information in a centralized database.
5. Provide teachers with attendance history and management tools.
6. Reduce duplicate attendance records.
7. Provide a foundation for future fingerprint-based verification.

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| Java | Backend application logic |
| Spring Boot | REST APIs and application framework |
| Spring Data JPA / Hibernate | Database persistence where configured |
| JDBC / JdbcTemplate | SQL operations where used |
| MySQL / MariaDB | Student, user, and attendance data |
| HTML5 | Web page structure |
| CSS3 | User interface styling |
| JavaScript | Frontend interactions and API requests |
| Python | Face verification service |
| FastAPI | Python REST API |
| DeepFace | Face comparison |
| FaceNet512 | Facial embedding model |
| OpenCV | Image decoding and face detection |
| NumPy | Image array processing |
| Maven | Java dependency management and application execution |
| Git and GitHub | Version control and source-code hosting |

## 4. System Architecture

```text
                   STUDENTS AND TEACHERS
                            |
                            v
                HTML / CSS / JavaScript
                            |
                            v
                 Java Spring Boot API
                    (Port 8080)
                     /          \
                    /            \
                   v              v
           Python FastAPI       MySQL
           Face Service         Database
           (Port 8000)
                |
                v
         OpenCV Face Detection
                |
                v
         DeepFace / FaceNet512
                |
                v
       Verification Result Returned
                |
                v
        Java Attendance Validation
                |
                v
        Attendance Saved to MySQL
```

The browser communicates with the Java backend. When face verification is required, the Java backend sends the registered and live photographs to the Python service. The Python service returns the verification result. Java then decides whether attendance can be recorded.

The Python service should not independently mark a student present in the database.

## 5. Project Structure

The following is a representative structure. Some filenames may differ in your current project.

```text
SmartAttend_Fixed/
|
|-- pom.xml
|-- mvnw
|-- mvnw.cmd
|-- .gitignore
|
|-- face-service/
|   |-- main.py
|   |-- requirements.txt
|   |-- .venv311/
|
|-- src/
|   |-- main/
|   |   |-- java/
|   |   |   |-- com/smartattend/
|   |   |       |-- controller/
|   |   |       |-- entity/
|   |   |       |-- repository/
|   |   |       |-- service/
|   |   |       |-- SmartattendApplication.java
|   |   |
|   |   |-- resources/
|   |       |-- application.properties
|   |       |-- static/
|   |           |-- index.html
|   |           |-- teacher_login.html
|   |           |-- teacher_dashboard.html
|   |           |-- attendance-history.html
|   |           |-- styledash.css
|   |           |-- js/
|   |               |-- teacher_dash.js
|   |
|   |-- test/
|
|-- README.md
```

**Folder responsibilities**

- `controller/`: Handles incoming HTTP requests.
- `entity/`: Defines Java classes mapped to database tables.
- `repository/`: Provides database access methods.
- `service/`: Contains reusable application logic where implemented.
- `resources/static/`: Contains frontend pages, CSS, and JavaScript.
- `application.properties`: Contains Spring Boot and database configuration.
- `face-service/main.py`: Implements the Python face verification API.
- `pom.xml`: Defines Java dependencies and build configuration.

## 6. Prerequisites

Install the following software before running the application:

1. Java JDK compatible with the project's Maven configuration.
2. Maven, or use the included Maven Wrapper.
3. MySQL Server or a compatible MariaDB installation.
4. Python 3.11, matching the current `.venv311` environment.
5. Visual Studio Code or another suitable editor.
6. Git for source-code management.
7. A webcam for live face capture.

The Python environment also needs compatible versions of FastAPI, Uvicorn, DeepFace, OpenCV, NumPy, and the dependencies required by the selected face model.

## 7. Download the Project

Clone the repository:

```bash
git clone https://github.com/akshitasurana9/Smartatend.git
```

Move into the project folder:

```bash
cd Smartatend
```

If you have already downloaded the project, open the existing project folder in VS Code instead.

Check that the folder containing `pom.xml` is the Java project root. Do not run Maven from a parent directory that does not contain the correct project file.

## 8. Configure the MySQL Database

### Step 1: Start MySQL

Start MySQL or MariaDB using your installed database service or XAMPP, if that is how your local database is configured.

### Step 2: Create the database

Open MySQL Workbench, phpMyAdmin, or the MySQL command-line client and execute:

```sql
CREATE DATABASE IF NOT EXISTS smartattend;
```

Select the database:

```sql
USE smartattend;
```

The application's actual tables are determined by its entity mappings, SQL queries, and database migrations. Do not create duplicate tables manually if they already exist.

### Step 3: Configure Spring Boot

Open:

`src/main/resources/application.properties`

Configure the database connection using the values appropriate for your machine:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/smartattend
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

Set `DB_USERNAME` and `DB_PASSWORD` in your local environment, or use a local-only configuration file excluded from Git. Do not commit real database credentials.

If the application already contains database settings, update those settings rather than adding duplicate properties.

**Database connection checks**

- MySQL is running.
- The database name is `smartattend`.
- The configured username and password are correct.
- Port `3306` matches the actual MySQL server port.
- The database user has the required permissions.

A `Communications link failure` generally indicates that the database server is unreachable or the connection settings are incorrect.

## 9. Start the Java Spring Boot Backend

Open PowerShell in the directory containing `pom.xml`.

### Step 1: Verify Java and Maven

```powershell
java -version
mvn -version
```

### Step 2: Run the application

If Maven is installed:

```powershell
mvn spring-boot:run
```

Or use the Maven Wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

Wait for the successful Spring Boot startup message. The application is expected to use port `8080` unless configured otherwise.

### Step 3: Open the application

Visit:

```text
http://localhost:8080/
```

The actual page displayed depends on the static resources and routing configured in the project.

If port `8080` is already occupied, check whether another copy of SmartAttend is running before starting another instance.

## 10. Set Up the Python Face Verification Service

The Python service is separate from the Java backend. Both must be running for live face verification through the integrated application.

### Step 1: Open a new terminal

Navigate to the face-service folder:

```powershell
cd "C:\Users\Rohit Computer\Desktop\SmartAttend_Fixed_v2\SmartAttend_Fixed\face-service"
```

If your project is stored in a different location, replace the path accordingly.

### Step 2: Start the Python API

If the existing `.venv311` environment is available:

```powershell
.\.venv311\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Keep this terminal open while testing.

If the environment does not exist, create and configure it using Python 3.11 and install the compatible dependencies listed in your `requirements.txt`, if available.

### Step 3: Check the API

Open these URLs in your browser:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

The root and health endpoints should return a service status response. The documentation page provides an interface for testing the API.

If `/health` is not present in the version of `main.py` currently running, use the root endpoint and `/docs` instead.

## 11. How Face Verification Works

The current Python service exposes:

```text
POST /verify-face
```

It accepts two multipart image fields:

- `registered_photo`: The student's registered photograph.
- `live_photo`: The photograph captured during attendance verification.

### Verification process

1. The Java backend identifies the student whose attendance is being requested.
2. It obtains the student's registered photograph using the configured photo-storage mechanism.
3. The live photograph is captured through the browser camera.
4. Java sends both photographs to the Python API.
5. Python checks file types, upload sizes, and image validity.
6. OpenCV decodes the images.
7. DeepFace attempts to detect a face in each image.
8. FaceNet512 generates facial representations and compares the images.
9. The service returns the verification result, distance, threshold, and diagnostic information.
10. Java evaluates the result and any additional attendance rules.
11. Attendance is saved only if all required checks succeed.

### Understanding the verification result

Example:

```json
{
  "verified": false,
  "distance": 0.390841,
  "threshold": 0.3,
  "model": "Facenet512",
  "registered_faces_detected": 1,
  "live_faces_detected": 1,
  "message": "Face did not match."
}
```

In this example, a face was detected in both images, but the comparison did not satisfy the model's verification threshold.

The distance is a model-specific comparison score; a smaller distance generally indicates greater similarity for this configuration. The threshold should be validated using representative genuine and impostor image pairs before production use.

Do not simply increase the threshold to make every verification succeed. That can increase false matches.

## 12. Test the Python API

Open:

```text
http://127.0.0.1:8000/docs
```

1. Expand `POST /verify-face`.
2. Click **Try it out**.
3. Upload a registered photograph.
4. Upload a live photograph.
5. Click **Execute**.
6. Review the HTTP response and the Python terminal output.

Possible outcomes include:

| Result | Meaning |
|---|---|
| `verified: true` | The comparison passed the configured verification rule. |
| `verified: false` | Faces were compared but did not satisfy the threshold. |
| HTTP 400 | Invalid input, unsupported file type, or empty image. |
| HTTP 413 | An uploaded image exceeded the configured size limit. |
| HTTP 422 | Face detection or input processing failed. |
| HTTP 500 | An unexpected internal error occurred. |

Use clear, front-facing photographs with good lighting. A detected face does not automatically mean that the two photographs belong to the same person.

## 13. Attendance Recording

The Java attendance controller is responsible for validating attendance requests and recording attendance in MySQL.

A typical attendance flow is:

1. Receive the student's attendance request.
2. Identify the student and relevant class or session.
3. Validate the live photograph.
4. Call the Python verification service.
5. Reject the request if verification fails.
6. Check applicable attendance rules, such as duplicate records and session availability.
7. Save attendance in the configured database table.
8. Return a success or failure response to the frontend.

The exact API paths, database table names, and session rules depend on the current Java controller and repository implementations.

An unsuccessful face comparison must not create a present attendance record.

## 14. Frontend and Dashboard

The static frontend is served by Spring Boot when configured under `src/main/resources/static/`.

The teacher dashboard is intended to provide access to the attendance workflow and related management features.

Depending on the current implementation, the frontend may include:

- Teacher login.
- Student registration and student records.
- Student photograph management.
- Webcam capture and face verification.
- Attendance management.
- Attendance history.
- Class and session information.
- Dashboard navigation and status messages.

Frontend pages alone do not guarantee that a feature is fully operational. Each feature must be tested against its actual backend endpoint and database operation.

## 15. Database and Student Photograph Storage

Student records, user information, classes, sessions, and attendance are stored according to the configured MySQL schema.

To inspect available tables:

```sql
USE smartattend;
SHOW TABLES;
```

To inspect a particular table:

```sql
DESCRIBE students;
```

Replace `students` with the actual table name if your schema uses a different name.

### Student photographs

The registered photograph may be stored as a file with a path referenced by the student record. Confirm the actual implementation before assuming where the image is stored.

For production:

- Allow only supported image formats.
- Validate file contents and image sizes.
- Enforce one registered photograph per student if required by the application.
- Store files outside publicly accessible directories.
- Back up photographs securely.
- Restrict access to authorized users.

Do not assume that storing a photo path in MySQL also stores the image itself in the database.

## 16. Common Errors and Solutions

### Error: `Communications link failure`

**Possible cause:** MySQL is stopped, the port is incorrect, or connection credentials are invalid.

**Solution:** Start MySQL, verify the port, and check the database connection settings.

### Error: `No plugin found for prefix 'spring-boot'`

**Possible cause:** Maven is running in the wrong folder, or the Spring Boot Maven plugin is not configured correctly.

**Solution:** Navigate to the folder containing the correct `pom.xml` and inspect the plugin configuration.

### Error: `Address already in use`

**Possible cause:** Another application or server instance is using the requested port.

**Solution:** Check whether the existing service is already running. Stop the duplicate instance or configure a different port.

### Error: `Connection refused` for `127.0.0.1:8000`

**Possible cause:** The Python face service is not running or the Java service is configured with the wrong URL.

**Solution:** Start Uvicorn and confirm that the Java backend can reach the Python service.

### Error: `FaceNotDetected`

**Possible cause:** The face is too small, blurry, poorly illuminated, turned away, or not visible in the uploaded image.

**Solution:** Capture a clearer photograph and inspect the registered and live images independently.

Do not disable face detection merely to suppress this error.

### Error: `verified: false`

**Possible cause:** The two faces do not sufficiently match under the configured model and threshold, or image conditions differ significantly.

**Solution:** Confirm that the correct registered photo is being loaded, compare genuine same-person images, and validate the threshold with representative test data.

### Error: `attendanceSaved: false`

**Possible cause:** Face verification failed, attendance validation rejected the request, or the database write failed.

**Solution:** Read the complete backend response and logs. A failed face match should not be bypassed to force attendance.

## 17. Security Considerations

SmartAttend processes biometric information, so security must be considered throughout development and deployment.

- Require authentication and authorization for protected endpoints.
- Hash passwords using a suitable password-hashing algorithm.
- Never commit database passwords, API secrets, or private keys.
- Use HTTPS in production.
- Validate all incoming files and requests.
- Prevent duplicate attendance records using server-side validation and database constraints where appropriate.
- Protect student photographs and attendance history.
- Restrict access to internal services such as the Python verification API.
- Avoid returning internal file paths and full exception traces to public clients.
- Establish an appropriate retention and deletion policy for biometric data.
- Test the system for false matches and false rejections before relying on it for official attendance.
- Use an appropriate liveness-detection mechanism if protection against printed photographs or replayed webcam images is required.

Face matching alone does not prove that a live person is physically present; the current verification flow should not be described as liveness detection unless that capability is implemented and tested.

## 18. Deployment

For online deployment, the application needs a hosted Java service, a hosted Python service, a hosted MySQL database, and secure storage for registered photographs.

A deployment plan is:

1. Verify the Java backend locally.
2. Verify the Python face verification API locally.
3. Confirm end-to-end attendance saving.
4. Push the tested code to GitHub.
5. Deploy the Java Spring Boot application.
6. Deploy the Python service with compatible dependencies and sufficient memory.
7. Provision a hosted MySQL database.
8. Configure environment variables and database access.
9. Configure Java to call the deployed Python service rather than `127.0.0.1`.
10. Configure secure photograph storage.
11. Enable HTTPS and camera permissions.
12. Test login, registration, verification, duplicate prevention, and attendance history.

**Important:** `127.0.0.1` refers to the machine on which the code is running. Once deployed, the Java service must use the private or public service URL appropriate to the hosting environment.

Suitable hosting options can include Railway, Render, or another platform that supports the required runtime, dependencies, storage, and database.

Check current platform pricing and resource limits before choosing a production deployment.

## 19. Fingerprint Integration

The project's dual-biometric goal includes face recognition and fingerprint verification. However, actual fingerprint functionality requires additional implementation unless it already exists in the current codebase.

Typical requirements include:

- A compatible fingerprint reader.
- Manufacturer-provided SDK and drivers.
- A supported Java integration or a local hardware bridge.
- Fingerprint enrollment and template management.
- Secure template storage.
- Matching and error handling.
- A defined verification policy, such as face AND fingerprint or face OR fingerprint.

A standard browser page cannot access every fingerprint reader directly. Hardware and SDK compatibility must be tested before claiming fingerprint support is complete.

## 20. Testing Checklist

Before presenting or deploying the application, verify each applicable item.

- [ ] MySQL starts successfully.
- [ ] Spring Boot starts successfully.
- [ ] Python FastAPI starts successfully.
- [ ] The health endpoint returns the expected status.
- [ ] Student registration saves valid records.
- [ ] Teacher authentication works correctly.
- [ ] Registered photographs are stored and retrieved correctly.
- [ ] Webcam capture produces a valid image.
- [ ] The Python service detects the registered face.
- [ ] The Python service detects the live face.
- [ ] Genuine same-person comparisons are tested.
- [ ] Different-person comparisons are tested.
- [ ] Failed verification does not record attendance.
- [ ] Successful verification records attendance once.
- [ ] Duplicate attendance is rejected.
- [ ] Attendance history shows saved records.
- [ ] Invalid image uploads are rejected.
- [ ] Sensitive files and credentials are excluded from Git.
- [ ] Deployment works over HTTPS.
- [ ] Fingerprint functionality is tested separately if implemented.

## 21. Future Enhancements

Potential improvements include:

- Fingerprint-reader integration.
- Liveness detection.
- Improved face verification and threshold evaluation.
- More detailed attendance reports.
- Exporting attendance records.
- Student attendance summaries.
- Administrative audit logs.
- Role-based permissions.
- Secure cloud photograph storage.
- Automated backups and recovery.
- Monitoring and error reporting.
- Mobile-friendly dashboard improvements.

## 22. Conclusion

SmartAttend is designed to improve college attendance management through a web interface, a Java backend, a MySQL database, and Python-based face verification.

Its face verification service can compare a registered photograph with a live webcam photograph, while the Java backend is responsible for attendance validation and database recording.

Successful end-to-end operation depends on correct configuration, reliable image capture, secure storage, proper verification testing, and integration of any additional biometric hardware.

---

## Author and Project Information

**Project:** SmartAttend — Dual Biometric Attendance Management System

**Project type:** College / Academic Project

**Primary technologies:** Java, Spring Boot, MySQL, Python, FastAPI, DeepFace, OpenCV, HTML, CSS, and JavaScript.

**Source repository:** https://github.com/akshitasurana9/Smartatend

*Before submitting this documentation, verify the actual API paths, database schema, completed features, and fingerprint integration status against the latest source code.*
