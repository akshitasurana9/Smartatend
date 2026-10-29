# SmartAttend — Dual Biometric Attendance Management System

## Project Description

SmartAttend is a web-based attendance management system designed to make attendance recording easier, faster, and more organised for colleges. It aims to reduce the problems of manual attendance, such as wasted classroom time, proxy attendance, and record-keeping mistakes.

The project uses HTML, CSS, and JavaScript for the frontend, Java Spring Boot for backend application logic, MySQL for data storage, and Python FastAPI with OpenCV and DeepFace for face verification.

The face-verification service compares a student's registered photograph with a live photograph and returns the verification result to the backend. The backend is responsible for checking attendance rules and saving records when the required conditions are satisfied.

## Key Features

- Web-based interface for student and teacher workflows.
- Student and attendance-related record management.
- Face verification using a registered photograph and a live photograph.
- Java Spring Boot backend for application logic and API communication.
- MySQL database for storing application records.
- Python FastAPI service for face comparison.
- Attendance history and reporting features, subject to verification in the current build.

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Java, Spring Boot
- **Database:** MySQL
- **Face Verification:** Python, FastAPI, OpenCV, DeepFace, FaceNet512
- **Build Tool:** Maven

## Project Objective

The main objective of SmartAttend is to simplify attendance management through a digital workflow, reduce manual work, and provide a structured way to manage attendance records.

## Current Development Status

The project includes a Java Spring Boot backend and a Python face-verification service. The complete attendance workflow, database saving, and attendance-history features should be tested before being described as fully functional.

Fingerprint-reader integration is a planned extension unless compatible hardware and its SDK have already been integrated and tested. Face comparison alone does not provide liveness or anti-spoofing verification.

## Future Scope

- Integrate a compatible fingerprint reader and SDK.
- Add liveness detection and anti-spoofing checks.
- Improve attendance reports and export options.
- Strengthen role-based access control and security.
- Test attendance rules and system performance more thoroughly.

## Project Team

- Akshita Surana
- Jaishree

## Repository

GitHub: https://github.com/akshitasurana9/Smartatend
